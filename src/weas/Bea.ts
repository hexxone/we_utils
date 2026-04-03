/**
 * @author hexxone / https://hexx.one
 *
 * @license
 * Copyright (c) 2026 hexxone All rights reserved.
 * Licensed under the GNU GENERAL PUBLIC LICENSE.
 * See LICENSE file in the project root for full license information.
 */

export const TempoAnalyzerMode = {
    Off: 0,
    General: 1,
    EDM: 2,
    AI: 3
} as const;

export type TempoAnalyzerModeValue =
    typeof TempoAnalyzerMode[keyof typeof TempoAnalyzerMode];

export type BpmCandidate = {
    value: number;
    weight: number;
};

export type BeatAnalysis = {
    bpm: BpmCandidate[];
    peakActivation?: number;
    phaseLock?: number;
    beatPhase?: number;
    isBeat?: boolean;
    beatConfidence?: number;
    secondsSinceLastBeat?: number;
    secondsToNextBeat?: number;
    beatInterval?: number;
    lastBeatTime?: number;
    nextBeatTime?: number;
    analyzerMode?: TempoAnalyzerModeValue;
    analyzerBackend?: 'heuristic' | 'ai-webgpu' | 'ai-wasm' | 'fallback-edm';
    aiReady?: boolean;
    aiInferenceMs?: number;
    aiModelConfidence?: number;
    aiFrameStride?: number;
    primaryPulseSource?: string;
    tempoFamily?: string;
    transientCorroboration?: boolean;
    switchConfidence?: number;
};

type PulseSourceName =
    | 'subBassPulse'
    | 'bassBodyPulse'
    | 'kickFingerprintPulse'
    | 'harmonicPulse'
    | 'transientPulse'
    | 'highSalientPulse'
    | 'fullbandFlux';

type PulseSourceRole = 'bass' | 'harmonic' | 'transient' | 'full';

type PulseSourceConfig = {
    name: PulseSourceName;
    role: PulseSourceRole;
    start: number;
    end: number;
    threshold: number;
    refractorySeconds: number;
    generalPulseWeight: number;
    edmPulseWeight: number;
    generalCorrWeight: number;
    edmCorrWeight: number;
};

type PulseEvent = {
    time: number;
    strength: number;
};

type BeatActivationFrame = {
    value: number;
    peak: number;
    kick: number;
    harmonic: number;
    transient: number;
};

type BeatActivationSample = BeatActivationFrame & {
    time: number;
};

type BeatPlacementCandidate = BeatActivationSample & {
    score: number;
};

type PulseSourceState = {
    config: PulseSourceConfig;
    baseline: number;
    deviation: number;
    previousValue: number;
    olderValue: number;
    history: number[];
    pulses: PulseEvent[];
    lastPulseTime: number;
};

type TempoCandidate = {
    value: number;
    score: number;
    bassSupport: number;
    harmonicSupport: number;
    transientSupport: number;
    fullSupport: number;
    pulseSupport: number;
    subBassPulseSupport: number;
    bassBodyPulseSupport: number;
    kickFingerprintPulseSupport: number;
    harmonicPulseSupport: number;
    transientPulseSupport: number;
    highSalientPulseSupport: number;
    fullbandFluxSupport: number;
    family: string;
    transientCorroboration: boolean;
};

const WEAS_STEREO_BINS = 64;
const WEAS_SPECTRUM_BINS = WEAS_STEREO_BINS * 2;
const DEFAULT_FRAME_RATE = 30;
const MIN_BPM = 55;
const MAX_BPM = 220;
const BPM_FAMILY_FLOOR = 70;
const BPM_FAMILY_CEIL = 220;
const HISTORY_SECONDS = 8;
const MIN_ANALYSIS_SECONDS = 3;
const SILENCE_HOLD_SECONDS = 2.5;
const BPM_PRIMARY_LOCK_THRESHOLD = 0.5;
const BPM_PRIMARY_SUSTAIN_THRESHOLD = 0.3;
const FAST_TEMPO_FLOOR = 100;
const EDM_FAST_TEMPO_FLOOR = 120;
const TEMPO_LOCK_DISTANCE = 0.08;
const TEMPO_SWITCH_DRIFT_THRESHOLD = 0.16;
const TEMPO_SWITCH_CONFIRM_SECONDS = 3.2;
const TEMPO_SWITCH_FORCE_SECONDS = 5.8;
const TEMPO_SWITCH_HARD_RESET_DRIFT = 0.38;
const TEMPO_CORRELATION_TOLERANCE = 0.03;
const TRACK_PROFILE_SMOOTHING = 0.035;
const TRACK_PROFILE_SWITCH_THRESHOLD = 0.28;
const TRACK_PROFILE_HARD_SWITCH_THRESHOLD = 0.42;
const TEMPO_SWITCH_EVIDENCE_DECAY = 0.42;
const TEMPO_SWITCH_MIN_COMPETITIVE_WEIGHT = 0.82;
const BEAT_ANCHOR_ONSET_THRESHOLD = 0.8;
const BEAT_SNAP_WINDOW_RATIO = 0.18;
const BEAT_SNAP_WINDOW_MIN = 0.04;
const BEAT_SNAP_WINDOW_MAX = 0.12;
const BEAT_REANCHOR_WINDOW_RATIO = 0.35;
const BEAT_REANCHOR_WINDOW_MIN = 0.09;
const BEAT_REANCHOR_WINDOW_MAX = 0.2;
const PHASE_HISTOGRAM_BINS = 24;
const PHASE_HISTOGRAM_DECAY_PER_SECOND = 0.9;
const PHASE_LOCK_MIN_WEIGHT = 0.12;
const PHASE_LOCK_MIN_STRENGTH = 0.18;
const PHASE_LOCK_MAX_CORRECTION_RATIO = 0.18;
const BEAT_GRID_NUDGE_RATIO = 0.16;
const BEAT_GRID_REANCHOR_CONFIDENCE = 0.26;
const BEAT_INTERVAL_REFINE_RATIO = 0.12;
const BEAT_INTERVAL_REFINE_MAX_RATIO = 0.035;
const BEAT_GRID_TEMPO_BLEND_CONFIDENCE = 0.42;

const PULSE_SOURCES: PulseSourceConfig[] = [
    {
        name: 'subBassPulse',
        role: 'bass',
        start: 0,
        end: 3,
        threshold: 1.35,
        refractorySeconds: 0.12,
        generalPulseWeight: 1.0,
        edmPulseWeight: 1.2,
        generalCorrWeight: 0.45,
        edmCorrWeight: 0.55
    },
    {
        name: 'bassBodyPulse',
        role: 'bass',
        start: 0,
        end: 8,
        threshold: 1.05,
        refractorySeconds: 0.11,
        generalPulseWeight: 1.25,
        edmPulseWeight: 1.6,
        generalCorrWeight: 0.65,
        edmCorrWeight: 0.85
    },
    {
        name: 'kickFingerprintPulse',
        role: 'bass',
        start: 0,
        end: 30,
        threshold: 1.02,
        refractorySeconds: 0.095,
        generalPulseWeight: 1.15,
        edmPulseWeight: 1.75,
        generalCorrWeight: 0.55,
        edmCorrWeight: 0.92
    },
    {
        name: 'harmonicPulse',
        role: 'harmonic',
        start: 4,
        end: 18,
        threshold: 0.92,
        refractorySeconds: 0.1,
        generalPulseWeight: 1.05,
        edmPulseWeight: 1.35,
        generalCorrWeight: 0.6,
        edmCorrWeight: 0.8
    },
    {
        name: 'transientPulse',
        role: 'transient',
        start: 18,
        end: 42,
        threshold: 1.05,
        refractorySeconds: 0.09,
        generalPulseWeight: 0.65,
        edmPulseWeight: 0.85,
        generalCorrWeight: 0.45,
        edmCorrWeight: 0.55
    },
    {
        name: 'highSalientPulse',
        role: 'transient',
        start: 22,
        end: 50,
        threshold: 1.12,
        refractorySeconds: 0.085,
        generalPulseWeight: 0.35,
        edmPulseWeight: 0.7,
        generalCorrWeight: 0.18,
        edmCorrWeight: 0.42
    },
    {
        name: 'fullbandFlux',
        role: 'full',
        start: 0,
        end: 63,
        threshold: 1.15,
        refractorySeconds: 0.1,
        generalPulseWeight: 0.45,
        edmPulseWeight: 0.25,
        generalCorrWeight: 0.5,
        edmCorrWeight: 0.2
    }
];

