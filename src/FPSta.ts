/**
 * @author hexxone / https://hexx.one
 *
 * @license
 * Copyright (c) 2023 hexxone All rights reserved.
 * Licensed under the GNU GENERAL PUBLIC LICENSE.
 * See LICENSE file in the project root for full license information.
 */

import { CComponent } from "./CComponent";
import { CSettings } from "./CSettings";
import { waitReady } from "./Util";
import { WEAS } from "./weas/WEAS";

const Element_Id = "fpstats";
const Mem_Update_Rate = 19;


/**
 * Custom Stats settings
 * @public
 * @extends {CSettings}
 */
export class FPSettings extends CSettings {
	debugging = false;
}

/**
 * Custom FPS Stats module
 * 
 * @public
 * @extends {CComponent}
 */
export class FPStats extends CComponent {
	public settings: FPSettings = new FPSettings();

	private container: HTMLElement;
	// FPS
	private fpsHolder: HTMLElement;
	private lastUpdate: number = performance.now();
	private frameCount = 1;
	// usage
	private useHolder: HTMLElement;
	// cpu
	private cpuHolder: HTMLElement;
	private cpuBegin: number = performance.now();
	private cpuEnd: number = performance.now();
	private cpuMS = 1;
	// gpu
	private gpuHolder: HTMLElement;
	private gpuBegin: number = performance.now();
	private gpuEnd: number = performance.now();
	private gpuMS = 1;
	// audio
	private auProvider: WEAS = null;
	private audHolder: HTMLElement;
	private audioMS = 1;
	private bpmHolder: HTMLDivElement;

	// memory
	private memUpdate = 0;
	private perfMemHolder?: HTMLElement;
	private gpuMemHolder?: HTMLElement;
	private domMemHolder?: HTMLElement;
	private wrkMemHolder?: HTMLElement; // TODO

	// TODO benchmark mode

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
		const st = document.createElement("style");
		st.innerHTML = `
		#${Element_Id} {
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
		#${Element_Id}.show {
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
		this.container = document.createElement("div");
		this.container.id = Element_Id;
		document.body.append(this.container);
		// fps
		this.fpsHolder = document.createElement("div");
		this.fpsHolder.innerText = "FPS: 0";
		// cpu
		this.cpuHolder = document.createElement("div");
		this.cpuHolder.innerText = "CPU: 0.00 ms";
		// gpu
		this.gpuHolder = document.createElement("div");
		this.gpuHolder.innerText = "GPU: 0.00 ms";
		// usage
		this.useHolder = document.createElement("div");
		this.useHolder.innerText = "All: 0.00%";
		// append
		this.container.append(
			this.fpsHolder,
			this.cpuHolder,
			this.gpuHolder,
			this.useHolder
		);
		// audio
		if (this.auProvider) {
			this.bpmHolder = document.createElement("div");
			this.bpmHolder.innerText = "BPM: 0 ~ ";

			this.audHolder = document.createElement("div");
			this.audHolder.innerText = "Audio: 0 ms";

			this.container.append(this.bpmHolder, this.audHolder);
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
			if (this.settings.debugging) this.container.classList.add("show");
			else this.container.classList.remove("show");
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
		this.cpuMS += this.cpuEnd - this.cpuBegin;
		this.gpuMS += this.gpuEnd - this.gpuBegin;

		if (this.auProvider && this.auProvider.lastAudio) {
			this.audioMS = (this.audioMS + this.auProvider.lastAudio.ellapsed) / 2;
		}

		// only update text ~every second
		const now = performance.now();
		if (now < this.lastUpdate + 1000) return;

		// calculate
		const elapsd = (now - this.lastUpdate) / 1000;
		const efpies = this.frameCount / elapsd;

		const target = this.getFpsTarget(efpies);
		const msPerFps = (1000 / target);
		const cepeyu = this.cpuMS / this.frameCount / msPerFps * 100;
		const gepeyu = this.gpuMS / this.frameCount / msPerFps * 100;
		const alluse = (target / efpies) * (cepeyu + gepeyu);

		// apply
		this.fpsHolder.innerText = `FPS: ${efpies.toFixed(2)} / ${target}`;
		this.cpuHolder.innerText = `CPU: ${cepeyu.toFixed(2)} %`;
		this.gpuHolder.innerText = `GPU: ${gepeyu.toFixed(2)} %`;
		this.useHolder.innerText = `All: ${alluse.toFixed(2)} %`;

		if (this.audHolder)
			this.audHolder.innerText = `Audio: ${this.audioMS.toFixed(2)} ms`;
		if (
			this.bpmHolder &&
			this.auProvider.lastAudio &&
			this.auProvider.lastAudio.bpm instanceof Array
		) {
			let bts = 0;
			const bp = this.auProvider.lastAudio.bpm;
			bp.forEach((b) => (bts += b.value));
			bts /= bp.length;
			this.bpmHolder.innerText = `BPM: ${bts.toFixed(2)} ~`;
		}

		if (this.memUpdate++ > Mem_Update_Rate) {
			this.memUpdate = 0;
			this.updateMemory();
		}

		this.lastUpdate = now;
		this.reset();
	}

	/**
	 * All back to 0
	 * @public
	 */
	public reset() {
		this.frameCount = this.cpuMS = this.gpuMS = this.audioMS = 1;
	}


	private updateMemory() {
		if (window.crossOriginIsolated && performance["measureUserAgentSpecificMemory"] !== undefined) {
			performance["measureUserAgentSpecificMemory"]().then(result => {
				if (result && result.breakdown && result.bytes) {
					let sum = result.bytes;
					if (isNaN(sum) || sum <= 0) {
						console.warn("Invalid performance result: ", result);
						return;
					}

					if (!this.perfMemHolder) {
						this.perfMemHolder = document.createElement("div");
						this.useHolder.insertAdjacentElement("afterend", this.perfMemHolder);
					}

					const getDetail = (type: string) =>
						result.breakdown.find(bd => !!bd && !!bd.types && !!bd.types.includes && bd.types.includes(type)) ?? null

					const addDetail = (gotDetail: any, text: string, gotElement: HTMLElement, insertAfter: HTMLElement) => {
						if (!!gotDetail && !isNaN(gotDetail.bytes)) {
							if (!gotElement) {
								gotElement = document.createElement("div");
								insertAfter.insertAdjacentElement("afterend", gotElement);
							}
							const domMem = gotDetail.bytes;
							sum -= domMem;
							gotElement.innerText = `${text}: ${this.formatBytes(domMem)}`;
						}
						return gotElement;
					} 

					this.domMemHolder = addDetail(getDetail("DOM"), "DOM", this.domMemHolder, this.perfMemHolder);

					this.gpuMemHolder = addDetail(getDetail("Canvas"), "VRAM", this.gpuMemHolder, this.perfMemHolder);


					this.perfMemHolder.innerText = `RAM: ${this.formatBytes(sum)}`;
				}
			}).catch(err => console.error);
		}
	}

	private getFpsTarget(current: number) {
		const margin = current * 0.1;
		const targets = [600, 480, 360, 240, 144, 120, 90, 75, 60, 30];
		for (let i = 1; i < targets.length; i++) {
			if(current > targets[i] + margin)
				return targets[i - 1];
		}
		return 30;
	}

	private formatBytes(n: number) {
		const units = ['b', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
		let l = 0;
		while (n >= 1024 && ++l) {
			n = n / 1024;
		}
		return (n.toFixed(l > 0 ? 2 : 0) + ' ' + units[l]);
	}


}
