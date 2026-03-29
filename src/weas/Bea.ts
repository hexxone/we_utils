/* eslint-disable guard-for-in */

/*
 * BeatDetektor.js
 *
 * BeatDetektor - CubicFX Visualizer Beat Detection & Analysis Algorithm
 * Javascript port by Charles J. Cliffe and Corban Brook
 *
 * Copyright (c) 2009 Charles J. Cliffe.
 *
 * BeatDetektor is distributed under the terms of the MIT License.
 * http://opensource.org/licenses/MIT
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 */

/**
 * @public
 */
type TempoCandidate = {
    value: number;
    score: number;
};

const WEAS_STEREO_BINS = 64;
const WEAS_SPECTRUM_BINS = WEAS_STEREO_BINS * 2;
const DEFAULT_FRAME_RATE = 30;
const MIN_BPM = 55;
const MAX_BPM = 190;
const BPM_FAMILY_FLOOR = 70;
const BPM_FAMILY_CEIL = 180;
const HISTORY_SECONDS = 8;
const MIN_ANALYSIS_SECONDS = 3;
const SILENCE_HOLD_SECONDS = 2.5;

export class BeaTs {

    private monoSpectrum = new Float64Array(WEAS_STEREO_BINS);
    private previousSpectrum = new Float64Array(WEAS_STEREO_BINS);
    private onsetHistory: number[] = [];
    private lastTime = 0;
    private fps = DEFAULT_FRAME_RATE;
    private onsetMean = 0;
    private onsetDeviation = 0.02;
    private stableBpm = 0;
    private stableWeight = 0;
    private silentSeconds = 0;
    private autoReset = true;

    /**
     * Construct realtime BPM tracker.
     * @param {boolean} autoReset stfu
     */
    constructor(autoReset = true) {
        this.autoReset = autoReset;
    }

    private resetState(): void {
        this.onsetHistory = [];
        this.previousSpectrum.fill(0);
        this.lastTime = 0;
        this.fps = DEFAULT_FRAME_RATE;
        this.onsetMean = 0;
        this.onsetDeviation = 0.02;
        this.stableBpm = 0;
        this.stableWeight = 0;
        this.silentSeconds = 0;
    }

    private sanitizeSample(value: number): number {
        if (!Number.isFinite(value) || value <= 0) {
            return 0;
        }

        return Math.min(value, 1.5);
    }

    private normalizeBpmFamily(value: number, anchor = 0): number {
        let bpm = value;
        const familyAnchor = anchor > 0 ? anchor : 120;

        while (bpm < familyAnchor * 0.67) {
            bpm *= 2;
        }
        while (bpm > familyAnchor * 1.5) {
            bpm /= 2;
        }
        while (bpm < BPM_FAMILY_FLOOR) {
            bpm *= 2;
        }
        while (bpm > BPM_FAMILY_CEIL) {
            bpm /= 2;
        }

        return bpm;
    }

    private extractMonoSpectrum(data: ArrayLike<number>): number {
        let energy = 0;

        for (let i = 0; i < WEAS_STEREO_BINS; i++) {
            // Wallpaper Engine exposes 64 left bins followed by 64 right bins.
            const left = this.sanitizeSample(data[i]);
            const right = this.sanitizeSample(data[WEAS_STEREO_BINS + i]);
            const mono = (left + right) * 0.5;

            this.monoSpectrum[i] = Math.log1p(mono * 8);
            energy += mono;
        }

        return energy / WEAS_STEREO_BINS;
    }

    private computeOnsetStrength(): number {
        let flux = 0;
        let totalWeight = 0;

        for (let i = 0; i < WEAS_STEREO_BINS; i++) {
            const current = this.monoSpectrum[i];
            const previous = this.previousSpectrum[i];
            const diff = current - previous;
            const weight = i < 8
                ? 1.35
                : i < 24
                    ? 1.0
                    : i < 40
                        ? 0.45
                        : 0.15;

            if (diff > 0) {
                flux += diff * weight;
            }
            totalWeight += weight;
        }

        const rawFlux = totalWeight > 0 ? flux / totalWeight : 0;
        const baseline = this.onsetMean;
        const spread = this.onsetDeviation;

        this.onsetMean += (rawFlux - this.onsetMean) * 0.08;
        this.onsetDeviation += (Math.abs(rawFlux - baseline) - this.onsetDeviation) * 0.08;

        const normalized = Math.max(0, rawFlux - baseline * 0.92)
            / Math.max(0.02, spread * 3);

        return Math.min(normalized, 4);
    }

    private pushOnset(value: number): void {
        this.onsetHistory.push(value);

        const historySize = Math.max(
            Math.round(this.fps * HISTORY_SECONDS),
            Math.round(DEFAULT_FRAME_RATE * HISTORY_SECONDS)
        );

        while (this.onsetHistory.length > historySize) {
            this.onsetHistory.shift();
        }
    }