export class BeaTs {

    private mode: TempoAnalyzerModeValue = TempoAnalyzerMode.General;
    private monoSpectrum = new Float64Array(WEAS_STEREO_BINS);
    private previousSpectrum = new Float64Array(WEAS_STEREO_BINS);
    private smoothedSpectrum = new Float64Array(WEAS_STEREO_BINS);
    private sourceStates: PulseSourceState[] = PULSE_SOURCES.map((config) => {
        return {
            config,
            baseline: 0,
            deviation: 0.02,
            previousValue: 0,
            olderValue: 0,
            history: [],
            pulses: [],
            lastPulseTime: -Infinity
        };
    });
    private lastTime = 0;
    private fps = DEFAULT_FRAME_RATE;
    private stableBpm = 0;
    private stableWeight = 0;
    private candidateTempo = 0;
    private candidateHoldSeconds = 0;
    private switchConfidence = 0;
    private beatInterval = 0;
    private lastBeatTime = 0;
    private nextBeatTime = 0;
    private beatConfidence = 0;
    private openLoopBeats = 0;
    private beatActivations: BeatActivationSample[] = [];
    private olderBeatFrame?: BeatActivationSample;
    private previousBeatFrame?: BeatActivationSample;
    private phaseHistogram = new Float64Array(PHASE_HISTOGRAM_BINS);
    private dominantActivationPhase = 0;
    private phaseLockStrength = 0;
    private lastPrimaryPulseSource = 'n/a';
    private lastTempoFamily = 'n/a';
    private lastTransientCorroboration = false;
    private profileShift = 0;
    private silentSeconds = 0;
    private autoReset = true;

    constructor(
        mode: TempoAnalyzerModeValue = TempoAnalyzerMode.General,
        autoReset = true
    ) {
        this.mode = mode;
        this.autoReset = autoReset;
    }

    public setMode(mode: TempoAnalyzerModeValue): void {
        if (this.mode === mode) {
            return;
        }

        this.mode = mode;
        this.resetState();
    }

    private resetState(): void {
        this.previousSpectrum.fill(0);
        this.smoothedSpectrum.fill(0);
        this.lastTime = 0;
        this.fps = DEFAULT_FRAME_RATE;
        this.stableBpm = 0;
        this.stableWeight = 0;
        this.candidateTempo = 0;
        this.candidateHoldSeconds = 0;
        this.switchConfidence = 0;
        this.silentSeconds = 0;
        this.lastPrimaryPulseSource = 'n/a';
        this.lastTempoFamily = 'n/a';
        this.lastTransientCorroboration = false;
        this.profileShift = 0;

        this.sourceStates = this.sourceStates.map((state) => {
            return {
                ...state,
                baseline: 0,
                deviation: 0.02,
                previousValue: 0,
                olderValue: 0,
                history: [],
                pulses: [],
                lastPulseTime: -Infinity
            };
        });

        this.clearBeatClock();
    }

    private clearBeatClock(): void {
        this.beatInterval = 0;
        this.lastBeatTime = 0;
        this.nextBeatTime = 0;
        this.beatConfidence = 0;
        this.openLoopBeats = 0;
        this.beatActivations = [];
        this.olderBeatFrame = undefined;
        this.previousBeatFrame = undefined;
        this.phaseHistogram.fill(0);
        this.dominantActivationPhase = 0;
        this.phaseLockStrength = 0;
    }

    private sanitizeSample(value: number): number {
        if (!Number.isFinite(value) || value <= 0) {
            return 0;
        }

        return Math.min(value, 1.5);
    }

    private clampBpmRange(value: number): number {
        let bpm = value;

        while (bpm < BPM_FAMILY_FLOOR) {
            bpm *= 2;
        }
        while (bpm > BPM_FAMILY_CEIL) {
            bpm /= 2;
        }

        return bpm;
    }

    private getModePulseWeight(config: PulseSourceConfig): number {
        return this.mode === TempoAnalyzerMode.EDM
            ? config.edmPulseWeight
            : config.generalPulseWeight;
    }

    private getModeCorrelationWeight(config: PulseSourceConfig): number {
        return this.mode === TempoAnalyzerMode.EDM
            ? config.edmCorrWeight
            : config.generalCorrWeight;
    }

    private getSourceBinWeight(name: PulseSourceName, index: number): number {
        switch (name) {
            case 'subBassPulse':
                return 1.5 - Math.min(1, index / 6) * 0.65;
            case 'bassBodyPulse':
                return index < 3 ? 1.35 : index < 6 ? 1.15 : 0.85;
            case 'kickFingerprintPulse':
                return index < 4 ? 1.35 : index < 10 ? 1.1 : index < 18 ? 0.85 : 0.6;
            case 'harmonicPulse':
                return index < 8 ? 0.8 : index < 13 ? 1.3 : 0.95;
            case 'transientPulse':
                return index < 24 ? 0.85 : index < 34 ? 1.2 : 0.95;
            case 'highSalientPulse':
                return index < 26 ? 0.75 : index < 38 ? 1.25 : 1.05;
            case 'fullbandFlux':
            default:
                return Math.max(0.2, 1.15 - index / WEAS_STEREO_BINS);
        }
    }

    private extractMonoSpectrum(data: ArrayLike<number>): number {
        let energy = 0;

        for (let i = 0; i < WEAS_STEREO_BINS; i++) {
            const left = this.sanitizeSample(data[i]);
            const right = this.sanitizeSample(data[WEAS_STEREO_BINS + i]);
            const mono = (left + right) * 0.5;

            this.monoSpectrum[i] = Math.log1p(mono * 8);
            energy += mono;
        }

        return energy / WEAS_STEREO_BINS;
    }

    private updateTrackProfileShift(): number {
        let diff = 0;
        let energy = 0;

        for (let i = 0; i < WEAS_STEREO_BINS; i++) {
            const current = this.monoSpectrum[i];
            const smoothed = this.smoothedSpectrum[i];

            diff += Math.abs(current - smoothed);
            energy += current;
            this.smoothedSpectrum[i] += (current - smoothed) * TRACK_PROFILE_SMOOTHING;
        }

        this.profileShift = energy > 0
            ? diff / Math.max(energy, 0.001)
            : 0;

        return this.profileShift;
    }

    private measureSourceRaw(state: PulseSourceState): number {
        const { config } = state;

        if (config.name === 'kickFingerprintPulse') {
            return this.measureKickFingerprintRaw(state);
        }
        if (config.name === 'highSalientPulse') {
            return this.measureHighSalientRaw(state);
        }

        let flux = 0;
        let totalWeight = 0;

        for (let i = config.start; i <= config.end; i++) {
            const diff = this.monoSpectrum[i] - this.previousSpectrum[i];
            const positiveDiff = diff > 0 ? diff : 0;
            const current = this.monoSpectrum[i];
            const weight = this.getSourceBinWeight(config.name, i);
            let contribution = positiveDiff * weight;

            if (config.role === 'bass') {
                contribution += current * 0.12 * weight;
            } else if (config.role === 'harmonic') {
                contribution += current * 0.08 * weight;
            } else if (config.role === 'transient') {
                contribution += positiveDiff * current * 0.08;
            } else if (config.role === 'full') {
                contribution *= 0.7;
            }

            flux += contribution;
            totalWeight += weight;
        }

        return totalWeight > 0 ? flux / totalWeight : 0;
    }

