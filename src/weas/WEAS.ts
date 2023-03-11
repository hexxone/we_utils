/**
 * @author hexxone / https://hexx.one
 *
 * @license
 * Copyright (c) 2022 hexxone All rights reserved.
 * Licensed under the GNU GENERAL PUBLIC LICENSE.
 * See LICENSE file in the project root for full license information.
 */

import { CComponent } from "../CComponent";
import { CSettings } from "../CSettings";
import { Smallog } from "../Smallog";
import { getRealWindowSize, sharedWorker, waitReady } from "../Util";
import { WascInterface } from "../wasc-worker/WascInterface";
import { Bea_ts } from "./Bea";

const DAT_LEN = 128;
const LISTENAME = "wallpaperRegisterAudioListener";

/**
 * Audio processing settings
 * @public
 * @extends {CSettings}
 */
export class WEASettings extends CSettings {
	debugging = false;
	/** do audio processing? */
	audioprocessing = true;
	// do dynamic processing?
	equalize = true;
	// convert to mono?
	mono_audio = true;
	// invert low & high freqs?
	audio_direction = 0;
	// peak filtering
	peak_filter = 1;
	// neighbour-smoothing value
	value_smoothing = 2;
	// time-value smoothing ratio
	audio_increase = 75;
	audio_decrease = 25;
	// multipliers
	treble_multiplier = 0.666;
	mids_multiplier = 0.8;
	bass_multiplier = 1.2;
	// ignore value leveling for "silent" data
	minimum_volume = 0.005;
	// use low latency audio?
	low_latency = false;
	// show debug rendering?
	show_canvas = true;
}

/**
 * Processed audio data representation
 * @public
 */
export type WEAudio = {
	time: number;
	ellapsed: number;
	data: Float64Array;
	bass: number;
	mids: number;
	highs: number;
	sum: number;
	min: number;
	max: number;
	average: number;
	range: number;
	silent: number;
	intensity: number;
	bpm?: [
		{
			value: number;
			weight: number;
		}
	];
};

/**
 * @public
 */
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

/**
 * @public
 */
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
 * @public
 * @extends {CComponent}
 */
export class WEAS extends CComponent {
	/** @public last processed audio object */
	public lastAudio: WEAudio | undefined;

	/** @public settings object */
	public settings: WEASettings = new WEASettings();

	/** @public transfer buffer (last raw data) */
	public inBuff = new Float64Array(DAT_LEN);

	// has context been set?
	initialized = false;

	// web assembly functions
	weasModule: WascInterface = null;

	// bpm detektor
	bpModule: Bea_ts;

	// debug render elements
	mainElm: HTMLDivElement;
	canvas1: HTMLCanvasElement;
	context1: CanvasRenderingContext2D;
	canvas2: HTMLCanvasElement;
	context2: CanvasRenderingContext2D;
	display: HTMLElement;

	public init?: () => Promise<void>;

	/**
	 * delay audio initialization until page ready
	 * @param {boolean} detectBpm (optional)
	 */
	constructor(autoInit = false, detectBpm = false) {
		super();
		if (detectBpm) this.bpModule = new Bea_ts();
		if (autoInit) waitReady().then(() => this.realInit());
		else this.init = this.realInit;
	}

	/**
	 * convert float based audio to int
	 * @param {Array<number>} data as
	 * @return {Array<number>} asd
	 */
	private convertAudio(data) {
		const stereo = [];
		const dl = data.length;
		for (let i = 0; i < dl; i++) {
			stereo[i] = Math.max(0, Math.floor(data[i] * 255));
		}
		return stereo;
	}

	/**
	 * initializes audio processing pipeline
	 * and starts listening on audio data
	 * @ignore
	 * @returns {void}
	 */
	private async realInit() {
		// only listen if wallpaper engine context given
		if (!window[LISTENAME]) {
			Smallog.warn("'window.wallpaperRegisterAudioListener' not given!");
			return;
		}
		this.init = null;

		this.injectCSS();
		this.injectHTML();

		sharedWorker("WEAS.wasm", 4096, {}, !this.settings.low_latency)
			.then((myModule) => {
				this.weasModule = myModule;

				if (myModule.shared) {
					Smallog.debug("Got shared WebAssembly audio!");
				}

				this.updateSettings().then(() => {
					this.registerListener();
					this.initialized = true;
					Smallog.debug("WebAssembly Audio provider is ready!");
				});
			})
			.catch((err) => {
				const m = `Could not create WebAssembly Audio provider! ErrMsg: ${err}`;
				Smallog.error(m);
				alert(m);
			});
	}

