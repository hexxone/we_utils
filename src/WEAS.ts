/**
 * @author D.Thiele @https://hexx.one
 *
 * @license
 * Copyright (c) 2020 D.Thiele All rights reserved.  
 * Licensed under the GNU GENERAL PUBLIC LICENSE.
 * See LICENSE file in the project root for full license information.  
 * 
 * @description
 * WEWWA
 * Wallpaper Engine Audio Supplier
 * 
 * DEPENDS ON:
 * - "./worker/weasWorker.js"
 * - jQuery (window loaded event)
 * - Wallpaper Engine Web Wallpaper environment
 * - audio-processing supported wallpaper...
 * 
 * This is an aditional JS file to be included in any Wallpaper Engine
 * Web-Wallpaper project to make working with audio easier.
 * It will automatically start to receive and process the audio data
 * which can then be accessed on the global object.
 * 
*/

export class WEAS {

	// has currently valid audio data stored?
	hasAudio() {
		// return false if there is no data or its invalid due to time (> 3s old)
		return this.lastAudio && !this.lastAudio.silent &&
			(performance.now() / 1000 - this.lastAudio.time < 3);
	}
	// audio processing worker
	weasWorker = null;

	// last processed audio object
	lastAudio = null;

	// settings object
	settings = {
		audioprocessing: true,
		// do pink-noise processing?
		equalize: true,
		// convert to mono?
		mono_audio: true,
		// invert low & high freqs?
		audio_direction: 0,
		// peak filtering
		peak_filter: 1,
		// neighbour-smoothing value
		value_smoothing: 2,
		// time-value smoothing ratio
		audio_increase: 75,
		audio_decrease: 35,
		// multipliers
		treble_multiplier: 0.5,
		mids_multiplier: 0.75,
		bass_multiplier: 1.8,
		// ignore value leveling for "silent" data
		minimum_volume: 0.005,
	}

	constructor() {
		// if wallpaper engine context given, listen
		if (!window['wallpaperRegisterAudioListener']) {
			console.log("'window.wallpaperRegisterAudioListener' not given!");
			return;
		}
		
		// initialize web worker
		this.weasWorker = new Worker('./js/worker/weasWorker.js');

		// worker event data
		this.weasWorker.addEventListener("message", (e) => {
			e.data.data = new Float64Array(e.data.data);
			this.lastAudio = e.data;
		}, true);

		// worker Error
		this.weasWorker.addEventListener("error", (e) => {
			console.log("weas error: [" + e.filename + ", Line: " + e.lineno + "] " + e.message);
		}, true);

		// intialize wallpaper engine audio listener when laoded
		$(() => window['wallpaperRegisterAudioListener']((audioArray) => {
			// check proof
			if (!audioArray) return;
			if (audioArray.length != 128) {
				console.log("audioListener: received invalid audio data array. Length: " + audioArray.length);
				return;
			}
			let audBuff = new Float64Array(audioArray);
			// post web worker task
			this.weasWorker.postMessage({
				settings: this.settings,
				last: this.lastAudio,
				audio: audBuff.buffer
			}, [audBuff.buffer]);
		}));
	}
}