    private autoCorrelation(history: number[], lag: number): number {
        let sum = 0;

        for (let i = lag; i < history.length; i++) {
            sum += history[i] * history[i - lag];
        }

        return sum;
    }

    private estimateCandidates(): TempoCandidate[] {
        const analysisFrames = Math.min(
            this.onsetHistory.length,
            Math.round(this.fps * HISTORY_SECONDS)
        );
        const history = this.onsetHistory.slice(-analysisFrames);

        if (history.length < Math.round(this.fps * MIN_ANALYSIS_SECONDS)) {
            return [];
        }

        const mean = history.reduce((sum, value) => {
            return sum + value;
        }, 0) / history.length;

        for (let i = 0; i < history.length; i++) {
            history[i] = Math.max(0, history[i] - mean * 0.35);
        }

        const minLag = Math.max(2, Math.round((this.fps * 60) / MAX_BPM));
        const maxLag = Math.min(
            history.length - 2,
            Math.round((this.fps * 60) / MIN_BPM)
        );

        if (maxLag <= minLag) {
            return [];
        }

        const lagScores: number[] = [];

        for (let lag = minLag; lag <= maxLag; lag++) {
            lagScores[lag] = this.autoCorrelation(history, lag);
        }

        const grouped = new Map<number, number>();
        const continuityAnchor = this.stableBpm > 0 ? this.stableBpm : 120;

        for (let lag = minLag; lag <= maxLag; lag++) {
            const baseScore = lagScores[lag] || 0;

            if (baseScore <= 0) {
                continue;
            }

            const neighborhood = baseScore * 0.6
                + (lagScores[lag - 1] || 0) * 0.2
                + (lagScores[lag + 1] || 0) * 0.2;
            const doubleLag = lag * 2;
            const halfLag = Math.max(2, Math.round(lag / 2));
            let score = neighborhood + (lagScores[doubleLag] || 0) * 0.35;

            score -= (lagScores[halfLag] || 0) * 0.15;

            let bpm = (60 * this.fps) / lag;

            bpm = this.normalizeBpmFamily(bpm, continuityAnchor);

            if (this.stableBpm > 0) {
                const distance = Math.abs(bpm - this.stableBpm) / this.stableBpm;

                score *= 1 + Math.max(0, 0.2 - distance) * 1.5;
            }

            const bucket = Math.round(bpm * 2) / 2;

            grouped.set(bucket, (grouped.get(bucket) || 0) + score);
        }

        return Array.from(grouped.entries())
            .map(([value, score]) => {
                return {
                    value,
                    score
                };
            })
            .filter((candidate) => {
                return Number.isFinite(candidate.score) && candidate.score > 0;
            })
            .sort((a, b) => {
                return b.score - a.score;
            })
            .slice(0, 6);
    }

    private buildOutput(candidates: TempoCandidate[]): { value: number; weight: number }[] {
        if (!candidates.length) {
            if (this.stableBpm <= 0 || this.stableWeight < 0.2) {
                return [];
            }

            return [{
                value: this.stableBpm,
                weight: this.stableWeight
            }];
        }

        const bestScore = candidates[0].score || 1;
        const result = [];

        if (this.stableBpm > 0 && this.stableWeight > 0.2) {
            result.push({
                value: this.stableBpm,
                weight: this.stableWeight
            });
        }

        for (let i = 0; i < candidates.length && result.length < 3; i++) {
            const bpm = this.stableBpm > 0
                ? this.normalizeBpmFamily(candidates[i].value, this.stableBpm)
                : candidates[i].value;

            if (result.some((entry) => {
                return Math.abs(entry.value - bpm) < 0.75;
            })) {
                continue;
            }

            result.push({
                value: bpm,
                weight: Math.max(0, Math.min(1, candidates[i].score / bestScore))
            });
        }

        return result;
    }

