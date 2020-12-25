/**
 * @author D.Thiele @https://hexx.one
 * 
 * @license
 * Copyright (c) 2020 D.Thiele All rights reserved.  
 * Licensed under the GNU GENERAL PUBLIC LICENSE.
 * See LICENSE file in the project root for full license information.  
 * 
 * @description
 * Wallaper Engine Audio Supplier worker.
 */


 //////////////////////////
 //     CUSTOM API
 //////////////////////////

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

 //////////////////////////
 //     Main Program
 //////////////////////////

const DAT_LEN: i32 = 128;
const HLF_LEN: i32 = 64;
const QRT_LEN: i32 = 32;

const pNoise = [1.1760367470305, 0.85207379418243, 0.68842437227852, 0.63767902570829,
    0.5452348949654, 0.50723325864167, 0.4677726234682, 0.44204182748767, 0.41956517802157,
    0.41517375040002, 0.41312118577934, 0.40618363960446, 0.39913707474975, 0.38207008614508,
    0.38329789106488, 0.37472136606245, 0.36586428412968, 0.37603017335105, 0.39762590761573,
    0.39391828858591, 0.37930603769622, 0.39433365764563, 0.38511504613859, 0.39082579241834,
    0.3811852720504, 0.40231453727161, 0.40244151133175, 0.39965366884521, 0.39761103827545,
    0.51136400422212, 0.66151212038954, 0.66312205226679, 0.7416276690995, 0.74614971301133,
    0.84797007577483, 0.8573583910469, 0.96382997811663, 0.99819377577185, 1.0628692615814,
    1.1059083969751, 1.1819808497335, 1.257092297208, 1.3226521464753, 1.3735992532905,
    1.4953223705889, 1.5310064942373, 1.6193923584808, 1.7094805527135, 1.7706604552218,
    1.8491987941428, 1.9238418849406, 2.0141596921333, 2.0786429508827, 2.1575522518646,
    2.2196355526005, 2.2660112509705, 2.320762171749, 2.3574848254513, 2.3986127976537,
    2.4043566176474, 2.4280476777842, 2.3917477397336, 2.4032522546622, 2.3614180150678];
const pinkNoise = new Float64Array(HLF_LEN);
pinkNoise.set(pNoise);


// correct pink noise for first and second half
function correctPinkNoise(data: Float64Array): void {
    var correct = new Float64Array(DAT_LEN);
    for (var i = 0; i < HLF_LEN; i++) {
        correct[i] = data[i] / pinkNoise[i];
        correct[HLF_LEN + i] = data[HLF_LEN + i] / pinkNoise[i];
    }
    data.set(correct);
}

// merge first and second half into full range
function stereoToMono(data: Float64Array): void {
    var mono = new Float64Array(DAT_LEN);
    var mIdx = 0;
    for (var i = 0; i < HLF_LEN; i++) {
        mono[mIdx++] = data[i];
        mono[mIdx++] = data[HLF_LEN + i];
    }
    data.set(mono);
}

// switch front with back in first half
function invertFirst(data: Float64Array): void {
    for (var i = 0; i < QRT_LEN; i++) {
        var a = data[i];
        data[i] = data[HLF_LEN - 1 - i];
        data[HLF_LEN - 1 - i] = a;
    }
}

// switch front with back in second half
function invertSecond(data: Float64Array): void {
    for (var i = 0; i < QRT_LEN; i++) {
        var b = data[HLF_LEN + i];
        data[HLF_LEN + i] = data[DAT_LEN - 1 - i];
        data[DAT_LEN - 1 - i] = b;
    }
}

// switch front with back in full range
function invertAll(data: Float64Array): void {
    for (var i = 0; i < HLF_LEN; i++) {
        var a = data[i];
        data[i] = data[DAT_LEN - 1 - i];
        data[DAT_LEN - 1 - i] = a;
    }
}

// filter peaks for full range
function peakFilter(array: Float64Array, amount: f64): void {
    var oldMax: f64 = 0;
    var newMax: f64 = 0;
    var newArray = new Float64Array(DAT_LEN);
    var i = 0;
    // pow this shit
    for (; i < DAT_LEN; i++) {
        if (array[i] > oldMax) oldMax = array[i];
        newArray[i] = Math.pow(array[i] * amount, amount) as f64;
        if (newArray[i] > newMax) newMax = newArray[i];
    }
    // re-scale & apply
    var divide: f64 = newMax / oldMax;
    for (i = 0; i < DAT_LEN; i++)
        array[i] = newArray[i] / divide;
}

