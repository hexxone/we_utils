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
 * Wallpaper Engine Audio Supplier makes working with audio easier.
 * It will automatically start to receive and process the audio data
 * which can then be accessed on the global object.
 * 
 * DEPENDS ON:
 * - jQuery (window loaded event)
 * - Wallpaper Engine Web Wallpaper environment
 * - audio-processing supported web wallpaper...
 * 
*/

import { ASUtil } from "@assemblyscript/loader";
import { CComponent } from "../CComponent";
import { CSettings } from "../CSettings";
import { Ready } from "../Ready";
import { Smallog } from "../Smallog";

import WascInit from '../wasc-worker';

const DAT_LEN = 128;

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
	// use low latency audio?
	low_latency: boolean = false;
}

enum Sett {
	equalize = 0,
	mono_audio = 1,
	audio_direction = 2,
	peak_filter = 3,
	value_smoothing = 4,
	audio_increase = 5,
	audio_decrease = 6,
	treble_multiplier = 7,
	mids_multiplier = 8,
	bass_multiplier = 9,
	minimum_volume = 10,
}

enum Props {
	bass = 0,
	mids = 1,
	highs = 2,
	sum = 3,
	min = 4,
	max = 5,
	average = 6,
	range = 7,
	silent = 8,
	intensity = 9
}

export class WEAS extends CComponent {

	// last processed audio object
	public lastAudio = null;

	// settings object
	public settings: WEASettings = new WEASettings();

	// create transfer buffer
	private inBuff = new Float64Array(DAT_LEN);

	// web assembly functions
	private weasModule: any = null;

	constructor() {
		super();
		// delay audio initialization
		Ready().then(() => this.realInit());
	}

	private async realInit() {
		// if wallpaper engine context given, listen
		if (!window['wallpaperRegisterAudioListener']) {
			Smallog.Info("'window.wallpaperRegisterAudioListener' not given!");
			return;
		}

		var self = this;

		this.weasModule = await WascInit('WEAS.wasm', {}, !this.settings.low_latency);
		const { run } = this.weasModule;

		// pass settings to module
		await this.UpdateSettings();

		// register audio callback on module
		window['wallpaperRegisterAudioListener'](async audioArray => {
			// check proof
			if (!audioArray || !this.settings.audioprocessing) return;
			if (audioArray.length != DAT_LEN) {
				Smallog.Error("audioListener: received invalid audio data array. Length: " + audioArray.length);
				return;
			}

			// prepare data
			const start = performance.now();
			this.inBuff.set(audioArray);

			// WRAP IN isolated Function ran inside worker
			run(({ module, instance, importObject, params }) => {
				const { exports } = instance;
				const { data } = params[0];
				const io = importObject as ASUtil;

				// set audio data directly in module memory
				io.__getFloat64ArrayView(exports.inputData).set(data);
				// trigger processing processing 
				exports.update();
				// get copy of updated Data & Properties
				return {
					data: new Float64Array(io.__getFloat64ArrayView(exports.outputData)),
					props: new Float64Array(io.__getFloat64ArrayView(exports.audioProps)),
				}
			}, {
				// params passed to worker
				data: this.inBuff
			}).then((result) => {
				// worker result, back in main context
				const { data, props } = result;
				// apply actual last Data from worker
				self.lastAudio = {
					time: start,
					data,
					...this.getProps(props)
				};
				// print info
				Smallog.Debug("Got Data from Worker! Time= " + (performance.now() - start) + ", Data= " + JSON.stringify(data));
			});
		});
	}

	// converts calculated output property number-array to string-associative-array
	private getProps(dProps: ArrayLike<number>) {
		var keys = Object.keys(Props);
		keys = keys.slice(keys.length / 2);
		var res = {};
		for (var index = 0; index < keys.length; index++) {
			const key = keys[index];
			res[key] = dProps[Props[key]];
		}
		return res;
	}

	// CAVEAT: only available after init and module load
	public UpdateSettings(): Promise<void> {
		if (!this.weasModule) return;
		const { run } = this.weasModule;

		var keys = Object.keys(Sett);
		keys = keys.slice(keys.length / 2);
		const sett = new Float64Array(keys.length);
		for (let index = 0; index < keys.length; index++) {
			const key = keys[index];
			sett[Sett[key]] = this.settings[key] || 0;
		}

		// WRAP IN isolated Function ran inside worker
		return run(({ module, instance, importObject, params }) => {
			const { exports } = instance;
			const { data } = params[0];
			const io = importObject as ASUtil;
			io.__getFloat64ArrayView(exports.audioSettings).set(data);
		}, {
			// Data passed to worker
			data: sett
		}).then(() => {
			Smallog.Debug("Sent Settings to WEAS: " + JSON.stringify(sett));
		});
	}

	/**
	 * return false if:
	 * - processing is disabled
	 * - there is no data
	 * - the data is silent
	 * - data is too old (> 3
	 */
	public hasAudio() {
		return this.settings.audioprocessing
			&& this.lastAudio && this.lastAudio.silent == 0
			&& (performance.now() / 1000 - this.lastAudio.time < 3);
	}
}