    /**
     * Bpm-Process current data
     * @param {number} time timestamp as float
     * @param {Array<number>} data fftData
     * @returns {Array<Object>}
     * @returns {void}
     * @public
     */
    public process(time, data) {
        if (
            !Array.isArray(data)
            && !(data instanceof Float32Array)
            && !(data instanceof Float64Array)
        ) {
            return [];
        }

        if (data.length < WEAS_SPECTRUM_BINS || !Number.isFinite(time)) {
            return [];
        }

        if (this.lastTime > 0) {
            const delta = time - this.lastTime;

            if (delta <= 0 || delta > 1.5) {
                this.resetState();
            } else {
                const frameRate = 1 / delta;

                this.fps += (frameRate - this.fps) * 0.15;
                this.fps = Math.max(15, Math.min(90, this.fps));
            }
        }

        this.lastTime = time;

        const energy = this.extractMonoSpectrum(data);
        const onset = this.computeOnsetStrength();

        this.previousSpectrum.set(this.monoSpectrum);
        this.pushOnset(onset);

        if (energy < 0.01 && onset < 0.18) {
            this.silentSeconds += 1 / this.fps;
            this.stableWeight *= 0.96;

            if (this.autoReset && this.silentSeconds > SILENCE_HOLD_SECONDS) {
                this.resetState();

                return [];
            }

            return this.buildOutput([]);
        }

        this.silentSeconds = 0;

        const candidates = this.estimateCandidates();

        if (!candidates.length) {
            this.stableWeight *= 0.985;

            return this.buildOutput([]);
        }

        const best = candidates[0];
        const secondScore = candidates[1]?.score || 0;
        const dominance = best.score > 0
            ? (best.score - secondScore) / best.score
            : 0;
        const alignedBpm = this.stableBpm > 0
            ? this.normalizeBpmFamily(best.value, this.stableBpm)
            : best.value;

        if (this.stableBpm <= 0) {
            this.stableBpm = alignedBpm;
            this.stableWeight = Math.max(0.35, Math.min(1, 0.5 + dominance));
        } else {
            const drift = Math.abs(alignedBpm - this.stableBpm) / this.stableBpm;
            const shouldAdopt = dominance > 0.14
                || drift < 0.08
                || this.stableWeight < 0.35;

            if (shouldAdopt) {
                const smoothing = dominance > 0.2 ? 0.22 : 0.1;

                this.stableBpm += (alignedBpm - this.stableBpm) * smoothing;
                this.stableWeight = Math.min(
                    1,
                    this.stableWeight * 0.7 + (0.35 + dominance) * 0.5
                );
            } else {
                this.stableWeight *= 0.98;
            }
        }

        return this.buildOutput(candidates);
    }

}

/**
BeatDetektor class

Theory:

Trigger detection is performed using a trail of moving averages,
The FFT input is broken up into 128 ranges and averaged, each range has two moving
averages that tail each other at a rate of (1.0 / BD_DETECTION_RATE) seconds.

Each time the moving average for a range exceeds it's own tailing average by:

(moving_average[range] * BD_DETECTION_FACTOR >= moving_average[range])

if this is true there's a rising edge and a detection is flagged for that range.
Next a trigger gap test is performed between rising edges and timestamp recorded.

If the gap is larger than our BPM window (in seconds) then we can discard it and
reset the timestamp for a new detection -- but only after checking to see if it's a
reasonable match for 2* the current detection in case it's only triggered every
other beat. Gaps that are lower than the BPM window are ignored and the last
timestamp will not be reset.

Gaps that are within a reasonable window are run through a quality stage to determine
how 'close' they are to that channel's current prediction and are incremented or
decremented by a weighted value depending on accuracy. Repeated hits of low accuracy
will still move a value towards erroneous detection but it's quality will be lowered
and will not be eligible for the gap time quality draft.

Once quality has been assigned ranges are reviewed for good match candidates and if
BD_MINIMUM_CONTRIBUTIONS or more ranges achieve a decent ratio (with a factor of BD_QUALITY_TOLERANCE)
of contribution to the overall quality we take them into the
contest round.  Note that the contest round  won't run on a given process() call if
the total quality achieved does not meet or exceed BD_QUALITY_TOLERANCE.
Each time through if a select draft of BPM ranges has achieved a reasonable quality
above others it's awarded a value in the BPM contest.  The BPM contest is a hash
array indexed by an integer BPM value, each draft winner is awarded BD_QUALITY_REWARD.
Finally the BPM contest is examined to determine a leader and all contest entries
are normalized to a total value of BD_FINISH_LINE, whichever range is closest to
BD_FINISH_LINE at any given point is considered to be the best guess however waiting
until a minimum contest winning value of about 20.0-25.0 will provide more accurate
results.  Note that the 20-25 rule may vary with lower and higher input ranges.
A winning value that exceeds 40 or hovers around 60 (the finish line) is pretty much
a guaranteed match.
Configuration Kernel Notes:
The majority of the ratios and values have been reverse-engineered from my own
observation and visualization of information from various aspects of the detection
triggers; so not all parameters have a perfect definition nor perhaps the best value yet.
However despite this it performs very well; I had expected several more layers
before a reasonable detection would be achieved. Comments for these parameters will be
updated as analysis of their direct effect is explored.
Input Restrictions:
bpm_maximum must be within the range of (bpm_minimum*2)-1
i.e. minimum of 50 must have a maximum of 99 because 50*2 = 100
Changelog:
01/17/2010 - Charles J. Cliffe
- Tested and tweaked default kernel values for tighter detection
- Added BeatDetektor.config_48_95, BeatDetektor.config_90_179 and BeatDetektor.config_150_280 for more refined detection ranges
- Updated unit test to include new range config example
02/21/2010 - Charles J. Cliffe
- Fixed numerous bugs and divide by 0 on 1% match causing poor accuracy
- Re-worked the quality calulations, accuracy improved 8-10x
- Primary value is now a fractional reading (*10, just divide by 10), added win_bpm_int_lo for integral readings
- Added feedback loop for current_bpm to help back-up low quality channels
- Unified range configs, now single default should be fine
- Extended quality reward 'funnel'
10/07/2021 - hexxone
- Convert to TypeScript

* @public
*/
// eslint-disable-next-line @typescript-eslint/no-unused-vars
class BeatsDetektor {