    private measureKickFingerprintRaw(state: PulseSourceState): number {
        const { config } = state;
        let lowFlux = 0;
        let lowWeight = 0;
        let harmonicFlux = 0;
        let harmonicWeight = 0;
        let clickFlux = 0;
        let clickWeight = 0;

        for (let i = config.start; i <= config.end; i++) {
            const current = this.monoSpectrum[i];
            const previous = this.previousSpectrum[i];
            const positiveDiff = Math.max(0, current - previous);
            const weight = this.getSourceBinWeight(config.name, i);

            if (i <= 7) {
                lowFlux += (positiveDiff * 1.3 + current * 0.16) * weight;
                lowWeight += weight;
                continue;
            }

            if (i <= 18) {
                harmonicFlux += (positiveDiff * 1.05 + current * 0.1) * weight;
                harmonicWeight += weight;
                continue;
            }

            const left = this.monoSpectrum[Math.max(0, i - 1)];
            const right = this.monoSpectrum[Math.min(WEAS_STEREO_BINS - 1, i + 1)];
            const neighborMean = (left + right) * 0.5;
            const localContrast = Math.max(0, current - neighborMean);

            clickFlux += (
                positiveDiff * (0.75 + Math.min(1.8, localContrast * 1.8))
                + localContrast * 0.35
            ) * weight;
            clickWeight += weight;
        }

        const low = lowWeight > 0 ? lowFlux / lowWeight : 0;
        const harmonic = harmonicWeight > 0 ? harmonicFlux / harmonicWeight : 0;
        const click = clickWeight > 0 ? clickFlux / clickWeight : 0;
        const coupled = Math.min(low, harmonic * 1.25);

        return low * 0.45 + harmonic * 0.3 + coupled * 1.35 + click * 0.28;
    }

    private measureHighSalientRaw(state: PulseSourceState): number {
        const { config } = state;
        let flux = 0;
        let totalWeight = 0;

        for (let i = config.start; i <= config.end; i++) {
            const current = this.monoSpectrum[i];
            const previous = this.previousSpectrum[i];
            const positiveDiff = Math.max(0, current - previous);
            const left = this.monoSpectrum[Math.max(0, i - 1)];
            const right = this.monoSpectrum[Math.min(WEAS_STEREO_BINS - 1, i + 1)];
            const neighborMean = (left + right) * 0.5;
            const localContrast = Math.max(0, current - neighborMean * 1.04);
            const salience = localContrast / Math.max(0.045, neighborMean + 0.03);
            const weight = this.getSourceBinWeight(config.name, i);

            if (positiveDiff <= 0 || salience <= 0.08) {
                totalWeight += weight;
                continue;
            }

            const transientFocus = positiveDiff * (0.8 + Math.min(2.4, salience) * 0.9);
            const contribution = transientFocus * weight
                + current * Math.min(0.5, salience * 0.18) * weight;

            flux += contribution;
            totalWeight += weight;
        }

        return totalWeight > 0 ? flux / totalWeight : 0;
    }

    private updateSourceState(
        state: PulseSourceState,
        time: number,
        frameSeconds: number
    ): number {
        const raw = this.measureSourceRaw(state);
        const { baseline, deviation: spread } = state;

        state.baseline += (raw - state.baseline) * 0.08;
        state.deviation += (Math.abs(raw - baseline) - state.deviation) * 0.08;

        const normalized = Math.max(0, raw - baseline * 0.9)
            / Math.max(0.012, spread * 2.4);
        const clamped = Math.min(normalized, 6);
        const peakTime = time - frameSeconds;
        const isPeak = state.previousValue > state.olderValue
            && state.previousValue >= clamped
            && state.previousValue > state.config.threshold
            && peakTime - state.lastPulseTime >= state.config.refractorySeconds;

        if (isPeak) {
            state.pulses.push({
                time: peakTime,
                strength: state.previousValue
            });
            state.lastPulseTime = peakTime;
        }

        state.olderValue = state.previousValue;
        state.previousValue = clamped;
        state.history.push(clamped);

        const historySize = Math.max(
            Math.round(this.fps * HISTORY_SECONDS),
            Math.round(DEFAULT_FRAME_RATE * HISTORY_SECONDS)
        );

        while (state.history.length > historySize) {
            state.history.shift();
        }
        while (state.pulses.length > 0 && time - state.pulses[0].time > HISTORY_SECONDS) {
            state.pulses.shift();
        }

        return clamped;
    }

    private createCandidate(value: number): TempoCandidate {
        return {
            value,
            score: 0,
            bassSupport: 0,
            harmonicSupport: 0,
            transientSupport: 0,
            fullSupport: 0,
            pulseSupport: 0,
            subBassPulseSupport: 0,
            bassBodyPulseSupport: 0,
            kickFingerprintPulseSupport: 0,
            harmonicPulseSupport: 0,
            transientPulseSupport: 0,
            highSalientPulseSupport: 0,
            fullbandFluxSupport: 0,
            family: 'direct',
            transientCorroboration: false
        };
    }

    private addSupportToCandidate(
        candidate: TempoCandidate,
        source: PulseSourceConfig,
        weight: number,
        isPulse: boolean
    ): void {
        candidate.score += weight;

        switch (source.role) {
            case 'bass':
                candidate.bassSupport += weight;
                break;
            case 'harmonic':
                candidate.harmonicSupport += weight;
                break;
            case 'transient':
                candidate.transientSupport += weight;
                break;
            case 'full':
            default:
                candidate.fullSupport += weight;
                break;
        }

        if (isPulse) {
            candidate.pulseSupport += weight;
        }

        switch (source.name) {
            case 'subBassPulse':
                candidate.subBassPulseSupport += weight;
                break;
            case 'bassBodyPulse':
                candidate.bassBodyPulseSupport += weight;
                break;
            case 'kickFingerprintPulse':
                candidate.kickFingerprintPulseSupport += weight;
                break;
            case 'harmonicPulse':
                candidate.harmonicPulseSupport += weight;
                break;
            case 'transientPulse':
                candidate.transientPulseSupport += weight;
                break;
            case 'highSalientPulse':
                candidate.highSalientPulseSupport += weight;
                break;
            case 'fullbandFlux':
                candidate.fullbandFluxSupport += weight;
                break;
        }
    }

    private addTempoEvidence(
        bucketMap: Map<number, TempoCandidate>,
        bpm: number,
        weight: number,
        source: PulseSourceConfig,
        isPulse: boolean
    ): void {
        if (!Number.isFinite(bpm) || !Number.isFinite(weight) || weight <= 0) {
            return;
        }

        const clamped = this.clampBpmRange(bpm);

        if (clamped < MIN_BPM || clamped > MAX_BPM) {
            return;
        }

        const bucket = Math.round(clamped * 2) / 2;
        const candidate = bucketMap.get(bucket) || this.createCandidate(bucket);

        this.addSupportToCandidate(candidate, source, weight, isPulse);
        bucketMap.set(bucket, candidate);
    }

    private addFastTempoAliases(
        bucketMap: Map<number, TempoCandidate>,
        directBpm: number,
        weight: number,
        source: PulseSourceConfig,
        isPulse: boolean
    ): void {
        if (
            !Number.isFinite(directBpm)
            || directBpm <= 0
            || weight <= 0
            || (source.role !== 'bass' && source.role !== 'harmonic')
        ) {
            return;
        }

        if (this.mode === TempoAnalyzerMode.EDM) {
            if (directBpm >= 80 && directBpm <= 150) {
                this.addTempoEvidence(
                    bucketMap,
                    directBpm * 1.5,
                    weight * 0.9,
                    source,
                    isPulse
                );
            }
            if (directBpm >= 55 && directBpm <= 110) {
                this.addTempoEvidence(
                    bucketMap,
                    directBpm * 2,
                    weight * 0.58,
                    source,
                    isPulse
                );
            }

            return;
        }

        if (isPulse && directBpm >= 82 && directBpm <= 145) {
            this.addTempoEvidence(
                bucketMap,
                directBpm * 1.5,
                weight * 0.3,
                source,
                true
            );
        }
    }

    private accumulatePulseCandidates(
        state: PulseSourceState,
        bucketMap: Map<number, TempoCandidate>
    ): void {
        if (state.pulses.length < 2) {
            return;
        }

        const pulseWeight = this.getModePulseWeight(state.config);
        const maxPairs = Math.min(state.pulses.length, 8);

        for (let i = state.pulses.length - 1; i >= 1; i--) {
            const current = state.pulses[i];
            let inspected = 0;

            for (let j = i - 1; j >= 0 && inspected < maxPairs; j--) {
                const previous = state.pulses[j];
                const delta = current.time - previous.time;

                if (delta <= 0 || delta > HISTORY_SECONDS) {
                    continue;
                }

                inspected++;

                const strength = Math.min(current.strength, previous.strength);
                const pairWeight = (strength * pulseWeight) / Math.max(1, i - j);

                this.addTempoEvidence(
                    bucketMap,
                    60 / delta,
                    pairWeight,
                    state.config,
                    true
                );
                this.addFastTempoAliases(
                    bucketMap,
                    60 / delta,
                    pairWeight,
                    state.config,
                    true
                );
            }
        }
    }