	/**
	 * Registers the wallpaper engine audio listener
	 * @ignore
	 * @returns {void}
	 */
	private registerListener() {
		// register audio callback on module
		window[LISTENAME]((audioArray) => {
			// Smallog.debug('Get Audio Data!');
			// check basic
			if (
				!this.settings.audioprocessing ||
				audioArray == null ||
				audioArray.length != DAT_LEN
			) {
				Smallog.error(
					"received invalid audio data: " +
						JSON.stringify([audioArray.length || null, audioArray])
				);
				return;
			}

			// prepare data
			const start = performance.now();
			this.inBuff.set(audioArray);

			// WRAP IN isolated Function ran inside worker
			this.weasModule
				.run(
					({ module, instance, exports, params }) => {
						const ex = instance.exports as any;
						const { data } = params[0];
						const arrData = new Float64Array(data);

						// set audio data directly in module memory
						exports.__getFloat64ArrayView(ex.inputData).set(arrData);
						// trigger processing
						ex.update();
						// get copy of webassembly data
						const r = {
							// ptr: {data: ex.outputData, props: ex.audioProps},
							data: new Float64Array(
								exports.__getFloat64ArrayView(ex.outputData)
							).buffer,
							props: new Float64Array(
								exports.__getFloat64ArrayView(ex.audioProps)
							).buffer,
						};
						return r;
					},
					{
						data: this.inBuff.buffer,
					}
				)
				.then((result) => {
					// worker result, back in main context
					const { data, props } = result;
					const arrData = new Float64Array(data);
					const arrProps = new Float64Array(props);

					const realProps = this.getProps(arrProps);
					const teim = performance.now() - start;

					if (this.lastAudio && !this.lastAudio.silent && realProps.silent) {
						console.log(audioArray, arrData, arrProps);
					}

					let bpmObj = {};
					if (this.bpModule && !realProps.silent) {
						bpmObj = this.bpModule.process(
							start / 1000.0,
							this.convertAudio(audioArray)
						);
					}

					// apply actual last Data from worker
					this.lastAudio = {
						time: start,
						ellapsed: teim,
						data: arrData,
						...realProps,
						bpm: bpmObj,
					} as any;
				});
		});
	}

	/**
	 * Inject preview CSS
	 * @ignore
	 * @returns {void}
	 */
	private injectCSS() {
		const st = document.createElement("style");
		st.innerHTML = `
		#weas-preview {
			opacity: 0;
			position: absolute;
			z-index: 2;
		}
		#weas-preview canvas {
			background: #06060666;
			border: white 2px dotted;
		}
		#weas-preview.show {
			opacity: 1;
		}
		#WEASDisplay {
			position: fixed;
			left: 0px;
			width: 100vw;
		}
		`;
		document.head.append(st);
	}

	/**
	 * Inject preview canvas
	 * @ignore
	 * @returns {void}
	 */
	private injectHTML() {
		this.mainElm = document.createElement("div");
		this.mainElm.id = "weas-preview";
		this.mainElm.innerHTML = `
		<div style="font-size: 300%">
		<span>Raw Data:</span>
		<br />
		<span style="float:left">Left</span>
		<span style="float:right">Right</span>
		<canvas id="WEASCanvas1" style="height: 30vh; width: 95%;"></canvas>
		<span>Processed:</span>
		</div>
		<span id="WEASDisplay"></span>
		<br />
		<canvas id="WEASCanvas2" style="height: 30vh; width: 95%;"></canvas>
		`;
		document.body.append(this.mainElm);


		const { x: realWidth, y: realHeight } = getRealWindowSize();
		// TODO should also apply Height ????

		this.canvas1 = document.getElementById("WEASCanvas1") as HTMLCanvasElement;
		this.canvas1.width = realWidth;
		this.context1 = this.canvas1.getContext("2d");

		this.canvas2 = document.getElementById("WEASCanvas2") as HTMLCanvasElement;
		this.canvas2.width = realWidth;
		this.context2 = this.canvas2.getContext("2d");

		this.display = document.getElementById("WEASDisplay");
	}