    config = {
        BD_DETECTION_RANGES: 128, // How many ranges to quantize the FFT into
        BD_DETECTION_RATE: 12.0, // Rate in 1.0 / BD_DETECTION_RATE seconds
        BD_DETECTION_FACTOR: 0.915, // Trigger ratio
        BD_QUALITY_DECAY: 0.5, // range and contest decay
        BD_QUALITY_TOLERANCE: 0.96, // Use the top x % of contest results
        BD_QUALITY_REWARD: 10.0, // Award weight
        BD_QUALITY_STEP: 0.1, // Award step (roaming speed)
        BD_MINIMUM_CONTRIBUTIONS: 8, // At least x ranges must agree to process a result
        BD_FINISH_LINE: 60.0, // Contest values wil be normalized to this finish line
        // this is the 'funnel' that pulls ranges in / out of alignment based on trigger detection
        BD_REWARD_TOLERANCES: [
            0.001, 0.005, 0.01, 0.02, 0.04, 0.08, 0.1, 0.15, 0.3
        ], // .1%, .5%, 1%, 2%, 4%, 8%, 10%, 15%
        BD_REWARD_MULTIPLIERS: [
            20.0,
            10.0,
            8.0,
            1.0,
            1.0 / 2.0,
            1.0 / 4.0,
            1.0 / 8.0,
            1 / 16.0,
            1 / 32.0
        ]
    };

    BPM_MIN: any;
    BPM_MAX: any;

    beat_counter = 0;
    half_counter = 0;
    quarter_counter = 0;

    a_freq_range: Float64Array;
    ma_freq_range: Float64Array;
    maa_freq_range: Float64Array;

    last_detection: Float64Array;

    ma_bpm_range: Float64Array;
    maa_bpm_range: Float64Array;

    detection_quality: Float64Array;
    detection: Array<boolean>;

    ma_quality_avg = 0;
    ma_quality_total = 0;

    bpm_contest: number[];
    bpm_contest_lo: number[];

    quality_total = 0;
    quality_avg = 0;

    current_bpm = 0;
    current_bpm_lo = 0;
    winning_bpm = 0;
    win_val = 0;
    winning_bpm_lo = 0;
    win_val_lo = 0;

    win_bpm_int = 0;
    win_bpm_int_lo = 0;

    bpm_predict = 0;
    is_erratic = false;

    bpm_offset = 0;

    last_timer = 0;
    last_update = 0;
    bpm_timer = 0;
    maa_quality_avg = 0;

    /**
     * Create new instance of BeatsDetektor. See above for details
     * @param {number} bpm_minimum estimation lower bound
     * @param {number} bpm_maximum estimation upper bound
     * @param {Object} alt_config alternative config (optional)
     * @public
     */
    constructor(bpm_minimum = 85, bpm_maximum = 169, alt_config?) {
        if (alt_config) {
            this.config = alt_config;
        }

        this.BPM_MIN = bpm_minimum;
        this.BPM_MAX = bpm_maximum;

        // current average (this sample) for range n
        this.a_freq_range = new Float64Array(this.config.BD_DETECTION_RANGES);
        // moving average of frequency range n
        this.ma_freq_range = new Float64Array(this.config.BD_DETECTION_RANGES);
        // moving average of moving average of frequency range n
        this.maa_freq_range = new Float64Array(this.config.BD_DETECTION_RANGES);
        // timestamp of last detection for frequecy range n
        this.last_detection = new Float64Array(this.config.BD_DETECTION_RANGES);

        // moving average of gap lengths
        this.ma_bpm_range = new Float64Array(this.config.BD_DETECTION_RANGES);
        // moving average of moving average of gap lengths
        this.maa_bpm_range = new Float64Array(this.config.BD_DETECTION_RANGES);

        // range n quality attribute, good match  = quality+, bad match  = quality-, min  = 0
        this.detection_quality = new Float64Array(
            this.config.BD_DETECTION_RANGES
        );

        // current trigger state for range n
        this.detection = new Array<boolean>(this.config.BD_DETECTION_RANGES);

        this.reset();

        if (console) {
            console.debug(
                `BeatDetektor(${this.BPM_MIN},${this.BPM_MAX}) created.`
            );
        }
    }