    private autoCorrelation(history: number[], lag: number): number {
        let sum = 0;

        for (let i = lag; i < history.length; i++) {
            sum += history[i] * history[i - lag];
        }

        return sum;
    }

    private accumulateCorrelationCandidates(
        state: PulseSourceState,
        bucketMap: Map<number, TempoCandidate>
    ): void {
        const analysisFrames = Math.min(
            state.history.length,
            Math.round(this.fps * HISTORY_SECONDS)
        );
        const history = state.history.slice(-analysisFrames);

        if (history.length < Math.round(this.fps * MIN_ANALYSIS_SECONDS)) {
            return;
        }

        const mean = history.reduce((sum, value) => {
            return sum + value;
        }, 0) / history.length;
        let energy = 0;

        for (let i = 0; i < history.length; i++) {
            history[i] = Math.max(0, history[i] - mean * 0.35);
            energy += history[i] * history[i];
        }

        if (energy <= 0.0001) {
            return;
        }

        const minLag = Math.max(2, Math.round((this.fps * 60) / MAX_BPM));
        const maxLag = Math.min(
            history.length - 2,
            Math.round((this.fps * 60) / MIN_BPM)
        );

        if (maxLag <= minLag) {
            return;
        }

        const corrWeight = this.getModeCorrelationWeight(state.config);
        const lagScores: number[] = [];

        for (let lag = minLag; lag <= maxLag; lag++) {
            lagScores[lag] = this.autoCorrelation(history, lag) / energy;
        }

        for (let lag = minLag; lag <= maxLag; lag++) {
            const baseScore = lagScores[lag] || 0;

            if (baseScore <= 0) {
                continue;
            }

            const neighborhood = baseScore * 0.6
                + (lagScores[lag - 1] || 0) * 0.2
                + (lagScores[lag + 1] || 0) * 0.2;

            if (neighborhood <= 0.02) {
                continue;
            }

            this.addTempoEvidence(
                bucketMap,
                (60 * this.fps) / lag,
                neighborhood * corrWeight,
                state.config,
                false
            );
            this.addFastTempoAliases(
                bucketMap,
                (60 * this.fps) / lag,
                neighborhood * corrWeight,
                state.config,
                false
            );
        }
    }

    private getRelatedCandidate(
        candidates: TempoCandidate[],
        target: number
    ): TempoCandidate | undefined {
        if (!Number.isFinite(target) || target < MIN_BPM || target > MAX_BPM) {
            return undefined;
        }

        const tolerance = Math.max(0.75, target * TEMPO_CORRELATION_TOLERANCE);
        let best: TempoCandidate | undefined;

        for (let i = 0; i < candidates.length; i++) {
            const candidate = candidates[i];

            if (Math.abs(candidate.value - target) > tolerance) {
                continue;
            }
            if (!best || candidate.score > best.score) {
                best = candidate;
            }
        }

        return best;
    }

    private getPrimaryPulseSource(candidate: TempoCandidate): string {
        const sourcePairs: [string, number][] = [
            ['subBassPulse', candidate.subBassPulseSupport],
            ['bassBodyPulse', candidate.bassBodyPulseSupport],
            ['kickFingerprintPulse', candidate.kickFingerprintPulseSupport],
            ['harmonicPulse', candidate.harmonicPulseSupport],
            ['transientPulse', candidate.transientPulseSupport],
            ['highSalientPulse', candidate.highSalientPulseSupport],
            ['fullbandFlux', candidate.fullbandFluxSupport]
        ];
        let primaryName = 'n/a';
        let primaryWeight = 0;

        sourcePairs.forEach(([name, value]) => {
            if (value > primaryWeight) {
                primaryName = name;
                primaryWeight = value;
            }
        });

        return primaryName;
    }

    private getBassDrivenStrength(candidate: TempoCandidate): number {
        return candidate.kickFingerprintPulseSupport * 1.2
            + candidate.bassSupport
            + candidate.harmonicSupport * 0.9
            + candidate.pulseSupport * 0.3;
    }

    private getHighSalientStrength(candidate: TempoCandidate): number {
        return candidate.highSalientPulseSupport
            + candidate.transientPulseSupport * 0.3;
    }

    private getGridReferenceBpm(): number | undefined {
        if (
            this.beatInterval > 0
            && this.beatConfidence >= 0.42
            && this.phaseLockStrength >= 0.14
        ) {
            return this.clampBpmRange(60 / this.beatInterval);
        }
        if (this.stableBpm > 0) {
            return this.stableBpm;
        }

        return undefined;
    }

    private buildBeatActivation(
        sourceValues: Partial<Record<PulseSourceName, number>>
    ): BeatActivationFrame {
        const peak = Math.max(
            0,
            (sourceValues.highSalientPulse || 0) * 1.12
            + (sourceValues.transientPulse || 0) * 0.68
        );
        const kick = Math.max(
            0,
            (sourceValues.kickFingerprintPulse || 0) * 0.82
            + (sourceValues.bassBodyPulse || 0) * 0.26
        );
        const harmonic = Math.max(
            0,
            (sourceValues.harmonicPulse || 0) * 1.08
            + (sourceValues.highSalientPulse || 0) * 0.18
        );
        const transient = Math.max(
            0,
            (sourceValues.highSalientPulse || 0) * 0.92
            + (sourceValues.transientPulse || 0) * 0.48
        );

        return {
            peak,
            kick,
            harmonic,
            transient,
            value: kick * 0.3 + harmonic * 0.82 + transient * 0.46 + peak * 1.05
        };
    }

    private pushBeatActivation(
        time: number,
        activation: BeatActivationFrame,
        frameSeconds: number
    ): BeatActivationSample | undefined {
        const currentSample: BeatActivationSample = {
            time,
            ...activation
        };
        let anchorEvent: BeatActivationSample | undefined;

        if (this.previousBeatFrame && this.olderBeatFrame) {
            const previous = this.previousBeatFrame;
            const older = this.olderBeatFrame;
            const isHighPeak = previous.peak > older.peak
                && previous.peak >= currentSample.peak
                && previous.peak > 0.16;
            const isCompositePeak = previous.value > older.value
                && previous.value >= currentSample.value
                && previous.value > 0.2;
            const hasHighFallingEdge = previous.peak - currentSample.peak > 0.03;
            const hasCompositeFallingEdge = previous.value - currentSample.value > 0.04;
            const anchorStrength = previous.peak * 0.86
                + previous.value * 0.72
                + previous.harmonic * 0.24
                + previous.transient * 0.16;
            const acceptsAnchor = (
                isHighPeak
                || (isCompositePeak && previous.peak > 0.1)
            ) && (
                hasHighFallingEdge
                || hasCompositeFallingEdge
            );

            if (acceptsAnchor && anchorStrength > 0.24) {
                anchorEvent = {
                    time: time - frameSeconds * 0.35,
                    value: previous.value,
                    peak: previous.peak,
                    kick: previous.kick,
                    harmonic: previous.harmonic,
                    transient: previous.transient
                };
                this.beatActivations.push(anchorEvent);
            }
        }

        this.olderBeatFrame = this.previousBeatFrame;
        this.previousBeatFrame = currentSample;

        while (
            this.beatActivations.length > 0
            && time - this.beatActivations[0].time > HISTORY_SECONDS
        ) {
            this.beatActivations.shift();
        }

        return anchorEvent;
    }