// smooth values for full range
function smoothArray(array: Float64Array, steps: i32): void {
    var newArray = new Float64Array(DAT_LEN);
    // make smoothed array
    for (var outer = 0; outer < DAT_LEN; outer++) {
        var sum: f64 = 0;
        for (var inner = outer - steps; inner <= outer + steps; inner++) {
            var idx = inner;
            if (idx < 0) idx += DAT_LEN;
            sum += array[idx % DAT_LEN];
        }
        newArray[outer] = sum / (((steps * 2) + 1) as f64);
    }
    array.set(newArray);
}

// function will apply setting-defined data smoothing
function applyValueLeveling(curr: Float64Array, prev: Float64Array, inc: f64, dec: f64): void {
    for (var i = 0; i < DAT_LEN; i++) {
        var diff: f64 = curr[i] - prev[i];
        var mlt: f64 = 100 - (diff > 0 ? inc : dec);
        curr[i] -= diff * mlt / 100;
    }
}

// THEW INPUT VALUE TO WRITE TO
export const inputData = new Float64Array(DAT_LEN);
inputData.fill(0.0);

// this will hold the current processed audio data
// either:  B-H  |  H-B  |  HL-BL-BR-HR  |  BL-HL-HR-BR
// where ( B=bass, H=high, L=left, R=right )
// in range > 0.0 and ~< 1.5
export const outputData = new Float64Array(DAT_LEN);
outputData.fill(0.0);

// this will hold the current processed properties:
export const audioProps = new Float64Array(10);
audioProps.fill(0.0);

// this will hold the current processing settings
export const audioSettings = new Float64Array(11);
audioSettings.fill(0.0);


// check helper
function isOn(a: f64): boolean {
    return a > 0;
}

// this will update and process new data
export function update(): void {

    // fix pink noise?
    if (isOn(audioSettings[0]))
        correctPinkNoise(inputData);

    // write botch channels to mono
    if (isOn(audioSettings[1]))
        stereoToMono(inputData);

    if (isOn(audioSettings[2])) {
        // flipped high & low mapping
        if (isOn(audioSettings[1]))
            // flip whole range
            invertAll(inputData);
        else {
            // only flip first half of stereo
            invertFirst(inputData);
        }
    }
    else {
        // normal high & low mapping
        if (isOn(audioSettings[1])) {
            // only flip the second half of the data
            invertSecond(inputData);
        }
    }

    // process peaks?
    if (isOn(audioSettings[3]))
        peakFilter(inputData, audioSettings[3] + 1);

    // smooth data?
    if (isOn(audioSettings[4]))
        smoothArray(inputData, Math.floor(audioSettings[4]) as i32);

    //logF64Array(inputData);
    //logF64Array(outputData);

    // process with last data
    applyValueLeveling(inputData, outputData,
            audioSettings[5],
            audioSettings[6]);

    // process current frequency data and previous if given
    var sum: f64 = 0,
        min: f64 = 1,
        max: f64 = 0,
        bass: f64 = 0,
        mids: f64 = 0,
        peaks: f64 = 0;

    for (var indx = 0; indx < DAT_LEN; indx++) {
        // parse current freq value
        var idata: f64 = inputData[indx];
        // process min max value
        if (idata < min) min = idata;
        if (idata > max) max = idata;
        // process ranges
        if (indx < (42 / 3)) bass += idata * audioSettings[9];
        else if (indx > 69) peaks += idata * audioSettings[7]; 
        else mids += idata * audioSettings[8]; 
        // calc peak average
        sum += idata;
    }

    // calc average with previous entry
    var average: f64 = sum / (DAT_LEN as f64);
    var silent: f64 = (max < audioSettings[10] / 1000) ? 0.9999 : 0.00;
    var intensity: f64 = (bass * 8 - mids + peaks) / 6 / average;
    var range: f64 = max - min;

    // Apply Data
    outputData.set(inputData);
    audioProps.set([bass,mids,peaks,sum,min,max,average,range,silent,intensity])
    // DONE
}
