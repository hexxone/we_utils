/**
 * @author hexxone / https://hexx.one
 *
 * @license
 * Copyright (c) 2026 hexxone All rights reserved.
 * Licensed under the GNU GENERAL PUBLIC LICENSE.
 * See LICENSE file in the project root for full license information.
 */

import WEAIWorker from 'worker-loader!./WEAI.worker';
import { Smallog } from '../Smallog';
import { BeatAnalysis, BeaTs, TempoAnalyzerMode, TempoAnalyzerModeValue } from './Bea';
import { BeatClockTracker } from './BeatClock';
import { WEAIPrediction, WEAI_MANIFEST_URL, WEAI_WASM_BASE_URL, WEAIWorkerEvent } from './WEAITypes';

const LOGHEAD = '[WEAI] ';
const AI_STALE_SECONDS = 2.5;

export class WEAITempoAnalyzer {

    private readonly heuristic = new BeaTs(TempoAnalyzerMode.EDM);
    private readonly beatClock = new BeatClockTracker();
    private worker: Worker | null = null;
    private mode: TempoAnalyzerModeValue = TempoAnalyzerMode.General;
    private initialized = false;
    private available = false;
    private fatalError = false;
    private lastPrediction: WEAIPrediction | null = null;
    private lastPredictionTime = 0;
    private lastBeatActivationTime = 0;
    private lastUnavailableReason = '';
    private backendLabel: BeatAnalysis['analyzerBackend'] = 'heuristic';
    private aiFrameStride = 1;

    constructor(mode: TempoAnalyzerModeValue = TempoAnalyzerMode.General) {
        this.setMode(mode);
    }

    public setMode(mode: TempoAnalyzerModeValue): void {
        this.mode = mode;

        if (mode === TempoAnalyzerMode.AI) {
            this.ensureWorker();
            this.heuristic.setMode(TempoAnalyzerMode.EDM);

            return;
        }

        this.heuristic.setMode(mode);
        this.beatClock.reset();

        if (this.worker) {
            this.worker.postMessage({
                type: 'reset'
            });
        }
    }

    public process(time: number, data: ArrayLike<number>): BeatAnalysis {
        switch (this.mode) {
            case TempoAnalyzerMode.Off:
                this.heuristic.setMode(TempoAnalyzerMode.Off);

                return {
                    bpm: [],
                    analyzerMode: TempoAnalyzerMode.Off,
                    analyzerBackend: 'heuristic'
                };
            case TempoAnalyzerMode.General:
            case TempoAnalyzerMode.EDM: {
                const result = this.heuristic.process(time, data);

                return {
                    ...result,
                    analyzerBackend: 'heuristic'
                };
            }
            case TempoAnalyzerMode.AI:
                return this.processAI(time, data);
            default:
                return this.heuristic.process(time, data);
        }
    }

    private processAI(time: number, data: ArrayLike<number>): BeatAnalysis {
        this.ensureWorker();
        this.pushFrame(time, data);

        if (
            this.available
            && this.lastPrediction
            && time - this.lastPredictionTime < AI_STALE_SECONDS
        ) {
            return this.buildAiAnalysis(time);
        }

        return this.buildFallbackAnalysis(time, data);
    }

    private buildAiAnalysis(time: number): BeatAnalysis {
        const prediction = this.lastPrediction as Extract<
            WEAIWorkerEvent,
            { type: 'prediction' }
        >['payload'];
        const primary = prediction.bpm[0];
        const useFreshActivation = prediction.time > this.lastBeatActivationTime;
        const beatActivation = useFreshActivation ? prediction.beatActivation : 0;

        if (useFreshActivation) {
            this.lastBeatActivationTime = prediction.time;
        }

        const beatClock = primary
            ? this.beatClock.update(
                time,
                primary.value,
                primary.weight,
                beatActivation
            )
            : undefined;

        return {
            bpm: prediction.bpm,
            peakActivation: prediction.beatActivation,
            phaseLock: prediction.modelConfidence,
            ...(beatClock || {}),
            analyzerMode: TempoAnalyzerMode.AI,
            analyzerBackend: this.backendLabel,
            aiReady: true,
            aiInferenceMs: prediction.inferenceMs,
            aiModelConfidence: prediction.modelConfidence,
            aiFrameStride: prediction.frameStride
        };
    }

    private buildFallbackAnalysis(
        time: number,
        data: ArrayLike<number>
    ): BeatAnalysis {
        this.heuristic.setMode(TempoAnalyzerMode.EDM);
        const fallback = this.heuristic.process(time, data);

        return {
            ...fallback,
            analyzerMode: TempoAnalyzerMode.AI,
            analyzerBackend: 'fallback-edm',
            aiReady: false,
            aiInferenceMs: this.lastPrediction?.inferenceMs,
            aiModelConfidence: this.lastPrediction?.modelConfidence,
            aiFrameStride: this.aiFrameStride
        };
    }

    private ensureWorker(): void {
        if (this.worker || this.fatalError) {
            return;
        }

        this.worker = new WEAIWorker();
        this.worker.onmessage = (event: MessageEvent<WEAIWorkerEvent>) => {
            this.handleWorkerEvent(event.data);
        };
        this.worker.onerror = (event) => {
            this.available = false;
            this.fatalError = true;
            this.backendLabel = 'fallback-edm';
            this.lastUnavailableReason = event.message || 'AI worker crashed';
            Smallog.error(this.lastUnavailableReason, LOGHEAD);
        };
        this.worker.postMessage({
            type: 'init',
            payload: {
                manifestUrl: WEAI_MANIFEST_URL,
                wasmBaseUrl: WEAI_WASM_BASE_URL
            }
        });
        this.initialized = true;
    }

    private handleWorkerEvent(event: WEAIWorkerEvent): void {
        switch (event.type) {
            case 'ready':
                this.available = true;
                this.backendLabel = event.payload.backend;
                this.aiFrameStride = event.payload.frameStride;
                Smallog.info(
                    `AI analyzer ready via ${event.payload.backend}.`,
                    LOGHEAD
                );
                break;
            case 'prediction':
                this.available = true;
                this.backendLabel = event.payload.backend;
                this.lastPrediction = event.payload;
                this.lastPredictionTime = event.payload.time;
                this.aiFrameStride = event.payload.frameStride;
                break;
            case 'unavailable':
                this.available = false;
                this.backendLabel = 'fallback-edm';
                this.lastUnavailableReason = event.payload.reason;
                Smallog.warn(event.payload.reason, LOGHEAD);
                break;
            case 'error':
                this.available = false;
                this.backendLabel = 'fallback-edm';
                this.lastUnavailableReason = event.payload.reason;
                this.fatalError = Boolean(event.payload.fatal);
                Smallog.warn(event.payload.reason, LOGHEAD);
                break;
            default:
                break;
        }
    }

    private pushFrame(time: number, data: ArrayLike<number>): void {
        if (!this.worker || !this.initialized) {
            return;
        }

        const frame = new Float32Array(data.length);

        for (let index = 0; index < data.length; index++) {
            frame[index] = Number.isFinite(data[index]) ? data[index] : 0;
        }

        this.worker.postMessage(
            {
                type: 'frame',
                payload: {
                    time,
                    data: frame.buffer
                }
            },
            [frame.buffer]
        );
    }

}