    /**
     * Null everthing
     * @public
     * @returns {void}
     */
    public reset() {
        //    var bpm_avg = 60.0/((this.BPM_MIN+this.BPM_MAX)/2.0);

        for (let i = 0; i < this.config.BD_DETECTION_RANGES; i++) {
            this.a_freq_range[i] = 0.0;
            this.ma_freq_range[i] = 0.0;
            this.maa_freq_range[i] = 0.0;
            this.last_detection[i] = 0.0;

            this.ma_bpm_range[i] = this.maa_bpm_range[i]
                = 60.0 / this.BPM_MIN
                + (60.0 / this.BPM_MAX - 60.0 / this.BPM_MIN)
                    * (i / this.config.BD_DETECTION_RANGES);

            this.detection_quality[i] = 0.0;
            this.detection[i] = false;
        }

        this.ma_quality_avg = 0;
        this.ma_quality_total = 0;

        this.bpm_contest = [];
        this.bpm_contest_lo = [];

        this.quality_total = 0.0;
        this.quality_avg = 0.0;

        this.current_bpm = 0.0;
        this.current_bpm_lo = 0.0;

        this.winning_bpm = 0.0;
        this.win_val = 0.0;
        this.winning_bpm_lo = 0.0;
        this.win_val_lo = 0.0;

        this.win_bpm_int = 0;
        this.win_bpm_int_lo = 0;

        this.bpm_predict = 0;

        this.is_erratic = false;
        this.bpm_offset = 0.0;
        this.last_timer = 0.0;
        this.last_update = 0.0;

        this.bpm_timer = 0.0;
        this.beat_counter = 0;
        this.half_counter = 0;
        this.quarter_counter = 0;
    }

