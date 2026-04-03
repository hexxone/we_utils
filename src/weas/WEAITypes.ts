/**
 * @author hexxone / https://hexx.one
 *
 * @license
 * Copyright (c) 2026 hexxone All rights reserved.
 * Licensed under the GNU GENERAL PUBLIC LICENSE.
 * See LICENSE file in the project root for full license information.
 */

import { BpmCandidate } from './Bea';

export const WEAI_MANIFEST_URL = 'models/weas-spectrum-ai/manifest.json';
export const WEAI_WASM_BASE_URL = 'ort/';
export const WEAI_TENSOR_CHANNELS = 6;
export const WEAI_TENSOR_FRAMES = 192;
export const WEAI_TENSOR_BINS = 64;
export const WEAI_TARGET_FRAME_RATE = 30;
export const WEAI_MIN_BPM = 55;
export const WEAI_MAX_BPM = 220;

export type WEAIBackendKind =
    | 'heuristic'
    | 'ai-webgpu'
    | 'ai-wasm'
    | 'fallback-edm';

export type WEAIModelManifest = {
    version: number;
    ready: boolean;
    modelPath?: string;
    inputShape: number[];
    frameRate: number;
    bpmMin: number;
    bpmMax: number;
    beatOutputName?: string;
    tempoOutputName?: string;
    stride?: number;
    normalization?: {
        inputScale?: number;
        deltaScale?: number;
        salientScale?: number;
    };
    note?: string;
};

export type WEAIPrediction = {
    time: number;
    bpm: BpmCandidate[];
    beatActivation: number;
    modelConfidence: number;
    inferenceMs: number;
    frameStride: number;
    backend: Extract<WEAIBackendKind, 'ai-webgpu' | 'ai-wasm'>;
};

export type WEAIWorkerInitMessage = {
    type: 'init';
    payload: {
        manifestUrl: string;
        wasmBaseUrl: string;
    };
};

export type WEAIWorkerFrameMessage = {
    type: 'frame';
    payload: {
        time: number;
        data: ArrayBuffer;
    };
};

export type WEAIWorkerResetMessage = {
    type: 'reset';
};

export type WEAIWorkerDisposeMessage = {
    type: 'dispose';
};

export type WEAIWorkerMessage =
    | WEAIWorkerInitMessage
    | WEAIWorkerFrameMessage
    | WEAIWorkerResetMessage
    | WEAIWorkerDisposeMessage;

export type WEAIWorkerReadyEvent = {
    type: 'ready';
    payload: {
        backend: Extract<WEAIBackendKind, 'ai-webgpu' | 'ai-wasm'>;
        frameStride: number;
        note?: string;
    };
};

export type WEAIWorkerUnavailableEvent = {
    type: 'unavailable';
    payload: {
        reason: string;
        note?: string;
    };
};

export type WEAIWorkerErrorEvent = {
    type: 'error';
    payload: {
        reason: string;
        fatal?: boolean;
    };
};

export type WEAIWorkerPredictionEvent = {
    type: 'prediction';
    payload: WEAIPrediction;
};

export type WEAIWorkerEvent =
    | WEAIWorkerReadyEvent
    | WEAIWorkerUnavailableEvent
    | WEAIWorkerErrorEvent
    | WEAIWorkerPredictionEvent;
