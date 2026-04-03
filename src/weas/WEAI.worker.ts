/// <reference lib="webworker" />
/**
 * @author hexxone / https://hexx.one
 *
 * @license
 * Copyright (c) 2026 hexxone All rights reserved.
 * Licensed under the GNU GENERAL PUBLIC LICENSE.
 * See LICENSE file in the project root for full license information.
 */

import * as ort from 'onnxruntime-web';
import { BpmCandidate } from './Bea';
import { SpectrumTensorBuffer } from './SpectrumTensorBuffer';
import { WEAIBackendKind, WEAI_MANIFEST_URL, WEAI_MIN_BPM, WEAIModelManifest, WEAIPrediction, WEAIWorkerEvent, WEAIWorkerMessage } from './WEAITypes';

declare const self: DedicatedWorkerGlobalScope;

const DEFAULT_FRAME_STRIDE = 1;
const MAX_FRAME_STRIDE = 2;
const STRIDE_UPGRADE_RATIO = 1.15;
const STRIDE_DOWNGRADE_RATIO = 0.72;
const TIMING_HISTORY_SIZE = 6;

let manifest: WEAIModelManifest | null = null;
let session: ort.InferenceSession | null = null;
let backend: Extract<WEAIBackendKind, 'ai-webgpu' | 'ai-wasm'> | null = null;
let inputName = '';
let beatOutputName = '';
let tempoOutputName = '';
let frameStride = DEFAULT_FRAME_STRIDE;
let frameCounter = 0;
let busy = false;
let ready = false;
let unavailable = false;
let timingHistory: number[] = [];

const buffer = new SpectrumTensorBuffer();

function post(event: WEAIWorkerEvent): void {
    self.postMessage(event);
}

function sigmoid(value: number): number {
    if (!Number.isFinite(value)) {
        return 0;
    }

    return 1 / (1 + Math.exp(-value));
}

function softmaxTopK(logits: number[], bpmMin: number, limit = 3): BpmCandidate[] {
    if (!logits.length) {
        return [];
    }

    const maxLogit = logits.reduce((max, value) => {
        return Math.max(max, value);
    }, -Infinity);
    const exps = logits.map((value) => {
        return Math.exp(value - maxLogit);
    });
    const sum = exps.reduce((total, value) => {
        return total + value;
    }, 0) || 1;

    return exps
        .map((value, index) => {
            return {
                value: bpmMin + index,
                weight: value / sum
            };
        })
        .sort((left, right) => {
            return right.weight - left.weight;
        })
        .slice(0, limit);
}

function getResolvedUrl(baseUrl: string, target: string): string {
    return new URL(target, baseUrl).toString();
}

function configureWasmPaths(wasmBaseUrl: string): void {
    ort.env.wasm.proxy = false;
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.wasmPaths = {
        mjs: getResolvedUrl(wasmBaseUrl, 'ort-wasm-simd-threaded.jsep.mjs'),
        wasm: getResolvedUrl(wasmBaseUrl, 'ort-wasm-simd-threaded.jsep.wasm')
    };
}

async function createSessionWithProviders(
    modelUrl: string
): Promise<{
    backend: Extract<WEAIBackendKind, 'ai-webgpu' | 'ai-wasm'>;
    session: ort.InferenceSession;
}> {
    try {
        const webGpuSession = await ort.InferenceSession.create(modelUrl, {
            executionProviders: [
                {
                    name: 'webgpu',
                    preferredLayout: 'NCHW'
                }
            ],
            graphOptimizationLevel: 'all'
        });

        return {
            backend: 'ai-webgpu',
            session: webGpuSession
        };
    } catch {
        const wasmSession = await ort.InferenceSession.create(modelUrl, {
            executionProviders: ['wasm'],
            graphOptimizationLevel: 'all'
        });

        return {
            backend: 'ai-wasm',
            session: wasmSession
        };
    }
}

