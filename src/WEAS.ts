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
import { Ready } from "./Ready";
import { Smallog } from "./Smallog";

import WEASWorker from 'worker-loader!./WEASWorker';

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
	private weasWorker: WEASWorker = null;

	// last processed audio object
	public lastAudio = null;

	// settings object
	public settings: WEASettings = new WEASettings();

	constructor() {
		super();
		// delay audio initialization for some time
		Ready.On(() => {
			setTimeout(() => this.realInit(), 3000);
		});
	}

	private realInit() {
		// if wallpaper engine context given, listen
		if (!['wallpaperRegisterAudioListener']) {
			Smallog.Info("'window.wallpaperRegisterAudioListener' not given!");
			return;
		}

		// initialize web worker
		this.weasWorker = new WEASWorker();

		var self = this;
		// worker event data
		this.weasWorker.onmessage = (e) => {
			e.data.data = new Float32Array(e.data.data);
			self.lastAudio = e.data;
			Smallog.Debug("Got Data from Worker: " + JSON.stringify(e.data));
		};

		// worker Error
		this.weasWorker.onerror = (e) => {
			Smallog.Error("weas error: [" + e.filename + ", Line: " + e.lineno + "] " + e.message);
		};

		window['wallpaperRegisterAudioListener']((audioArray) => {
			// check proof
			if (!audioArray) return;
			if (audioArray.length != 128) {
				Smallog.Error("audioListener: received invalid audio data array. Length: " + audioArray.length);
				return;
			}
			let audBuff = new Float32Array(audioArray);

			Smallog.Debug("Sent Data to Worker: " + JSON.stringify(audioArray));
			// post web worker task
			this.weasWorker.postMessage({
				settings: this.GetSettingsObj(),
				last: this.lastAudio,
				audio: audBuff.buffer
			}, [audBuff.buffer]);
		});
	}

	hasAudio() {
		// return false if there is no data or its invalid due to time (> 3s old)
		return this.lastAudio && !this.lastAudio.silent &&
			(performance.now() / 1000 - this.lastAudio.time < 3);
	}
}