    /**
     * Process BPM for fft Data Frame
     * @param {number} timer_seconds current time seconds in float
     * @param {Array<number>} fft_data from audio-analyser
     * @returns {number} win_bpm_int
     * @public
     */
    public process(timer_seconds, fft_data): number {
        // first call
        if (!this.last_timer) {
            this.last_timer = timer_seconds;

            return;
        }
        // ignore 0 start time
        if (this.last_timer > timer_seconds) {
            this.reset();

            return;
        }

        const timestamp = timer_seconds;

        this.last_update = timer_seconds - this.last_timer;
        this.last_timer = timer_seconds;

        // reset after 3 second silence
        if (this.last_update > 3.0) {
            this.reset();

            return;
        }

        let i: number;
        let x: number;
        let v: number;

        const bpm_floor = 60.0 / this.BPM_MAX;
        const bpm_ceil = 60.0 / this.BPM_MIN;

        const range_step = fft_data.length / this.config.BD_DETECTION_RANGES;
        let range = 0;

        for (x = 0; x < fft_data.length; x += range_step) {
            this.a_freq_range[range] = 0;

            // accumulate frequency values for this range
            for (i = x; i < x + range_step; i++) {
                v = Math.abs(fft_data[i]);
                this.a_freq_range[range] += v;
            }

            // average for range
            this.a_freq_range[range] /= range_step;

            // two sets of averages chase this one at a

            // moving average, increment closer to a_freq_range at a rate of 1.0 / BD_DETECTION_RATE seconds
            this.ma_freq_range[range]
                -= (this.ma_freq_range[range] - this.a_freq_range[range])
                * this.last_update
                * this.config.BD_DETECTION_RATE;
            // moving average of moving average, increment closer to this.ma_freq_range at a rate of 1.0 / BD_DETECTION_RATE seconds
            this.maa_freq_range[range]
                -= (this.maa_freq_range[range] - this.ma_freq_range[range])
                * this.last_update
                * this.config.BD_DETECTION_RATE;

            // if closest moving average peaks above trailing (with a tolerance of BD_DETECTION_FACTOR) then trigger a detection for this range
            const det
                = this.ma_freq_range[range] * this.config.BD_DETECTION_FACTOR
                >= this.maa_freq_range[range];

            // compute bpm clamps for comparison to gap lengths

            // clamp detection averages to input ranges
            if (this.ma_bpm_range[range] > bpm_ceil) {
                this.ma_bpm_range[range] = bpm_ceil;
            }
            if (this.ma_bpm_range[range] < bpm_floor) {
                this.ma_bpm_range[range] = bpm_floor;
            }
            if (this.maa_bpm_range[range] > bpm_ceil) {
                this.maa_bpm_range[range] = bpm_ceil;
            }
            if (this.maa_bpm_range[range] < bpm_floor) {
                this.maa_bpm_range[range] = bpm_floor;
            }

            let rewarded = false;

            // new detection since last, test it's quality
            if (!this.detection[range] && det) {
                // calculate length of gap (since start of last trigger)
                let trigger_gap = timestamp - this.last_detection[range];

                // trigger falls within acceptable range,
                if (trigger_gap < bpm_ceil && trigger_gap > bpm_floor) {
                    // compute gap and award quality

                    // use our tolerances as a funnel to edge detection towards the most likely value
                    for (
                        i = 0;
                        i < this.config.BD_REWARD_TOLERANCES.length;
                        i++
                    ) {
                        if (
                            Math.abs(this.ma_bpm_range[range] - trigger_gap)
                            < this.ma_bpm_range[range]
                                * this.config.BD_REWARD_TOLERANCES[i]
                        ) {
                            this.detection_quality[range]
                                += this.config.BD_QUALITY_REWARD
                                * this.config.BD_REWARD_MULTIPLIERS[i];
                            rewarded = true;
                        }
                    }

                    if (rewarded) {
                        this.last_detection[range] = timestamp;
                    }
                } else if (trigger_gap >= bpm_ceil) {
                    // low quality, gap exceeds maximum time
                    // start a new gap test, next gap is guaranteed to be longer

                    // test for 1/2 beat
                    trigger_gap /= 2.0;

                    if (trigger_gap < bpm_ceil && trigger_gap > bpm_floor) {
                        for (
                            i = 0;
                            i < this.config.BD_REWARD_TOLERANCES.length;
                            i++
                        ) {
                            if (
                                Math.abs(
                                    this.ma_bpm_range[range] - trigger_gap
                                )
                                < this.ma_bpm_range[range]
                                    * this.config.BD_REWARD_TOLERANCES[i]
                            ) {
                                this.detection_quality[range]
                                    += this.config.BD_QUALITY_REWARD
                                    * this.config.BD_REWARD_MULTIPLIERS[i];
                                rewarded = true;
                            }
                        }
                    }

                    // decrement quality if no 1/2 beat reward
                    if (!rewarded) {
                        trigger_gap *= 2.0;
                    }
                    this.last_detection[range] = timestamp;
                }

                if (rewarded) {
                    let qmp
                        = (this.detection_quality[range] / this.quality_avg)
                        * this.config.BD_QUALITY_STEP;

                    if (qmp > 1.0) {
                        qmp = 1.0;
                    }

                    this.ma_bpm_range[range]
                        -= (this.ma_bpm_range[range] - trigger_gap) * qmp;
                    this.maa_bpm_range[range]
                        -= (this.maa_bpm_range[range] - this.ma_bpm_range[range])
                        * qmp;
                } else if (
                    trigger_gap >= bpm_floor
                    && trigger_gap <= bpm_ceil
                ) {
                    if (
                        this.detection_quality[range]
                            < this.quality_avg
                                * this.config.BD_QUALITY_TOLERANCE
                        && this.current_bpm
                    ) {
                        this.ma_bpm_range[range]
                            -= (this.ma_bpm_range[range] - trigger_gap)
                            * this.config.BD_QUALITY_STEP;
                        this.maa_bpm_range[range]
                            -= (this.maa_bpm_range[range]
                                - this.ma_bpm_range[range])
                            * this.config.BD_QUALITY_STEP;
                    }
                    this.detection_quality[range]
                        -= this.config.BD_QUALITY_STEP;
                } else if (trigger_gap >= bpm_ceil) {
                    if (
                        this.detection_quality[range]
                            < this.quality_avg
                                * this.config.BD_QUALITY_TOLERANCE
                        && this.current_bpm
                    ) {
                        this.ma_bpm_range[range]
                            -= (this.ma_bpm_range[range] - this.current_bpm) * 0.5;
                        this.maa_bpm_range[range]
                            -= (this.maa_bpm_range[range]
                                - this.ma_bpm_range[range])
                            * 0.5;
                    }
                    this.detection_quality[range]
                        -= this.config.BD_QUALITY_STEP;
                }
            }

            if (
                (!rewarded
                    && timestamp - this.last_detection[range] > bpm_ceil)
                || (det
                    && Math.abs(this.ma_bpm_range[range] - this.current_bpm)
                        > this.bpm_offset)
            ) {
                this.detection_quality[range]
                    -= this.detection_quality[range]
                    * this.config.BD_QUALITY_STEP
                    * this.config.BD_QUALITY_DECAY
                    * this.last_update;
            }

            // quality bottomed out, set to 0
            if (this.detection_quality[range] < 0.001) {
                this.detection_quality[range] = 0.001;
            }

            this.detection[range] = det;

            range++;
        }

        // total contribution weight
        this.quality_total = 0;

        // total of bpm values
        let bpm_total = 0;
        // number of bpm ranges that contributed to this test
        let bpm_contributions = 0;

        // accumulate quality weight total
        for (let x = 0; x < this.config.BD_DETECTION_RANGES; x++) {
            this.quality_total += this.detection_quality[x];
        }

        this.quality_avg = this.quality_total / this.config.BD_DETECTION_RANGES;

        if (this.quality_total) {
            // determine the average weight of each quality range
            this.ma_quality_avg
                += ((this.quality_avg - this.ma_quality_avg)
                    * this.last_update
                    * this.config.BD_DETECTION_RATE)
                / 2.0;

            this.maa_quality_avg
                += (this.ma_quality_avg - this.maa_quality_avg) * this.last_update;
            this.ma_quality_total
                += ((this.quality_total - this.ma_quality_total)
                    * this.last_update
                    * this.config.BD_DETECTION_RATE)
                / 2.0;

            this.ma_quality_avg
                -= 0.98 * this.ma_quality_avg * this.last_update * 3.0;
        } else {
            this.quality_avg = 0.001;
        }

        if (this.ma_quality_total <= 0) {
            this.ma_quality_total = 0.001;
        }
        if (this.ma_quality_avg <= 0) {
            this.ma_quality_avg = 0.001;
        }

        let avg_bpm_offset = 0.0;
        let offset_test_bpm = this.current_bpm;
        const draft: number[] = [];

        if (this.quality_avg) {
            for (x = 0; x < this.config.BD_DETECTION_RANGES; x++) {
                // if this detection range weight*tolerance is higher than the average weight then add it's moving average contribution
                if (
                    this.detection_quality[x]
                        * this.config.BD_QUALITY_TOLERANCE
                    >= this.ma_quality_avg
                ) {
                    if (
                        this.ma_bpm_range[x] < bpm_ceil
                        && this.ma_bpm_range[x] > bpm_floor
                    ) {
                        // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
                        bpm_total += this.maa_bpm_range[x];

                        let draft_float = Math.round(
                            (60.0 / this.maa_bpm_range[x]) * 1000.0
                        );

                        draft_float
                            = Math.abs(
                                Math.ceil(draft_float)
                                    - (60.0 / this.current_bpm) * 1000.0
                            )
                            < Math.abs(
                                Math.floor(draft_float)
                                    - (60.0 / this.current_bpm) * 1000.0
                            )
                                ? Math.ceil(draft_float / 10.0)
                                : Math.floor(draft_float / 10.0);

                        const draft_int = parseInt((draft_float / 10.0) as any);

                        //    if (draft_int) console.log(draft_int);
                        if (isNaN(draft[draft_int])) {
                            draft[draft_int] = 0;
                        }

                        draft[draft_int]
                            += this.detection_quality[x] / this.quality_avg;
                        bpm_contributions++;
                        if (offset_test_bpm === 0.0) {
                            offset_test_bpm = this.maa_bpm_range[x];
                        } else {
                            avg_bpm_offset += Math.abs(
                                offset_test_bpm - this.maa_bpm_range[x]
                            );
                        }
                    }
                }
            }
        }

        // if we have one or more contributions that pass criteria then attempt to display a guess
        const has_prediction
            = bpm_contributions >= this.config.BD_MINIMUM_CONTRIBUTIONS;

        let draft_winner = 0;
        let win_val = 0;

        if (has_prediction) {
            for (const draft_i in draft) {
                if (draft[draft_i] > win_val) {
                    win_val = draft[draft_i];
                    draft_winner = parseInt(draft_i);
                }
            }

            this.bpm_predict = 60.0 / (draft_winner / 10.0);

            avg_bpm_offset /= bpm_contributions;
            this.bpm_offset = avg_bpm_offset;

            if (!this.current_bpm) {
                this.current_bpm = this.bpm_predict;
            }
        }

        if (this.current_bpm && this.bpm_predict) {
            this.current_bpm
                -= (this.current_bpm - this.bpm_predict) * this.last_update;
        }

        // hold a contest for bpm to find the current mode
        let contest_max = 0;

        for (const contest_i in this.bpm_contest) {
            if (contest_max < this.bpm_contest[contest_i]) {
                contest_max = this.bpm_contest[contest_i];
            }
            if (
                this.bpm_contest[contest_i]
                > this.config.BD_FINISH_LINE / 2.0
            ) {
                const draft_int_lo = parseInt(
                    Math.round((contest_i as any) / 10.0) as any
                );

                if (isNaN(this.bpm_contest_lo[draft_int_lo])) {
                    this.bpm_contest_lo[draft_int_lo] = 0;
                }
                this.bpm_contest_lo[draft_int_lo]
                    += (this.bpm_contest[contest_i] / 6.0) * this.last_update;
            }
        }

        // normalize to a finish line
        if (contest_max > this.config.BD_FINISH_LINE) {
            for (const contest_i in this.bpm_contest) {
                this.bpm_contest[contest_i]
                    = (this.bpm_contest[contest_i] / contest_max)
                    * this.config.BD_FINISH_LINE;
            }
        }

        contest_max = 0;
        for (const contest_i in this.bpm_contest_lo) {
            if (contest_max < this.bpm_contest_lo[contest_i]) {
                contest_max = this.bpm_contest_lo[contest_i];
            }
        }

        // normalize to a finish line
        if (contest_max > this.config.BD_FINISH_LINE) {
            for (const contest_i in this.bpm_contest_lo) {
                this.bpm_contest_lo[contest_i]
                    = (this.bpm_contest_lo[contest_i] / contest_max)
                    * this.config.BD_FINISH_LINE;
            }
        }

        // decay contest values from last loop
        for (const contest_i in this.bpm_contest) {
            this.bpm_contest[contest_i]
                -= this.bpm_contest[contest_i]
                * (this.last_update / this.config.BD_DETECTION_RATE);
        }

        // decay contest values from last loop
        for (const contest_i in this.bpm_contest_lo) {
            this.bpm_contest_lo[contest_i]
                -= this.bpm_contest_lo[contest_i]
                * (this.last_update / this.config.BD_DETECTION_RATE);
        }

        this.bpm_timer += this.last_update;

        let winner;
        let winner_lo;

        // attempt to display the beat at the beat interval ;)
        if (this.bpm_timer > this.winning_bpm / 4.0 && this.current_bpm) {
            this.win_val = 0;
            this.win_val_lo = 0;

            if (this.winning_bpm) {
                while (this.bpm_timer > this.winning_bpm / 4.0) {
                    this.bpm_timer -= this.winning_bpm / 4.0;
                }
            }

            // increment beat counter
            this.quarter_counter++;
            this.half_counter = Math.floor(this.quarter_counter / 2);
            this.beat_counter = Math.floor(this.quarter_counter / 4);

            // award the winner of this iteration
            const idx = Math.floor(
                Math.round((60.0 / this.current_bpm) * 10.0)
            );

            if (isNaN(this.bpm_contest[idx])) {
                this.bpm_contest[idx] = 0;
            }
            this.bpm_contest[idx] += this.config.BD_QUALITY_REWARD;

            // find the overall winner so far
            for (const contest_i in this.bpm_contest) {
                if (this.win_val < this.bpm_contest[contest_i]) {
                    winner = contest_i;
                    this.win_val = this.bpm_contest[contest_i];
                }
            }

            if (winner) {
                this.win_bpm_int = parseInt(winner);
                this.winning_bpm = 60.0 / (winner / 10.0);
            }

            // find the overall winner so far
            for (const contest_i in this.bpm_contest_lo) {
                if (this.win_val_lo < this.bpm_contest_lo[contest_i]) {
                    winner_lo = contest_i;
                    this.win_val_lo = this.bpm_contest_lo[contest_i];
                }
            }

            if (winner_lo) {
                this.win_bpm_int_lo = parseInt(winner_lo);
                this.winning_bpm_lo = 60.0 / winner_lo;
            }

            if (console && this.beat_counter % 4 === 0) {
                // console.log(`Bea.ts(${this.BPM_MIN}, ${this.BPM_MAX}): [ Current Estimate: ${winner} BPM ] [ Time: ${Math.floor(timer_seconds*1000.0)/1000.0}s, Quality: ${Math.floor(this.quality_total*1000.0)/1000.0}, Rank: ${Math.floor(this.win_val*1000.0)/1000.0}, Jitter: ${Math.floor(this.bpm_offset*1000000.0)/1000000.0} ]`);
            }
        }

        return this.win_bpm_int;
    }

}