async function initialize(payload: {
    manifestUrl?: string;
    wasmBaseUrl?: string;
}) {
    const manifestUrl = payload.manifestUrl || WEAI_MANIFEST_URL;
    const wasmBaseUrl = payload.wasmBaseUrl || 'ort/';

    try {
        configureWasmPaths(wasmBaseUrl);

        const response = await fetch(manifestUrl);

        if (!response.ok) {
            unavailable = true;
            post({
                type: 'unavailable',
                payload: {
                    reason: `AI manifest request failed (${response.status})`
                }
            });

            return;
        }

        manifest = await response.json();

        if (!manifest.ready || !manifest.modelPath) {
            unavailable = true;
            post({
                type: 'unavailable',
                payload: {
                    reason: 'AI model manifest is present but no trained model is ready yet.',
                    note: manifest.note
                }
            });

            return;
        }

        const modelUrl = getResolvedUrl(manifestUrl, manifest.modelPath);
        const sessionInfo = await createSessionWithProviders(modelUrl);
        const { backend: nextBackend, session: nextSession } = sessionInfo;

        backend = nextBackend;
        session = nextSession;
        inputName = session.inputNames[0];
        beatOutputName = manifest.beatOutputName || session.outputNames[0];
        tempoOutputName = manifest.tempoOutputName || session.outputNames[1];
        ready = true;
        unavailable = false;
        frameStride = Math.max(
            DEFAULT_FRAME_STRIDE,
            Math.min(MAX_FRAME_STRIDE, manifest.stride || DEFAULT_FRAME_STRIDE)
        );

        post({
            type: 'ready',
            payload: {
                backend,
                frameStride,
                note: manifest.note
            }
        });
    } catch (error) {
        unavailable = true;
        post({
            type: 'error',
            payload: {
                reason: error instanceof Error ? error.message : String(error),
                fatal: true
            }
        });
    }
}

function getOutputData(
    outputs: Record<string, ort.Tensor>,
    preferredName: string,
    fallbackIndex: number
): number[] {
    const tensor = outputs[preferredName] || outputs[Object.keys(outputs)[fallbackIndex]];

    if (!tensor || !('data' in tensor)) {
        return [];
    }

    return Array.from(tensor.data as ArrayLike<number>);
}

function updateStride(inferenceMs: number): void {
    timingHistory.push(inferenceMs);

    while (timingHistory.length > TIMING_HISTORY_SIZE) {
        timingHistory.shift();
    }

    const average = timingHistory.reduce((sum, value) => {
        return sum + value;
    }, 0) / timingHistory.length;
    const frameBudgetMs = 1000 / (manifest?.frameRate || 30);

    if (average > frameBudgetMs * STRIDE_UPGRADE_RATIO) {
        frameStride = MAX_FRAME_STRIDE;
    } else if (average < frameBudgetMs * STRIDE_DOWNGRADE_RATIO) {
        frameStride = DEFAULT_FRAME_STRIDE;
    }
}

async function maybeRunInference(time: number): Promise<void> {
    if (!ready || !session || !manifest || busy || !buffer.hasFullContext()) {
        return;
    }
    if (frameCounter % frameStride !== 0) {
        return;
    }

    busy = true;

    try {
        const tensor = new ort.Tensor(
            'float32',
            buffer.snapshot(),
            manifest.inputShape
        );
        const start = performance.now();
        const outputs = await session.run({
            [inputName]: tensor
        });
        const inferenceMs = performance.now() - start;
        const beatLogits = getOutputData(outputs, beatOutputName, 0);
        const tempoLogits = getOutputData(outputs, tempoOutputName, 1);
        const bpm = softmaxTopK(
            tempoLogits,
            manifest.bpmMin || WEAI_MIN_BPM,
            3
        );
        const beatActivation = sigmoid(
            beatLogits.length ? beatLogits[beatLogits.length - 1] : 0
        );
        const primary = bpm[0];
        const modelConfidence = primary
            ? Math.max(
                0,
                Math.min(1, primary.weight * 0.72 + beatActivation * 0.28)
            )
            : 0;

        updateStride(inferenceMs);

        const prediction: WEAIPrediction = {
            time,
            bpm,
            beatActivation,
            modelConfidence,
            inferenceMs,
            frameStride,
            backend
        };

        post({
            type: 'prediction',
            payload: prediction
        });
    } catch (error) {
        post({
            type: 'error',
            payload: {
                reason: error instanceof Error ? error.message : String(error)
            }
        });
    } finally {
        busy = false;
    }
}

self.onmessage = (event: MessageEvent<WEAIWorkerMessage>) => {
    const message = event.data;

    switch (message.type) {
        case 'init':
            void initialize(message.payload);
            break;
        case 'frame': {
            if (unavailable) {
                return;
            }

            const frame = new Float32Array(message.payload.data);

            buffer.pushFrame(frame);
            frameCounter++;
            void maybeRunInference(message.payload.time);
            break;
        }
        case 'reset':
            buffer.reset();
            frameCounter = 0;
            timingHistory = [];
            frameStride = manifest?.stride || DEFAULT_FRAME_STRIDE;
            busy = false;
            break;
        case 'dispose':
            self.close();
            break;
        default:
            break;
    }
};

export {};