    private updatePhaseHistogram(
        beatInterval: number,
        anchorEvent: BeatActivationSample | undefined,
        frameSeconds: number
    ): void {
        if (
            this.lastBeatTime <= 0
            || beatInterval <= 0
            || !Number.isFinite(beatInterval)
        ) {
            return;
        }

        const decay = PHASE_HISTOGRAM_DECAY_PER_SECOND ** frameSeconds;

        for (let i = 0; i < PHASE_HISTOGRAM_BINS; i++) {
            this.phaseHistogram[i] *= decay;
        }

        if (!anchorEvent) {
            return;
        }

        const phaseWeight = Math.max(
            0,
            anchorEvent.peak * 0.9
                + anchorEvent.value * 0.62
                + anchorEvent.harmonic * 0.2
                - 0.12
        );

        if (phaseWeight > PHASE_LOCK_MIN_WEIGHT) {
            const phase = (
                ((anchorEvent.time - this.lastBeatTime) / beatInterval) % 1 + 1
            ) % 1;
            const binPosition = phase * PHASE_HISTOGRAM_BINS;
            const baseIndex = Math.floor(binPosition) % PHASE_HISTOGRAM_BINS;
            const nextIndex = (baseIndex + 1) % PHASE_HISTOGRAM_BINS;
            const nextWeight = binPosition - Math.floor(binPosition);
            const baseWeight = 1 - nextWeight;

            this.phaseHistogram[baseIndex] += phaseWeight * baseWeight;
            this.phaseHistogram[nextIndex] += phaseWeight * nextWeight;
        }

        const histogramSum = this.phaseHistogram.reduce((sum, value) => {
            return sum + value;
        }, 0);

        if (histogramSum <= 0.0001) {
            this.phaseLockStrength = 0;

            return;
        }

        let peakIndex = 0;

        for (let i = 1; i < PHASE_HISTOGRAM_BINS; i++) {
            if (this.phaseHistogram[i] > this.phaseHistogram[peakIndex]) {
                peakIndex = i;
            }
        }

        const centerValue = this.phaseHistogram[peakIndex];
        const leftIndex = (peakIndex + PHASE_HISTOGRAM_BINS - 1) % PHASE_HISTOGRAM_BINS;
        const rightIndex = (peakIndex + 1) % PHASE_HISTOGRAM_BINS;
        const leftValue = this.phaseHistogram[leftIndex];
        const rightValue = this.phaseHistogram[rightIndex];
        const localSum = leftValue + centerValue + rightValue;
        const localCenter = (
            leftValue * (peakIndex - 1)
            + centerValue * peakIndex
            + rightValue * (peakIndex + 1)
        ) / Math.max(localSum, 0.0001);

        this.dominantActivationPhase = (
            (localCenter % PHASE_HISTOGRAM_BINS) + PHASE_HISTOGRAM_BINS
        ) % PHASE_HISTOGRAM_BINS / PHASE_HISTOGRAM_BINS;
        this.phaseLockStrength = Math.max(0, Math.min(1, centerValue / histogramSum));
    }

    private applyPhaseCorrection(beatInterval: number): void {
        if (
            this.phaseLockStrength < PHASE_LOCK_MIN_STRENGTH
            || beatInterval <= 0
            || this.lastBeatTime <= 0
            || this.nextBeatTime <= 0
        ) {
            return;
        }

        const wrappedOffset = this.dominantActivationPhase > 0.5
            ? this.dominantActivationPhase - 1
            : this.dominantActivationPhase;
        const clampedRatio = Math.max(
            -PHASE_LOCK_MAX_CORRECTION_RATIO,
            Math.min(PHASE_LOCK_MAX_CORRECTION_RATIO, wrappedOffset)
        );

        if (Math.abs(clampedRatio) < 0.01) {
            return;
        }

        const correction = clampedRatio
            * beatInterval
            * Math.min(0.08, this.phaseLockStrength * 0.12);

        this.lastBeatTime += correction;
        this.nextBeatTime += correction;
    }

    private findBeatPlacementCandidate(
        predictedTime: number,
        beatInterval: number,
        window: number
    ): BeatPlacementCandidate | undefined {
        let best: BeatPlacementCandidate | undefined;

        for (let i = this.beatActivations.length - 1; i >= 0; i--) {
            const sample = this.beatActivations[i];

            if (sample.time < predictedTime - window) {
                break;
            }
            if (
                sample.time > predictedTime + window
                || sample.time <= this.lastBeatTime + beatInterval * 0.3
            ) {
                continue;
            }

            const timingScore = Math.max(
                0,
                1 - Math.abs(sample.time - predictedTime) / Math.max(window, 0.001)
            );
            const intervalError = Math.abs(
                (sample.time - this.lastBeatTime) - beatInterval
            );
            const continuityScore = Math.max(
                0,
                1 - intervalError / Math.max(beatInterval * 0.24, 0.06)
            );
            const activationScore = sample.peak * 0.98
                + sample.value * 0.84
                + sample.harmonic * 0.22
                + sample.transient * 0.12;
            const score = activationScore + timingScore * 0.8 + continuityScore * 0.6;

            if (!best || score > best.score) {
                best = {
                    ...sample,
                    score
                };
            }
        }

        return best;
    }

    private applyEdmTempoDisambiguation(
        candidates: TempoCandidate[]
    ): TempoCandidate[] {
        const adjusted = candidates.map((candidate) => {
            return {
                ...candidate
            };
        });

        adjusted.forEach((candidate) => {
            if (candidate.value < 78 || candidate.value > 150) {
                return;
            }

            const sesquialteraCandidate = this.getRelatedCandidate(
                adjusted,
                candidate.value * 1.5
            );
            const doubleCandidate = this.getRelatedCandidate(
                adjusted,
                candidate.value * 2
            );
            const fasterCandidate = [sesquialteraCandidate, doubleCandidate]
                .filter((entry): entry is TempoCandidate => {
                    return Boolean(entry);
                })
                .sort((left, right) => {
                    return right.score - left.score;
                })[0];

            if (!fasterCandidate) {
                return;
            }

            const slowBassStrength = this.getBassDrivenStrength(candidate);
            const fastBassStrength = this.getBassDrivenStrength(fasterCandidate);
            const slowHighSalient = this.getHighSalientStrength(candidate);
            const fastHighSalient = this.getHighSalientStrength(fasterCandidate);
            const competitiveScore = fasterCandidate.score >= candidate.score * 0.58;
            const strongBassAgreement = fastBassStrength >= slowBassStrength * 0.82;
            const transientAgreement = fasterCandidate.transientCorroboration
                || fasterCandidate.transientSupport >= candidate.transientSupport * 0.9
                || fastHighSalient >= Math.max(0.08, slowHighSalient * 0.9);

            if (!competitiveScore || !strongBassAgreement || !transientAgreement) {
                return;
            }

            const relation = fasterCandidate.value / candidate.value;
            const ratioBoost = relation >= 1.9
                ? fastHighSalient > slowHighSalient ? 1.24 : 1.18
                : fastHighSalient > slowHighSalient ? 1.34 : 1.26;

            fasterCandidate.score *= ratioBoost;
            candidate.score *= relation >= 1.9 ? 0.82 : 0.68;
        });

        return adjusted
            .sort((a, b) => {
                return b.score - a.score;
            })
            .filter((entry, index, entries) => {
                return !entries.slice(0, index).some((prev) => {
                    return Math.abs(prev.value - entry.value) < 0.75;
                });
            });
    }

