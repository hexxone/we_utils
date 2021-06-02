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
import {Smallog} from './Smallog';
import {waitReady} from './Util';
import {WEAS} from './WEAS';

const ELM_ID = 'fpstats';

/**
* Custom Stats settings
* @public
* @extends {CSettings}
*/
export class FPSettings extends CSettings {
	debugging : boolean = false;
}

/**
* Custom FPS Stats module
* @public
* @extends {CComponent}
*/
export class FPStats extends CComponent {
	public settings: FPSettings = new FPSettings();

	private container: HTMLElement;
	// FPS
	private fpsHolder: HTMLElement;
	private lastUpdate: number = performance.now();
	private frameCount: number = 0;
	// usage
	private useHolder: HTMLElement;
	// cpu
	private cpuHolder: HTMLElement;
	private cpuBegin: number = performance.now();
	private cpuEnd: number = performance.now();
	private cpuMS: number = 0;
	// gpu
	private gpuHolder: HTMLElement;
	private gpuBegin: number = performance.now();
	private gpuEnd: number = performance.now();
	private gpuMS: number = 0;
	// audio
	private auProvider: WEAS = null;
	private audHolder: HTMLElement;
	private audioMS: number = 0;


	/**
	* Create hidden element
	* @param {WEAS} audio (optional)
	* @param {WEICUE} cue (optional)
	*/
	constructor(audio?: WEAS) {
		super();
		this.auProvider = audio;

		waitReady().then(() => {
			this.injectCSS();
			this.injectHTML();
		});
	}

	/**
	* Make style
	* @ignore
	*/
	private injectCSS() {
		const st = document.createElement('style');
		st.innerHTML = `
		#${ELM_ID} {
			opacity: 0;
			position: fixed;
			top: 50vh;
			left: 10px;
			padding: 10px;
			z-index: 90000;
			font-size: 1.5em;
			text-align: left;
			background: black;
		}
		#${ELM_ID}.show {
			opacity: 0.8;
		}
		`;
		document.head.append(st);
	}

	/**
	* Make dom
	* @ignore
	*/
	private injectHTML() {
		// root
		this.container = document.createElement('div');
		this.container.id = ELM_ID;
		document.body.append(this.container);
		// fps
		this.fpsHolder = document.createElement('div');
		this.fpsHolder.innerText = 'FPS: 0';
		// usage
		this.useHolder = document.createElement('div');
		this.useHolder.innerText = 'Usage: 0 %';
		// cpu
		this.cpuHolder = document.createElement('div');
		this.cpuHolder.innerText = 'CPU: 0 ms';
		// gpu
		this.gpuHolder = document.createElement('div');
		this.gpuHolder.innerText = 'GPU: 0 ms';
		// append
		this.container.append(this.fpsHolder, this.useHolder, this.cpuHolder, this.gpuHolder);
		// audio
		if (this.auProvider) {
			this.audHolder = document.createElement('div');
			this.audHolder.innerText = 'Audio: 0 ms';
			this.container.append(this.audHolder);
		}
	}

	/**
	* update visible
	* @public
	* @return {Promise}
	*/
	public updateSettings(): Promise<void> {
		// show or hide debug info
		return waitReady().then(() => {
			if (this.settings.debugging) this.container.classList.add('show');
			else this.container.classList.remove('show');
		});
	}

	/**
	* Start measuring interval
	* @public
	* @param {boolean} cpu True if Cpu, false if GPU
	*/
	public begin(cpu: boolean) {
		if (!this.settings.debugging) return;

		if (cpu) this.cpuBegin = performance.now();
		else this.gpuBegin = performance.now();
	}

	/**
	* End measuring interval
	* @public
	* @param {boolean} cpu True if Cpu, false if GPU
	*/
	public end(cpu: boolean) {
		if (!this.settings.debugging) return;

		if (cpu) this.cpuEnd = performance.now();
		else this.gpuEnd = performance.now();
	}

	/**
	* update the html representation
	* @public
	*/
	public update() {
		this.frameCount++;
		this.cpuMS += (this.cpuEnd - this.cpuBegin);
		this.gpuMS += (this.gpuEnd - this.gpuBegin);

		if (this.auProvider && this.auProvider.lastAudio) {
			this.audioMS = (this.audioMS + this.auProvider.lastAudio.ellapsed) / 2;
		}

		// only update text ~every second
		const now = performance.now();
		if (now < (this.lastUpdate + 1000)) return;

		// calculate
		const elapsd = (now - this.lastUpdate) / 1000;
		const efpies = this.frameCount / elapsd;
		const yusage = (this.cpuMS + this.gpuMS) / 900;
		const cepeyu = this.cpuMS / this.frameCount;
		const gepeyu = this.gpuMS / this.frameCount;

		// apply
		const da = this.fpsHolder.innerText = `FPS: ${efpies.toFixed(2)}`;
		const db = this.useHolder.innerText = `Usage: ${yusage.toFixed(2)} %`;
		const dc = this.cpuHolder.innerText = `CPU: ${cepeyu.toFixed(2)} ms`;
		const dd = this.gpuHolder.innerText = `GPU: ${gepeyu.toFixed(2)} ms`;
		Smallog.debug(`${da} ${db} ${dc} ${dd}`, '[FPStats]');

		if (this.audHolder) this.audHolder.innerText = `Audio: ${this.audioMS.toFixed(2)} ms`;

		this.lastUpdate = now;
		this.reset();
	}

	/**
	* All back to 0
	* @public
	*/
	public reset() {
		this.frameCount = this.cpuMS = this.gpuMS = this.audioMS = 0;
	}
}
