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
 * @todo
 * - use worker run instead of multiple messages
 * 
*/

import { CComponent } from "../CComponent";
import { CSettings } from "../CSettings";
import { Ready } from "../Ready";
import { Smallog } from "../Smallog";

import wascModule from '../wasc-worker';

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

	// web assembly functions
	private run: any = null;

	constructor() {
		super();
		// delay audio initialization
		Ready.On(() => this.realInit());
	}

	private realInit() {
		// if wallpaper engine context given, listen
		if (!window['wallpaperRegisterAudioListener']) {
			Smallog.Info("'window.wallpaperRegisterAudioListener' not given!");
			return;
		}

		var self = this;

		wascModule('WEAS.wasm', {}, false)
			.then(r => {
				// save module context
				console.log(r);
				const { module, instance, exports, run } = r as any;
				this.run = run

				const inBuff = new Float64Array(DAT_LEN);

				// pass settings to module
				this.updateSettings();

				// register audio callback on module
				window['wallpaperRegisterAudioListener'](async audioArray => {
					// check proof
					if (!audioArray) return;
					if (audioArray.length != DAT_LEN) {
						Smallog.Error("audioListener: received invalid audio data array. Length: " + audioArray.length);
						return;
					}

					// prepare Transfer object
					const start = performance.now();
					inBuff.set(audioArray);

					// WRAP UPDATE IN RUN
					this.run(
						// isolated Function ran inside worker
						({ module, instance, importObject, params }) => {
							const { exports } = instance;
							const { data } = params[0];

							console.debug("Send Data to Worker: " + JSON.stringify(data));

							// apply data to module memory
							const transfer = importObject.__getFloat64ArrayView(exports.inputData);
							transfer.set(data);
							// actual audio data processing 
							exports.update();

							// get updates Data & Properties
							return {
								data: importObject.__getFloat64ArrayView(exports.outputData),
								props: importObject.__getFloat64ArrayView(exports.audioProps),
							}
						},
						// Data passed to worker
						{
							data: inBuff
						})
						.then(
							// worker result, back in main context
							(result) => {
								const { data, props } = result;
								// apply actual last Data from worker
								self.lastAudio = {
									time: start,
									data,
									...this.getProps(props) // @TODO make props to Props mapping
								};

								// print info
								Smallog.Debug("Got Data from Worker! Time= " + (performance.now() - start) + ", Data= " + JSON.stringify(data));

							}
						);
				});

			}).catch(ex => Smallog.Error(JSON.stringify(ex)));
	}

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
	public async updateSettings() {
		if (!this.run) return;
		const start = performance.now();

		var keys = Object.keys(Sett);
		keys = keys.slice(keys.length / 2);
		const sett = new Float64Array(keys.length);
		for (let index = 0; index < keys.length; index++) {
			const key = keys[index];
			sett[Sett[key]] = this.settings[key] || 0;
		}

		// WRAP IN RUN
		this.run(
			// isolated Function ran inside worker
			({ module, instance, importObject, params }) => {
				const { exports } = instance;
				const { data } = params[0];

				const transfer = importObject.__getFloat64ArrayView(exports.audioSettings);
				transfer.set(data);

				console.debug("Send Settings to Worker: " + JSON.stringify(data));
			},
			// Data passed to worker
			{
				data: sett
			});
	}

	public hasAudio() {
		// return false if there is no data or its invalid due to time (> 3s old)
		return this.lastAudio && !this.lastAudio.silent &&
			(performance.now() / 1000 - this.lastAudio.time < 3);
	}
}