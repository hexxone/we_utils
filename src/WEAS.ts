/**
* @author hexxone / https://hexx.one
*
* @license
* Copyright (c) 2021 hexxone All rights reserved.
* Licensed under the GNU GENERAL PUBLIC LICENSE.
* See LICENSE file in the project root for full license information.
*/

import {CComponent} from './CComponent';
import {CSettings} from './CSettings';
import {waitReady} from './Util';
import {Smallog} from './Smallog';

import wascWorker from './wasc-worker/WascWorker';
import {WascInterface} from './wasc-worker/WascInterface';

const DAT_LEN = 128;

/**
* Audio processing settings
* @extends {CSettings}
*/
export class WEASettings extends CSettings {
	/** do audio processing? */
	public audioprocessing: boolean = true;
	// do pink-noise processing?
	public equalize: boolean = true;
	// convert to mono?
	public mono_audio: boolean = true;
	// invert low & high freqs?
	public audio_direction: number = 0;
	// peak filtering
	public peak_filter: number = 1;
	// neighbour-smoothing value
	public value_smoothing: number = 2;
	// time-value smoothing ratio
	public audio_increase: number = 75;
	public audio_decrease: number = 35;
	// multipliers
	public treble_multiplier: number = 0.5;
	public mids_multiplier: number = 0.75;
	public bass_multiplier: number = 1.8;
	// ignore value leveling for "silent" data
	public minimum_volume: number = 0.005;
	// use low latency audio?
	public low_latency: boolean = false;
}

const SettIDs = {
	equalize: 0,
	mono_audio: 1,
	audio_direction: 2,
	peak_filter: 3,
	value_smoothing: 4,
	audio_increase: 5,
	audio_decrease: 6,
	treble_multiplier: 7,
	mids_multiplier: 8,
	bass_multiplier: 9,
	minimum_volume: 10,
};

const PropIDs = {
	bass: 0,
	mids: 1,
	highs: 2,
	sum: 3,
	min: 4,
	max: 5,
	average: 6,
	range: 7,
	silent: 8,
	intensity: 9,
};

/**
* WEAS
* <br/>
* Wallpaper Engine Audio Supplier makes working with audio easier.
* <br/>
* It will automatically start to receive and process the audio data
* which can then be accessed on the global object.
* <br/>
* DEPENDS ON:
* <br/>
* - Wallpaper Engine Web Wallpaper environment
* <br/>
* - audio-processing supported web wallpaper
* @extends {CComponent}
*/
export class WEAS extends CComponent {
	// last processed audio object
	public lastAudio = null;

	// settings object
	public settings: WEASettings = new WEASettings();

	// create transfer buffer
	private inBuff = new Float64Array(DAT_LEN);

	// web assembly functions
	private weasModule: WascInterface = null;

	/**
	* delay audio initialization until page ready
	*/
	constructor() {
		super();
		waitReady().then(() => this.realInit());
	}

	/**
	* initializes audio processing pipeline
	* and starts listening on audio data
	* @ignore
	*/
	private async realInit() {
		// if wallpaper engine context given, listen
		if (!window['wallpaperRegisterAudioListener']) {
			Smallog.info('\'window.wallpaperRegisterAudioListener\' not given!');
			return;
		}

		this.weasModule = await wascWorker('WEAS.wasm', {}, !this.settings.low_latency);
		const {run} = this.weasModule;

		// pass settings to module
		await this.updateSettings();

		const self = this;

		// register audio callback on module
		window['wallpaperRegisterAudioListener']((audioArray) => {
			// Smallog.debug('Get Audio Data!');
			// check basic
			if (!self.settings.audioprocessing || audioArray == null || audioArray.length != DAT_LEN) {
				Smallog.error('audioListener: received invalid audio data array: ' + JSON.stringify([audioArray.length || null, audioArray]));
				return;
			}
			// check nulls
			let consecutiveNull = 0;
			for (let i = 0; i < 15; i++) {
				const aA = audioArray[Math.floor(Math.random() * audioArray.length)];
				if (aA == 0.0) consecutiveNull++;
				else consecutiveNull = 0;
				if (consecutiveNull > 10) {
					Smallog.debug('Skipping received Null data!: ' + JSON.stringify(audioArray));
					return;
				}
			}

			// prepare data
			const start = performance.now();
			self.inBuff.set(audioArray);

			// WRAP IN isolated Function ran inside worker
			run(({module, instance, exports, params}) => {
				const ex = instance.exports as any;
				const {data} = params[0];

				// set audio data directly in module memory
				exports.__getFloat64ArrayView(ex.inputData).set(data);
				// trigger processing processing
				ex.update();
				// get copy of updated Data & Properties
				const r = { // => result
					data: new Float64Array(exports.__getFloat64ArrayView(ex.outputData)),
					props: new Float64Array(exports.__getFloat64ArrayView(ex.audioProps)),
				};
				return r;
			}, // params passed to worker
			{
				data: self.inBuff,
			})
			// worker result, back in main context
				.then((result) => {
					const {data, props} = result;
					const realProps = self.getProps(props);
					// apply actual last Data from worker
					self.lastAudio = {
						time: start / 1000,
						data,
						...realProps,
					};
					// print info
					Smallog.debug('Got Data from Worker! Time= ' + (performance.now() - start) + ', Data= ' + JSON.stringify(realProps));
				});
		});
	}

	/**
	* converts calculated output property number-array to string-associative-array
	* @param {ArrayLike<number>} dProps processed properties
	* @return {Object}
	* @ignore
	*/
	private getProps(dProps: ArrayLike<number>) {
		const keys = Object.keys(PropIDs);
		const res = {};
		for (let index = 0; index < keys.length; index++) {
			const key = keys[index];
			res[key] = dProps[PropIDs[key]];
		}
		return res;
	}

	/**
	* !! CAVEAT: only available after init and module load !!
	* <br/>
	* Will send the processing settings to the WebAssembly module
	* @return {Promise} finished event
	*/
	public updateSettings(): Promise<void> {
		if (!this.weasModule) return;
		const {run} = this.weasModule;

		return new Promise((resolve) => {
			const keys = Object.keys(SettIDs);
			const sett = new Float64Array(keys.length);
			for (let index = 0; index < keys.length; index++) {
				const key = keys[index];
				sett[SettIDs[key]] = this.settings[key] || 0;
			}

			// isolated Function running inside worker
			run(({module, instance, exports, params}) => {
				const ex = instance.exports as any;
				const {data} = params[0];
				exports.__getFloat64ArrayView(ex.audioSettings).set(data);
			},
			// Data passed to worker
			{
				data: sett,
			})
			// Back to main context
				.then(() => {
					Smallog.info('Sent Settings to WEAS: ' + JSON.stringify(sett));
					resolve();
				});
		});
	}

	/**
	* @return {boolean} false if:
	* <br/>
	* - processing is disabled
	* <br/>
	* - there is no data
	* <br/>
	* - the data is silent
	* <br/>
	* - data is too old (> 3s)
	*/
	public hasAudio() {
		return this.settings.audioprocessing &&
		this.lastAudio && this.lastAudio.silent == 0 &&
		(performance.now() / 1000 - this.lastAudio.time < 3);
	}
}