/**
 * simple bass kick visualizer assistant module
 * @public
 */
// class BeatsKick {
//     is_kick = false;

//     /**
//     * Post-Process current Detektor frame and check for kick
//     * @param {BeatsDetektor} det
//     * @returns {boolean}
//     */
//     process(det: BeatsDetektor) {
//         return this.is_kick = ((det.detection[0] && det.detection[1]) || (det.ma_freq_range[0]/det.maa_freq_range[0])>1.4);
//     }

//     /**
//     * @returns {boolean} last kick status
//     */
//     isKick() {
//         return this.is_kick;
//     }
// }

/**
 * simple vu spectrum visualizer assistant module
 */
// class BeatSpect {
//     vu_levels = [];

//     /**
//     * Post-Process current Detektor frame
//     * @param {BeatsDetektor} det
//     * @param {number} lus last update time (optional)
//     */
//     process(det: BeatsDetektor, lus?) {
//         let i; let det_val; let det_max = 0.0;
//         if (isNaN(lus)) lus = det.last_update;

//         for (i = 0; i < det.config.BD_DETECTION_RANGES; i++) {
//             det_val = (det.ma_freq_range[i]/det.maa_freq_range[i]);
//             if (det_val > det_max) det_max = det_val;
//         }

//         if (det_max <= 0) det_max = 1.0;

//         for (i = 0; i < det.config.BD_DETECTION_RANGES; i++) {
//             det_val = (det.ma_freq_range[i]/det.maa_freq_range[i]); // fabs(fftData[i*2]/2.0);

//             if (det_val != det_val) det_val = 0;

//             // && (det_val > this.vu_levels[i])
//             if (det_val>1.0) {
//                 det_val -= 1.0;
//                 if (det_val>1.0) det_val = 1.0;

//                 if (det_val > this.vu_levels[i]) {
//                     this.vu_levels[i] = det_val;
//                 } else if (det.current_bpm) this.vu_levels[i] -= (this.vu_levels[i]-det_val)*lus*(1.0/det.current_bpm)*3.0;
//             } else {
//                 if (det.current_bpm) this.vu_levels[i] -= (lus/det.current_bpm)*2.0;
//             }

//             if (this.vu_levels[i] < 0 || this.vu_levels[i] != this.vu_levels[i]) this.vu_levels[i] = 0;
//         }
//     }

//     /**
//     * returns vu level for BD_DETECTION_RANGES range[x]
//     * @param {number} x
//     * @returns {number}
//     */
//     getLevel(x) {
//         return this.vu_levels[x];
//     }
// }