    private aggregateTempoFamilies(
        rawCandidates: TempoCandidate[]
    ): TempoCandidate[] {
        const aggregated = rawCandidates
            .map((candidate) => {
                const directScore = candidate.score;
                const halfCandidate = this.getRelatedCandidate(
                    rawCandidates,
                    candidate.value / 2
                );
                const tripletCandidate = this.getRelatedCandidate(
                    rawCandidates,
                    candidate.value / 1.5
                );
                const quarterCandidate = this.getRelatedCandidate(
                    rawCandidates,
                    candidate.value / 4
                );
                const doubleCandidate = this.getRelatedCandidate(
                    rawCandidates,
                    candidate.value * 2
                );
                const sesquialteraCandidate = this.getRelatedCandidate(
                    rawCandidates,
                    candidate.value * 1.5
                );
                const fasterSupport = (halfCandidate?.score || 0) * 0.76
                    + (tripletCandidate?.score || 0) * 0.54
                    + (quarterCandidate?.score || 0) * 0.2;
                const slowerSupport = (doubleCandidate?.score || 0) * 0.18
                    + (sesquialteraCandidate?.score || 0) * 0.12;
                let score = directScore + fasterSupport + slowerSupport;
                let family = 'direct';
                const familyScores = {
                    direct: directScore,
                    double: (halfCandidate?.score || 0) * 0.76,
                    triplet: (tripletCandidate?.score || 0) * 0.54,
                    quarter: (quarterCandidate?.score || 0) * 0.2
                };

                Object.entries(familyScores).forEach(([name, value]) => {
                    if (value > familyScores[family]) {
                        family = name;
                    }
                });

                const bassHarmonicSupport = candidate.bassSupport
                    + candidate.kickFingerprintPulseSupport * 1.1
                    + candidate.harmonicSupport
                    + ((halfCandidate?.bassSupport || 0)
                        + (halfCandidate?.kickFingerprintPulseSupport || 0) * 1.1
                        + (halfCandidate?.harmonicSupport || 0)) * 0.65
                    + ((tripletCandidate?.bassSupport || 0)
                        + (tripletCandidate?.kickFingerprintPulseSupport || 0) * 1.1
                        + (tripletCandidate?.harmonicSupport || 0)) * 0.45;
                const transientSupport = candidate.transientSupport
                    + (tripletCandidate?.transientSupport || 0) * 0.35
                    + (halfCandidate?.transientSupport || 0) * 0.2;
                const highSalientSupport = candidate.highSalientPulseSupport
                    + (tripletCandidate?.highSalientPulseSupport || 0) * 0.4
                    + (halfCandidate?.highSalientPulseSupport || 0) * 0.2;
                const corroboratingTransientSupport = transientSupport
                    + highSalientSupport * 0.9;
                const transientCorroboration = corroboratingTransientSupport > 0.18 * score
                    && bassHarmonicSupport > corroboratingTransientSupport * 0.52;

                if (this.mode === TempoAnalyzerMode.EDM) {
                    if (candidate.value >= EDM_FAST_TEMPO_FLOOR) {
                        score *= candidate.value >= 160 ? 1.12 : 1.06;
                    }
                    if (transientCorroboration) {
                        score *= 1.05;
                    }
                    if (bassHarmonicSupport < transientSupport * 0.85) {
                        score *= 0.8;
                    }
                    if (
                        candidate.value >= 145
                        && highSalientSupport > Math.max(0.12, directScore * 0.14)
                    ) {
                        score *= 1.08;
                    }
                    if (candidate.kickFingerprintPulseSupport > Math.max(0.14, directScore * 0.18)) {
                        score *= candidate.value >= 150 ? 1.1 : 1.04;
                    }
                    if (
                        candidate.value < 150
                        && sesquialteraCandidate
                        && sesquialteraCandidate.score >= directScore * 0.42
                    ) {
                        score *= 0.62;
                    }
                    if (
                        candidate.value < FAST_TEMPO_FLOOR
                        && doubleCandidate
                        && doubleCandidate.score >= directScore * 0.7
                    ) {
                        score *= 0.82;
                    }
                } else {
                    if (transientCorroboration) {
                        score *= 1.02;
                    }
                    if (bassHarmonicSupport < transientSupport * 0.95) {
                        score *= 0.9;
                    }
                }

                if (this.stableBpm > 0) {
                    const distance = Math.abs(candidate.value - this.stableBpm) / this.stableBpm;

                    if (distance < TEMPO_LOCK_DISTANCE) {
                        score *= 1.05;
                    } else if (distance > 0.35) {
                        score *= 0.95;
                    }
                }

                return {
                    ...candidate,
                    score,
                    family,
                    transientCorroboration
                };
            })
            .sort((a, b) => {
                return b.score - a.score;
            })
            .filter((entry, index, entries) => {
                return !entries.slice(0, index).some((prev) => {
                    return Math.abs(prev.value - entry.value) < 0.75;
                });
            });

        const resolved = this.mode === TempoAnalyzerMode.EDM
            ? this.applyEdmTempoDisambiguation(aggregated)
            : aggregated;

        return resolved.slice(0, 8);
    }

    private estimateCandidates(): TempoCandidate[] {
        const bucketMap = new Map<number, TempoCandidate>();

        this.sourceStates.forEach((state) => {
            this.accumulatePulseCandidates(state, bucketMap);
            this.accumulateCorrelationCandidates(state, bucketMap);
        });

        const rawCandidates = Array.from(bucketMap.values())
            .filter((candidate) => {
                return Number.isFinite(candidate.score) && candidate.score > 0;
            })
            .sort((a, b) => {
                return b.score - a.score;
            })
            .slice(0, 12);

        if (!rawCandidates.length) {
            return [];
        }

        return this.aggregateTempoFamilies(rawCandidates);
    }

    private selectPreferredCandidate(
        candidates: TempoCandidate[]
    ): TempoCandidate | undefined {
        if (!candidates.length) {
            return undefined;
        }

        let preferred = candidates[0];

        if (this.mode !== TempoAnalyzerMode.EDM) {
            return preferred;
        }

        candidates.forEach((candidate) => {
            if (candidate === preferred || candidate.value < 145) {
                return;
            }

            const ratio = candidate.value / preferred.value;
            const relatedToPreferred = Math.abs(ratio - 1.5) <= 0.08
                || Math.abs(ratio - 2) <= 0.12;

            if (!relatedToPreferred) {
                return;
            }

            const preferredBass = this.getBassDrivenStrength(preferred);
            const candidateBass = this.getBassDrivenStrength(candidate);
            const preferredHighSalient = this.getHighSalientStrength(preferred);
            const candidateHighSalient = this.getHighSalientStrength(candidate);
            const competitiveScore = candidate.score >= preferred.score * 0.52;
            const strongBass = candidateBass >= preferredBass * 0.72;
            const supportiveTransient = candidate.transientCorroboration
                || candidate.transientSupport >= preferred.transientSupport * 0.8
                || candidateHighSalient >= Math.max(0.08, preferredHighSalient * 0.88);

            if (!competitiveScore || !strongBass || !supportiveTransient) {
                return;
            }

            preferred = candidate;
        });

        return preferred;
    }

    private buildBpmOutput(
        candidates: TempoCandidate[],
        primaryCandidate?: TempoCandidate
    ): BpmCandidate[] {
        const result: BpmCandidate[] = [];
        const [firstCandidate] = candidates;
        const gridReferenceBpm = this.getGridReferenceBpm();
        const candidateReference = primaryCandidate || firstCandidate;

        if (gridReferenceBpm && this.beatConfidence >= 0.42) {
            result.push({
                value: gridReferenceBpm,
                weight: Math.max(0.998, this.stableWeight)
            });
        } else if (this.stableBpm > 0 && this.stableWeight > 0.2) {
            let { stableWeight } = this;

            if (candidateReference) {
                const stableDistance = Math.abs(this.stableBpm - candidateReference.value)
                    / candidateReference.value;

                if (stableDistance > TEMPO_SWITCH_HARD_RESET_DRIFT) {
                    stableWeight *= 0.35;
                } else if (stableDistance > TEMPO_LOCK_DISTANCE) {
                    stableWeight *= 0.65;
                }
            }

            result.push({
                value: this.stableBpm,
                weight: stableWeight
            });
        }

        if (!candidates.length) {
            return result;
        }

        const bestScore = candidates[0].score || 1;

        candidates.forEach((candidate) => {
            let weight = Math.max(0, Math.min(1, candidate.score / bestScore));
            const referenceBpm = gridReferenceBpm || candidateReference?.value;

            if (referenceBpm && this.beatConfidence >= 0.42) {
                const ratio = candidate.value / referenceBpm;
                const closeToReference = Math.abs(candidate.value - referenceBpm) / referenceBpm < 0.06;
                const halfLike = Math.abs(ratio - 0.5) < 0.08 || Math.abs(ratio - 2) < 0.12;
                const tripletLike = Math.abs(ratio - (2 / 3)) < 0.06 || Math.abs(ratio - 1.5) < 0.08;

                if (closeToReference) {
                    weight = Math.max(weight, 0.995);
                } else if (halfLike) {
                    weight *= 0.42;
                } else if (tripletLike && this.phaseLockStrength >= 0.16) {
                    weight *= 0.68;
                }
            }

            if (primaryCandidate && candidate.value === primaryCandidate.value) {
                weight = Math.max(weight, 0.999);
            }

            result.push({
                value: this.clampBpmRange(candidate.value),
                weight
            });
        });

        return result
            .sort((a, b) => {
                return b.weight - a.weight;
            })
            .filter((entry, index, entries) => {
                return !entries.slice(0, index).some((prev) => {
                    return Math.abs(prev.value - entry.value) < 0.75;
                });
            })
            .slice(0, 3);
    }

