/**
 * @author hexxone / https://hexx.one
 *
 * @license
 * Copyright (c) 2024 hexxone All rights reserved.
 * Licensed under the GNU GENERAL PUBLIC LICENSE.
 * See LICENSE file in the project root for full license information.
 *
 * @description
 * Wallaper Engine Audio Supplier worker.
 */

/// ///////////////////////
//     CUSTOM API
/// ///////////////////////

/*
@external("env", "logf")
declare function logf(value: f64): void;

@external("env", "logi")
declare function logi(value: u32): void;

@external("env", "logU32Array")
declare function logU32Array(arr: Uint32Array): void;

@external("env", "logF64Array")
declare function logF64Array(arr: Float64Array): void;

export function allocF64Array(length: i32): Float64Array {
  return new Float64Array(length);
}

export function allocU32Array(length: i32): Uint32Array {
  return new Uint32Array(length);
}

@inline
function deallocArray<T>(arr: T[]): void {
    memory.free(changetype<usize>(arr.buffer_));
    memory.free(changetype<usize>(arr));
}
*/

/// ///////////////////////
//     Main Program
/// ///////////////////////

const DAT_LEN: i32 = 128;
const HLF_LEN: i32 = 64;
const QRT_LEN: i32 = 32;

const pNoise = [
    0.97609734030594,
    0.85207379418243,
    0.68842437227852,
    0.63767902570829,
    0.5452348949654,
    0.50723325864167,
    0.4677726234682,
    0.44204182748767,
    0.41956517802157,
    0.41517375040002,
    0.41312118577934,
    0.40618363960446,
    0.39913707474975,
    0.38207008614508,
    0.38329789106488,
    0.37472136606245,
    0.36586428412968,
    0.37603017335105,
    0.39762590761573,
    0.39391828858591,
    0.37930603769622,
    0.39433365764563,
    0.38511504613859,
    0.39082579241834,
    0.3811852720504,
    0.40231453727161,
    0.40244151133175,
    0.39965366884521,
    0.39761103827545,
    0.51136400422212,
    0.66151212038954,
    0.66312205226679,
    0.7416276690995,
    0.74614971301133,
    0.84797007577483,
    0.8573583910469,
    0.96382997811663,
    1.09819377577185,
    1.1628692615814,
    1.2059083969751,
    1.2819808497335,
    1.357092297208,
    1.3726521464753,
    1.3735992532905,
    1.4953223705889,
    1.5310064942373,
    1.6193923584808,
    1.7094805527135,
    1.7706604552218,
    1.8491987941428,
    1.9238418849406,
    2.0141596921333,
    2.0786429508827,
    2.1575522518646,
    2.2196355526005,
    2.2660112509705,
    2.320762171749,
    2.3574848254513,
    2.3986127976537,
    2.4043566176474,
    2.4280476777842,
    2.3917477397336,
    2.4032522546622,
    2.3614180150678
];

const pinkNoise = new Float64Array(HLF_LEN);

pinkNoise.set(pNoise);

const tempArr = new Float64Array(DAT_LEN);

let i: i32 = 0;
let indx: i32 = 0;
let tmpI: i32 = 0;

let tmpF: f64 = 0;
let oldMax: f64 = 0;
let newMax: f64 = 0;
let sum: f64 = 0;
let min: f64 = 1;
let max: f64 = 0;
let bass: f64 = 0;
let mids: f64 = 0;
let peaks: f64 = 0;
let diff: f64 = 0;
let mlt: f64 = 0;
let average: f64 = 0;
let silent: f64 = 1;
let intensity: f64 = 0;
let range: f64 = 0;

// correct pink noise for first and second half
function correctPinkNoise(data: Float64Array): void {
    for (i = 0; i < HLF_LEN; i++) {
        tempArr[i] = data[i] / pinkNoise[i];
        tempArr[HLF_LEN + i] = data[HLF_LEN + i] / pinkNoise[i];
    }
    data.set(tempArr);
}

// merge first and second half into full range
function stereoToMono(data: Float64Array): void {
    tmpI = 0;
    for (i = 0; i < HLF_LEN; i++) {
        tempArr[tmpI++] = data[i];
        tempArr[tmpI++] = data[HLF_LEN + i];
    }
    data.set(tempArr);
}