	/**
	 * converts calculated output property number-array to string-associative-array
	 * @param {ArrayLike<number>} dProps processed properties
	 * @return {any}
	 * @ignore
	 * @returns {void}
	 */
	private getProps(dProps: ArrayLike<number>) {
		const keys = Object.keys(PropIDs);
		const res = {};
		for (let index = 0; index < keys.length; index++) {
			const key = keys[index];
			res[key] = dProps[PropIDs[key]];
		}
		return res as any;
	}

	/**
	 * !! CAVEAT: only available after init and module load !!
	 * <br/>
	 * Will send the processing settings to the WebAssembly module
	 * @public
	 * @return {Promise} finished event
	 */
	public updateSettings(): Promise<void> {
		if (!this.weasModule) return;

		// show or hide debug info
		if (this.settings.debugging) {
			if (!this.mainElm.classList.contains("show")) {
				this.mainElm.classList.add("show");
			}
		} else {
			this.mainElm.classList.remove("show");
		}

		const { run } = this.weasModule;

		return new Promise((resolve) => {
			const keys = Object.keys(SettIDs);
			const sett = new Float64Array(keys.length);
			for (let index = 0; index < keys.length; index++) {
				const key = keys[index];
				sett[SettIDs[key]] = this.settings[key] || 0;
			}

			// isolated Function running inside worker
			run(
				({ module, instance, exports, params }) => {
					const ex = instance.exports as any;
					const { data } = params[0];
					const arrDat = new Float64Array(data);
					exports.__getFloat64ArrayView(ex.audioSettings).set(arrDat);
				},
				// Data passed to worker
				{
					data: sett.buffer,
				}
			)
				// Back to main context
				.then(() => {
					Smallog.debug("Sent Settings to WEAS: " + JSON.stringify(sett));
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
	 * @public
	 */
	public hasAudio() {
		if (this.settings.show_canvas) this.updateCanvas();

		return (
			this.initialized &&
			this.settings.audioprocessing &&
			this.lastAudio &&
			this.lastAudio.silent <= 0 &&
			performance.now() - this.lastAudio.time < 3000
		);
	}

	/**
	 * Update the debug canvas
	 * @returns {void}
	 */
	private updateCanvas() {
		// update "raw" canvas
		if(!this.initialized)
			return;

		// clear the intersection
		this.context1.clearRect(0, 0, this.canvas1.width, this.canvas1.height);
		this.context1.fillStyle = "rgb(255,0,0)";
		const barWidth = Math.round(
			(1.0 / this.inBuff.length) * this.canvas1.width
		);
		const halfCount = this.inBuff.length / 2;
		for (let i = 0; i < halfCount; ++i) {
			const height = (this.canvas1.height * this.inBuff[i]) / 2;
			this.context1.fillRect(
				barWidth * i,
				this.canvas1.height - height,
				barWidth,
				height
			);
		}
		this.context1.fillStyle = "rgb(0,0,255)";
		for (let i = halfCount; i < this.inBuff.length; ++i) {
			const height = (this.canvas1.height * this.inBuff[191 - i]) / 2;
			this.context1.fillRect(
				barWidth * i,
				this.canvas1.height - height,
				barWidth,
				height
			);
		}

		// update "processed" data
		const tmpData = Object.assign({}, this.lastAudio);
		tmpData.data = null;
		this.display.innerText = JSON.stringify(tmpData, null, "\t");

		// update "processed" canvas
		this.context2.clearRect(0, 0, this.canvas2.width, this.canvas2.height);

		if (this.lastAudio && this.lastAudio.data) {
			this.context2.fillStyle = "rgb(0,255,0)";
			for (let index = 0; index < this.lastAudio.data.length; index++) {
				const height = (this.canvas2.height * this.lastAudio.data[index]) / 2;
				this.context2.fillRect(
					barWidth * index,
					this.canvas2.height - height,
					barWidth,
					height
				);
			}
			/*
			// draw average, min & max lines
			this.drawHorizontLine('rgb(255,255,0)', this.lastAudio.average);
			this.drawHorizontLine('rgb(255,0,255)', this.lastAudio.max);
			this.drawHorizontLine('rgb(127,127,127)', this.lastAudio.min);
			*/
		}
	}

	/**
	 * Draww Context2 line
	 * @param {string} style
	 * @param {number} y
	 * @returns {void}
	 */
	private drawHorizontLine(style, y) {
		const ctx = this.context2;
		const cvs = this.canvas2;
		ctx.fillStyle = style;
		ctx.moveTo(0, cvs.height * y);
		ctx.lineTo(cvs.width, cvs.height * y);
		ctx.closePath();
		ctx.stroke();
	}
}