    private anchorBeatClock(
        time: number,
        beatInterval: number,
        bpmWeight: number
    ): Omit<BeatAnalysis, 'bpm'> {
        this.beatInterval = beatInterval;
        this.lastBeatTime = time;
        this.nextBeatTime = time + beatInterval;
        this.beatConfidence = Math.max(0.45, Math.min(1, bpmWeight));
        this.openLoopBeats = 0;

        return {
            beatPhase: 0,
            isBeat: true,
            beatConfidence: this.beatConfidence,
            secondsSinceLastBeat: 0,
            secondsToNextBeat: beatInterval,
            beatInterval: this.beatInterval,
            lastBeatTime: this.lastBeatTime,
            nextBeatTime: this.nextBeatTime
        };
    }

    private clampWindow(value: number, min: number, max: number): number {
        return Math.max(min, Math.min(max, value));
    }

    private updateBeatClock(
        time: number,
        beatInterval: number,
        activation: BeatActivationFrame,
        bpmWeight: number,
        frameSeconds: number
    ): Omit<BeatAnalysis, 'bpm'> | undefined {
        const sustainThreshold = this.lastBeatTime > 0
            ? BPM_PRIMARY_SUSTAIN_THRESHOLD
            : BPM_PRIMARY_LOCK_THRESHOLD;
        const peakActivation = activation.peak;

        if (bpmWeight < sustainThreshold || !Number.isFinite(beatInterval) || beatInterval <= 0) {
            this.beatConfidence *= 0.99;

            if (this.beatConfidence < 0.18) {
                this.clearBeatClock();
            }

            return;
        }

        if (this.beatInterval <= 0) {
            this.beatInterval = beatInterval;
        } else {
            this.beatInterval += (beatInterval - this.beatInterval) * 0.18;
        }

        const anchorEvent = this.pushBeatActivation(time, activation, frameSeconds);

        this.updatePhaseHistogram(this.beatInterval, anchorEvent, frameSeconds);

        if (this.lastBeatTime <= 0 || this.nextBeatTime <= 0) {
            const anchorCandidate = this.findBeatPlacementCandidate(
                time,
                this.beatInterval,
                this.clampWindow(this.beatInterval * 0.5, 0.08, 0.18)
            );

            if (anchorCandidate && anchorCandidate.score >= 1.25) {
                return this.anchorBeatClock(
                    anchorCandidate.time,
                    this.beatInterval,
                    bpmWeight
                );
            }
            if (peakActivation >= BEAT_ANCHOR_ONSET_THRESHOLD || activation.value >= BEAT_ANCHOR_ONSET_THRESHOLD) {
                return this.anchorBeatClock(time, this.beatInterval, bpmWeight);
            }

            return;
        }

        this.applyPhaseCorrection(this.beatInterval);

        let isBeat = false;
        const snapWindow = this.clampWindow(
            this.beatInterval * BEAT_SNAP_WINDOW_RATIO,
            BEAT_SNAP_WINDOW_MIN,
            BEAT_SNAP_WINDOW_MAX
        );
        const reanchorWindow = this.clampWindow(
            this.beatInterval * BEAT_REANCHOR_WINDOW_RATIO,
            BEAT_REANCHOR_WINDOW_MIN,
            BEAT_REANCHOR_WINDOW_MAX
        );
        const bestPlacement = this.findBeatPlacementCandidate(
            this.nextBeatTime,
            this.beatInterval,
            reanchorWindow
        );
        const openLoopScore = Math.max(
            0.18,
            0.34 + this.beatConfidence * 0.38 - this.openLoopBeats * 0.05
        );

        if (
            bestPlacement
            && Math.abs(bestPlacement.time - this.nextBeatTime) <= reanchorWindow
        ) {
            const placementOffset = bestPlacement.time - this.nextBeatTime;
            const strongPlacement = bestPlacement.score > openLoopScore + 0.2;

            if (
                this.beatConfidence < BEAT_GRID_REANCHOR_CONFIDENCE
                && strongPlacement
            ) {
                const correction = Math.max(
                    -reanchorWindow * 0.85,
                    Math.min(reanchorWindow * 0.85, placementOffset)
                );

                this.lastBeatTime += correction;
                this.nextBeatTime += correction;
            } else {
                const correction = placementOffset * BEAT_GRID_NUDGE_RATIO;

                this.lastBeatTime += correction;
                this.nextBeatTime += correction;
            }
        }

        while (time >= this.nextBeatTime + this.beatInterval) {
            this.lastBeatTime = this.nextBeatTime;
            this.nextBeatTime = this.lastBeatTime + this.beatInterval;
            this.openLoopBeats++;
            this.beatConfidence *= 0.9;
        }

        const corroboratedBeat = time >= this.nextBeatTime - snapWindow
            && bestPlacement
            && Math.abs(bestPlacement.time - this.nextBeatTime) <= snapWindow
            && bestPlacement.score > openLoopScore + 0.12;

        if (time >= this.nextBeatTime) {
            if (corroboratedBeat && bestPlacement) {
                const placementError = bestPlacement.time - this.nextBeatTime;
                const intervalCorrection = Math.max(
                    -this.beatInterval * BEAT_INTERVAL_REFINE_MAX_RATIO,
                    Math.min(
                        this.beatInterval * BEAT_INTERVAL_REFINE_MAX_RATIO,
                        placementError * BEAT_INTERVAL_REFINE_RATIO
                    )
                );

                this.beatInterval += intervalCorrection;
            }

            this.lastBeatTime = this.nextBeatTime;
            this.nextBeatTime = this.lastBeatTime + this.beatInterval;
            isBeat = true;

            if (corroboratedBeat && bestPlacement) {
                this.openLoopBeats = 0;
                this.beatConfidence = Math.min(
                    1,
                    this.beatConfidence * 0.76
                        + Math.max(0.45, bpmWeight) * 0.36
                        + Math.min(0.22, bestPlacement.transient * 0.08)
                );
            } else {
                this.openLoopBeats++;
                this.beatConfidence = Math.max(0, this.beatConfidence * 0.95 - 0.02);
            }
        } else {
            this.beatConfidence = Math.max(
                0,
                this.beatConfidence * 0.999 - this.openLoopBeats * 0.004
            );
        }

        if (
            this.beatConfidence >= BEAT_GRID_TEMPO_BLEND_CONFIDENCE
            && this.stableBpm > 0
            && this.beatInterval > 0
        ) {
            const refinedBpm = this.clampBpmRange(60 / this.beatInterval);
            const stableDistance = Math.abs(refinedBpm - this.stableBpm) / this.stableBpm;

            if (stableDistance < 0.12) {
                this.stableBpm += (refinedBpm - this.stableBpm) * 0.22;
                this.stableWeight = Math.min(
                    1,
                    this.stableWeight * 0.92 + this.beatConfidence * 0.08
                );
            }
        }

        const secondsSinceLastBeat = Math.max(0, time - this.lastBeatTime);
        const secondsToNextBeat = Math.max(0, this.nextBeatTime - time);
        const phaseRatio = this.beatInterval > 0
            ? (secondsSinceLastBeat % this.beatInterval) / this.beatInterval
            : 0;

        return {
            peakActivation,
            phaseLock: this.phaseLockStrength,
            beatPhase: Math.max(0, Math.min(0.999999, phaseRatio)),
            isBeat,
            beatConfidence: Math.max(0, Math.min(1, this.beatConfidence)),
            secondsSinceLastBeat,
            secondsToNextBeat,
            beatInterval: this.beatInterval,
            lastBeatTime: this.lastBeatTime,
            nextBeatTime: this.nextBeatTime
        };
    }

