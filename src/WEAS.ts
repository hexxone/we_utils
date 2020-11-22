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

import { CComponent } from "./CComponent";
import { CSettings } from "./CSettings";
import { Smallog } from "./Smallog";

export class WEASettings extends CSettings {
	audioprocessing: boolean = true;
	// do pink-noise processing?
	equalize: boolean = true;
	// convert to mono?
	mono_audio: boolean = true;
	// invert low & high freqs?
	audio_direction: number = 0;
	// peak filtering
	peak_filter: number = 1;
	// neighbour-smoothing value
	value_smoothing: number = 2;
	// time-value smoothing ratio
	audio_increase: number = 75;
	audio_decrease: number = 35;
	// multipliers
	treble_multiplier: number = 0.5;
	mids_multiplier: number = 0.75;
	bass_multiplier: number = 1.8;
	// ignore value leveling for "silent" data
	minimum_volume: number = 0.005;
}

export class WEAS extends CComponent {

	// audio processing worker
	private weasWorker = null;

	// last processed audio object
	public lastAudio = null;

	// settings object
	public settings: WEASettings = null;

	constructor(settings: WEASettings = new WEASettings()) {
		super();
		this.settings = settings;

		// if wallpaper engine context given, listen
		if (!window['wallpaperRegisterAudioListener']) {
			Smallog.Info("'window.wallpaperRegisterAudioListener' not given!");
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
			Smallog.Error("weas error: [" + e.filename + ", Line: " + e.lineno + "] " + e.message);
		}, true);

		// intialize wallpaper engine audio listener when laoded
		$(() => window['wallpaperRegisterAudioListener']((audioArray) => {
			// check proof
			if (!audioArray) return;
			if (audioArray.length != 128) {
				Smallog.Error("audioListener: received invalid audio data array. Length: " + audioArray.length);
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

	hasAudio() {
		// return false if there is no data or its invalid due to time (> 3s old)
		return this.lastAudio && !this.lastAudio.silent &&
			(performance.now() / 1000 - this.lastAudio.time < 3);
	}
}