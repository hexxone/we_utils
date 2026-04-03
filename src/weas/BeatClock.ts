/**
 * @author hexxone / https://hexx.one
 *
 * @license
 * Copyright (c) 2026 hexxone All rights reserved.
 * Licensed under the GNU GENERAL PUBLIC LICENSE.
 * See LICENSE file in the project root for full license information.
 */

import { BeatAnalysis } from './Bea';

const BPM_PRIMARY_LOCK_THRESHOLD = 0.42;
const BPM_PRIMARY_SUSTAIN_THRESHOLD = 0.28;
const BEAT_ANCHOR_THRESHOLD = 0.72;
const BEAT_SNAP_THRESHOLD = 0.58;
const BEAT_SNAP_WINDOW_RATIO = 0.18;
const BEAT_SNAP_WINDOW_MIN = 0.04;
const BEAT_SNAP_WINDOW_MAX = 0.12;
const BEAT_REANCHOR_WINDOW_RATIO = 0.35;
const BEAT_REANCHOR_WINDOW_MIN = 0.09;
const BEAT_REANCHOR_WINDOW_MAX = 0.2;

export class BeatClockTracker {

    private beatInterval = 0;
    private lastBeatTime = 0;
    private nextBeatTime = 0;
    private beatConfidence = 0;
    private openLoopBeats = 0;

    public reset(): void {
        this.beatInterval = 0;
        this.lastBeatTime = 0;
        this.nextBeatTime = 0;
        this.beatConfidence = 0;
        this.openLoopBeats = 0;
    }

    public update(
        time: number,
        bpm: number,
        bpmWeight: number,
        activation: number
    ): Omit<BeatAnalysis, 'bpm'> | undefined {
        const beatInterval = bpm > 0 ? 60 / bpm : 0;
        const sustainThreshold = this.lastBeatTime > 0
            ? BPM_PRIMARY_SUSTAIN_THRESHOLD
            : BPM_PRIMARY_LOCK_THRESHOLD;

        if (
            bpmWeight < sustainThreshold
            || !Number.isFinite(beatInterval)
            || beatInterval <= 0
        ) {
            this.beatConfidence *= 0.99;

            if (this.beatConfidence < 0.16) {
                this.reset();
            }

            return;
        }

        if (this.beatInterval <= 0) {
            this.beatInterval = beatInterval;
        } else {
            this.beatInterval += (beatInterval - this.beatInterval) * 0.16;
        }

        if (this.lastBeatTime <= 0 || this.nextBeatTime <= 0) {
            if (activation >= BEAT_ANCHOR_THRESHOLD) {
                return this.anchor(time, bpmWeight);
            }

            return;
        }

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

        while (time >= this.nextBeatTime) {
            this.lastBeatTime = this.nextBeatTime;
            this.nextBeatTime = this.lastBeatTime + this.beatInterval;
            this.openLoopBeats++;
            this.beatConfidence *= 0.92;
            isBeat = true;
        }

        const canSnap = activation >= BEAT_SNAP_THRESHOLD;
        const nextBeatDistance = Math.abs(time - this.nextBeatTime);
        const lastBeatDistance = Math.abs(time - this.lastBeatTime);
        const snappedToPrediction = canSnap && nextBeatDistance <= snapWindow;
        const snappedToEmittedBeat = canSnap && isBeat && lastBeatDistance <= snapWindow;
        const shouldReanchor = activation >= BEAT_ANCHOR_THRESHOLD
            && this.beatConfidence < 0.35
            && Math.abs(time - this.nextBeatTime) <= reanchorWindow;

        if (snappedToPrediction || snappedToEmittedBeat || shouldReanchor) {
            this.lastBeatTime = time;
            this.nextBeatTime = time + this.beatInterval;
            this.openLoopBeats = 0;
            this.beatConfidence = Math.min(
                1,
                this.beatConfidence * 0.75 + Math.max(0.4, bpmWeight) * 0.58
            );
            isBeat = true;
        } else {
            this.beatConfidence = Math.max(
                0,
                this.beatConfidence * 0.998 - this.openLoopBeats * 0.004
            );
        }

        const secondsSinceLastBeat = Math.max(0, time - this.lastBeatTime);
        const secondsToNextBeat = Math.max(0, this.nextBeatTime - time);
        const phaseRatio = this.beatInterval > 0
            ? (secondsSinceLastBeat % this.beatInterval) / this.beatInterval
            : 0;

        return {
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

    private anchor(
        time: number,
        bpmWeight: number
    ): Omit<BeatAnalysis, 'bpm'> {
        this.lastBeatTime = time;
        this.nextBeatTime = time + this.beatInterval;
        this.beatConfidence = Math.max(0.45, Math.min(1, bpmWeight));
        this.openLoopBeats = 0;

        return {
            beatPhase: 0,
            isBeat: true,
            beatConfidence: this.beatConfidence,
            secondsSinceLastBeat: 0,
            secondsToNextBeat: this.beatInterval,
            beatInterval: this.beatInterval,
            lastBeatTime: this.lastBeatTime,
            nextBeatTime: this.nextBeatTime
        };
    }

    private clampWindow(value: number, min: number, max: number): number {
        return Math.max(min, Math.min(max, value));
    }

}