    private updateStableTempo(
        best: TempoCandidate,
        frameSeconds: number
    ): void {
        const alignedBpm = this.clampBpmRange(best.value);
        const nextWeight = Math.max(
            0.22,
            Math.min(1, best.score / (best.score + 2.5))
        );

        if (this.stableBpm <= 0) {
            this.stableBpm = alignedBpm;
            this.stableWeight = Math.max(0.35, nextWeight);
            this.candidateTempo = 0;
            this.candidateHoldSeconds = 0;
            this.switchConfidence = 0;

            return;
        }

        const drift = Math.abs(alignedBpm - this.stableBpm) / this.stableBpm;
        const sameTrackSlowdown = this.mode === TempoAnalyzerMode.EDM
            && this.stableBpm >= 150
            && alignedBpm < this.stableBpm * 0.82
            && this.profileShift < TRACK_PROFILE_SWITCH_THRESHOLD;

        if (drift <= TEMPO_LOCK_DISTANCE) {
            this.stableBpm += (alignedBpm - this.stableBpm) * 0.18;
            this.stableWeight = Math.min(1, this.stableWeight * 0.8 + nextWeight * 0.35);
            this.candidateTempo = 0;
            this.candidateHoldSeconds = Math.max(0, this.candidateHoldSeconds - frameSeconds * 2);
            this.switchConfidence = Math.max(0, this.switchConfidence - frameSeconds);

            return;
        }

        if (sameTrackSlowdown) {
            this.stableWeight = Math.min(1, this.stableWeight * 0.995 + nextWeight * 0.05);
            this.candidateTempo = alignedBpm;
            this.candidateHoldSeconds = Math.max(0, this.candidateHoldSeconds - frameSeconds * 0.5);
            this.switchConfidence = Math.max(0, this.switchConfidence - frameSeconds * 0.75);

            return;
        }

        if (
            this.candidateTempo <= 0
            || Math.abs(alignedBpm - this.candidateTempo) / this.candidateTempo > 0.1
        ) {
            this.candidateTempo = alignedBpm;
            this.candidateHoldSeconds = Math.max(
                frameSeconds,
                this.candidateHoldSeconds * 0.55
            );
        } else {
            this.candidateTempo += (alignedBpm - this.candidateTempo) * 0.25;
            this.candidateHoldSeconds += drift > TEMPO_SWITCH_HARD_RESET_DRIFT
                ? frameSeconds * 2.2
                : frameSeconds;
        }

        this.candidateHoldSeconds = Math.min(
            this.candidateHoldSeconds,
            TEMPO_SWITCH_FORCE_SECONDS * 1.35
        );

        this.switchConfidence = Math.max(
            0,
            Math.min(1, this.candidateHoldSeconds / TEMPO_SWITCH_FORCE_SECONDS)
        );

        const hardProfileSwitch = this.profileShift > TRACK_PROFILE_HARD_SWITCH_THRESHOLD
            && this.candidateHoldSeconds > TEMPO_SWITCH_CONFIRM_SECONDS;
        const rollingForceSwitch = this.candidateHoldSeconds > TEMPO_SWITCH_FORCE_SECONDS
            && nextWeight >= this.stableWeight * TEMPO_SWITCH_MIN_COMPETITIVE_WEIGHT;
        const shouldAdopt = this.stableWeight < 0.35
            || rollingForceSwitch
            || (
                drift > TEMPO_SWITCH_DRIFT_THRESHOLD
                && this.profileShift > TRACK_PROFILE_SWITCH_THRESHOLD
                && this.candidateHoldSeconds > TEMPO_SWITCH_CONFIRM_SECONDS
                && nextWeight >= this.stableWeight * TEMPO_SWITCH_MIN_COMPETITIVE_WEIGHT
            );

        if (shouldAdopt) {
            const smoothing = hardProfileSwitch
                ? 0.48
                : this.candidateHoldSeconds > TEMPO_SWITCH_FORCE_SECONDS
                    ? 0.32
                    : this.candidateHoldSeconds > TEMPO_SWITCH_CONFIRM_SECONDS
                        ? 0.24
                        : 0.18;

            this.stableBpm += (this.candidateTempo - this.stableBpm) * smoothing;
            this.stableWeight = Math.min(1, this.stableWeight * 0.82 + nextWeight * 0.32);
            this.candidateHoldSeconds = Math.max(
                0,
                this.candidateHoldSeconds - frameSeconds * (1 + smoothing * 2.2)
            );
            this.switchConfidence = Math.max(
                0,
                Math.min(1, this.candidateHoldSeconds / TEMPO_SWITCH_FORCE_SECONDS)
            );
        } else {
            this.stableWeight *= 0.992;
            this.candidateHoldSeconds = Math.max(
                0,
                this.candidateHoldSeconds - frameSeconds * TEMPO_SWITCH_EVIDENCE_DECAY
            );
            this.switchConfidence = Math.max(
                0,
                Math.min(1, this.candidateHoldSeconds / TEMPO_SWITCH_FORCE_SECONDS)
            );
        }
    }

    private getModeLabel(): TempoAnalyzerModeValue {
        return this.mode;
    }

    public process(time: number, data: ArrayLike<number>): BeatAnalysis {
        if (this.mode === TempoAnalyzerMode.Off) {
            this.resetState();

            return {
                bpm: [],
                analyzerMode: this.getModeLabel()
            };
        }

        if (
            data === null
            || data === undefined
            || data.length < WEAS_SPECTRUM_BINS
            || !Number.isFinite(time)
        ) {
            return {
                bpm: [],
                analyzerMode: this.getModeLabel()
            };
        }

        let frameSeconds = Math.max(1 / this.fps, 0.01);

        if (this.lastTime > 0) {
            const delta = time - this.lastTime;

            if (delta <= 0 || delta > 1.5) {
                this.resetState();
            } else {
                const frameRate = 1 / delta;

                this.fps += (frameRate - this.fps) * 0.15;
                this.fps = Math.max(15, Math.min(90, this.fps));
                frameSeconds = delta;
            }
        }

        this.lastTime = time;

        const energy = this.extractMonoSpectrum(data);

        this.updateTrackProfileShift();
        let dominantEnvelope = 0;
        const sourceValues: Partial<Record<PulseSourceName, number>> = {};

        this.sourceStates.forEach((state) => {
            const nextValue = this.updateSourceState(state, time, frameSeconds);

            sourceValues[state.config.name] = nextValue;
            dominantEnvelope = Math.max(
                dominantEnvelope,
                nextValue
            );
        });
        this.previousSpectrum.set(this.monoSpectrum);
        const beatActivation = this.buildBeatActivation(sourceValues);

        if (energy < 0.01 && dominantEnvelope < 0.18) {
            this.silentSeconds += frameSeconds;
            this.stableWeight *= 0.96;
            this.beatConfidence *= 0.99;

            if (this.autoReset && this.silentSeconds > SILENCE_HOLD_SECONDS) {
                this.resetState();

                return {
                    bpm: [],
                    analyzerMode: this.getModeLabel()
                };
            }
        } else {
            this.silentSeconds = 0;
        }

        const candidates = this.estimateCandidates();
        const preferredCandidate = this.selectPreferredCandidate(candidates);

        if (!candidates.length) {
            this.stableWeight *= 0.985;
            this.candidateHoldSeconds = Math.max(0, this.candidateHoldSeconds - frameSeconds * 0.5);
            this.switchConfidence = Math.max(0, this.switchConfidence - frameSeconds * 0.5);
        } else {
            this.updateStableTempo(preferredCandidate || candidates[0], frameSeconds);
            this.lastPrimaryPulseSource = this.getPrimaryPulseSource(
                preferredCandidate || candidates[0]
            );
            this.lastTempoFamily = (preferredCandidate || candidates[0]).family;
            this.lastTransientCorroboration = (
                preferredCandidate || candidates[0]
            ).transientCorroboration;
        }

        const bpm = this.buildBpmOutput(candidates, preferredCandidate);
        const primary = bpm.reduce<BpmCandidate | undefined>((best, entry) => {
            if (!best || entry.weight > best.weight) {
                return entry;
            }

            return best;
        }, undefined);

        if (!primary) {
            this.clearBeatClock();

            return {
                bpm,
                peakActivation: beatActivation.peak,
                phaseLock: this.phaseLockStrength,
                analyzerMode: this.getModeLabel(),
                primaryPulseSource: this.lastPrimaryPulseSource,
                tempoFamily: this.lastTempoFamily,
                transientCorroboration: this.lastTransientCorroboration,
                switchConfidence: this.switchConfidence
            };
        }

        const beatClock = this.updateBeatClock(
            time,
            60 / primary.value,
            {
                ...beatActivation,
                value: Math.max(beatActivation.value, dominantEnvelope * 0.45)
            },
            primary.weight,
            frameSeconds
        );

        return {
            bpm,
            peakActivation: beatActivation.peak,
            phaseLock: this.phaseLockStrength,
            ...(beatClock || {}),
            analyzerMode: this.getModeLabel(),
            primaryPulseSource: this.lastPrimaryPulseSource,
            tempoFamily: this.lastTempoFamily,
            transientCorroboration: this.lastTransientCorroboration,
            switchConfidence: this.switchConfidence
        };
    }

}