// switch front with back in first half
function invertFirst(data: Float64Array): void {
    for (i = 0; i < QRT_LEN; i++) {
        tmpF = data[i];
        data[i] = data[HLF_LEN - 1 - i];
        data[HLF_LEN - 1 - i] = tmpF;
    }
}

// switch front with back in second half
function invertSecond(data: Float64Array): void {
    for (i = 0; i < QRT_LEN; i++) {
        tmpF = data[HLF_LEN + i];
        data[HLF_LEN + i] = data[DAT_LEN - 1 - i];
        data[DAT_LEN - 1 - i] = tmpF;
    }
}

// switch front with back in full range
function invertAll(data: Float64Array): void {
    for (i = 0; i < HLF_LEN; i++) {
        tmpF = data[i];
        data[i] = data[DAT_LEN - 1 - i];
        data[DAT_LEN - 1 - i] = tmpF;
    }
}

let emult: f64;

// function for processing actual change
function equalizePeaks(array: Float64Array): void {
    oldMax = 0.001;
    newMax = 0.001;

    for (i = 0; i < DAT_LEN; i++) {
        // get old max
        if (array[i] > oldMax) {
            oldMax = array[i];
        }

        // peak edging
        if (array[i] >= peakData[i]) {
            peakData[i] = array[i];
            peakStrength[i] = 16;
            // min is less worth now
            minStrength[i] /= 2;
        } else if (peakStrength[i] < 1) {
            // peak decrementing if too weak
            peakData[i] *= 0.97;
        } else {
            peakStrength[i] -= peakData[i] - array[i];
        }

        // min edging
        if (array[i] <= minData[i]) {
            minData[i] = array[i] * 0.9;
            minStrength[i] = 8;
        } else if (minStrength[i] < 1) {
            // min incrementing if too weak
            minData[i] *= 1.01;
        } else {
            minStrength[i] -= array[i] - minData[i];
        }

        // calculate anti dynamics -> high frequencies = more
        tmpF = 0.3 + ((i as f64) / (DAT_LEN as f64)) * 0.2;

        // scale equalize
        emult = (array[i] - minData[i]) / (peakData[i] - minData[i]);
        array[i]
            = array[i] * (1.0 - tmpF)
            + (emult < 0 ? 0 : emult > 1.2 ? 1.2 : emult) * tmpF;

        // new max
        if (array[i] > newMax) {
            newMax = array[i];
        }
    }

    // re-scale & apply
    tmpF = newMax / oldMax;
    for (i = 0; i < DAT_LEN; i++) {
        array[i] = tempArr[i] / tmpF;
    }

    smoothArray(peakData, 1);
    smoothArray(minData, 1);
}

// filter peaks for full range
function peakFilter(array: Float64Array, amount: f64): void {
    oldMax = 0.001;
    newMax = 0.001;
    // pow this shit
    for (i = 0; i < DAT_LEN; i++) {
        if (array[i] > oldMax) {
            oldMax = array[i];
        }
        tempArr[i] = ((array[i] * amount) ** amount) as f64;
        if (tempArr[i] > newMax) {
            newMax = tempArr[i];
        }
    }
    // re-scale & apply
    tmpF = newMax / oldMax;
    for (i = 0; i < DAT_LEN; i++) {
        array[i] = tempArr[i] / tmpF;
    }
}

// smooth values for full range
function smoothArray(array: Float64Array, steps: i32): void {
    // make smoothed array
    for (i = 0; i < DAT_LEN; i++) {
        tmpF = 0.001;
        for (let inner = i - steps; inner <= i + steps; inner++) {
            let idx = inner;

            if (idx < 0) {
                idx = 0;
            }
            if (idx >= DAT_LEN) {
                idx = DAT_LEN - 1;
            }
            tmpF += array[idx];
        }
        tempArr[i] = tmpF / ((steps * 2 + 1) as f64);
    }
    array.set(tempArr);
}

// function will apply setting-defined data smoothing
function applyValueLeveling(
    curr: Float64Array,
    prev: Float64Array,
    inc: f64,
    dec: f64
): void {
    for (i = 0; i < DAT_LEN; i++) {
        diff = curr[i] - prev[i];
        mlt = 100 - (diff > 0 ? inc : dec);
        curr[i] -= (diff * mlt) / 100;
    }
}

// check helper
function isOn(a: f64): boolean {
    return a > 0;
}

// INPUT AUDIO DATA
export const inputData = new Float64Array(DAT_LEN);

// working data
const workData = new Float64Array(DAT_LEN);

// equalize helper
const peakData = new Float64Array(DAT_LEN);
const peakStrength = new Float64Array(DAT_LEN);
const minData = new Float64Array(DAT_LEN);
const minStrength = new Float64Array(DAT_LEN);

// PROCESSED AUDIO DATA
// either:  B-H  |  H-B  |  HL-BL-BR-HR  |  BL-HL-HR-BR
// where ( B=bass, H=high, L=left, R=right )
// in range > 0.0 and ~< 1.5
export const outputData = new Float64Array(DAT_LEN);

// processed properties:
export const audioProps = new Float64Array(10);

// processing settings
export const audioSettings = new Float64Array(11);

// this will update and process new data
export function update(): void {
    // reset minimum data
    if (isOn(silent)) {
        peakData.fill(0.0);
        peakStrength.fill(8.0);
        minData.fill(1.0);
        minStrength.fill(8.0);
    }

    // copy the input data to a working buffer
    // so the input could be updated in the meantime
    workData.set(inputData);

    // equalize disabled, correct pink noise instead
    if (!isOn(audioSettings[0])) {
        correctPinkNoise(workData);
    }

    // write both channels to mono
    if (isOn(audioSettings[1])) {
        stereoToMono(workData);
    }

    // highs in front/center
    if (isOn(audioSettings[2])) {
        // flip mono range
        if (isOn(audioSettings[1])) {
            invertAll(workData);
        } else {
            invertSecond(workData);
        }
    } else if (!isOn(audioSettings[1])) {
        // bass in front/center
        // flip stereo range
        invertFirst(workData);
    }

    // dynamic equalize
    if (isOn(audioSettings[0])) {
        equalizePeaks(workData);
    }

    // process peaks?
    if (isOn(audioSettings[3])) {
        peakFilter(workData, audioSettings[3] + 1);
    }

    // smooth data?
    if (isOn(audioSettings[4])) {
        smoothArray(workData, Math.floor(audioSettings[4]) as i32);
    }

    // process with last data
    if (audioSettings[5] < 100 || audioSettings[6] < 100) {
        applyValueLeveling(
            workData,
            outputData,
            audioSettings[5],
            audioSettings[6]
        );
    }

    // process current frequency data
    sum = 0;
    max = 0;
    bass = 0;
    mids = 0;
    peaks = 0;
    min = 1;

    for (indx = 0; indx < DAT_LEN; indx++) {
        // parse current freq value
        tmpF = workData[indx];
        // process min max value
        if (tmpF < min) {
            min = tmpF;
        }
        if (tmpF > max) {
            max = tmpF;
        }
        // process ranges
        if (indx < 16) {
            bass += tmpF * audioSettings[9];
        } else if (indx > 69) {
            peaks += tmpF * audioSettings[7];
        } else {
            mids += tmpF * audioSettings[8];
        }
        // calc peak average
        sum += tmpF;
    }

    // calc average with previous entry
    average = (sum + 0.01) / (DAT_LEN as f64);
    silent = max < audioSettings[10] / 1000 ? 1 : 0;

    intensity = ((bass * 8 - mids + peaks) / 4) * average;
    for (indx = 0; indx < DAT_LEN; indx++) {
        if (workData[indx] > average) {
            intensity += (workData[indx] - average) * 0.5;
        }
    }

    range = max - min;

    // Apply Data
    outputData.set(workData);
    audioProps[0] = bass;
    audioProps[1] = mids;
    audioProps[2] = peaks;
    audioProps[3] = sum;
    audioProps[4] = min;
    audioProps[5] = max;
    audioProps[6] = average;
    audioProps[7] = range;
    audioProps[8] = silent;
    audioProps[9] = intensity;

    // DONE
}
