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
import {rgbToObj, waitReady} from './Util';
import {Smallog} from './Smallog';
import {WEAS} from './weas';
import {ICUE} from './ICUE';

const IMG_SRC = './img/icue.png';

const ClassName: string = '[WEICUE] ';
const canvasX: number = 23;
const canvasY: number = 7;
const WaitTime: number = 30;
const Transition: number = 3;


/**
* iCUE processing settings
* @public
* @extends {CSettings}
*/
export class CUESettings extends CSettings {
	public icue_mode: number = 1;
	public icue_area_xoff: number = 50;
	public icue_area_yoff: number = 90;
	public icue_area_width: number = 75;
	public icue_area_height: number = 30;
	public icue_area_blur: number = 5;
	public icue_area_decay: number = 15;
	public icue_main_color: string = '0 0.8 0';
	// AudiOrbits bg Color; used as "decay"-color aswell
	public main_color: string = '0 0 0';
}

/**
* WEICUE
* <br/>
* Wallpaper Engine iCUE effects for web wallpapers
* <br/>
* Uses several different methods to create
* Lighting effects for Corsair ICUE devices.
* @public
* @extends {CComponent}
*/
export class WEICUE extends CComponent {
	private cue: ICUE;
	private weas: WEAS;

	private holder: HTMLDivElement = null;
	private texter: HTMLDivElement = null;
	private preview: HTMLDivElement = null;
	private helperCanvas: HTMLCanvasElement = null;
	private helperContext: CanvasRenderingContext2D = null;

	private icueDevices = [];
	private icueInterval = null;

	// preview time out
	private prevTimeout = null;

	// runtime values
	public settings: CUESettings = new CUESettings();
	public isAvailable: boolean = false;
	public PAUSED: boolean = false;

	/**
	* Starts listening for led/icue plugin
	* and prepares helper elements
	* @param {WEAS} weas Audio supplier for non-projection mode
	*/
	constructor(weas: WEAS) {
		super();
		this.weas = weas;

		// Plugin handler
		window['wallpaperPluginListener'] = {
			onPluginLoaded: (name: string, version: string) => {
				const lower = name.toLocaleLowerCase();
				if (lower === 'cue' || lower === 'led') {
					this.cue = window['cue'];
					this.isAvailable = true;
					Smallog.debug(`Plugin loaded: ${name}, v${version}`, ClassName);
				}
			},
		};

		// inject helpers
		waitReady().then(() => {
			this.injectCSS();
			this.injectHTML();
			this.init();
		});
	}

	/**
	* style for iCue messages, preview and helper
	* @ignore
	*/
	private injectCSS() {
		const st = document.createElement('style');
		st.innerHTML = `
		#icueholder {
			opacity: 0;
			position: absolute;
			top: -120px;
			left: 0;
			width: auto;
			height: auto;
			margin: 10px;
			transition: all ${Transition}s ease;
		}
		#icueholder.show {
			opacity: 1;
			top: 0px;
		}
		#icueholder.waiting {
			opacity: 0.2;
			transition: all 10s ease;
		}
		#icuelogo {
			float: left;
			height: 80px;
			width: 80px;
		}
		#icuetext {
			float: left;
			margin: 25px 5px;
			font-size: 175%;
		}
		#icueholder {
			text-shadow: 0 0 20px rgba(255, 255, 255, .5), 0 0 15px rgba(255, 255, 255, .5);
		}
		.cuePreview {
			opacity: 0;
			position: absolute;
			background: rgba(255, 0, 0, .1);
			transition: all 2s;
		}
		.cuePreview.show {
			opacity: 0.5;
		}
		`;
		document.head.append(st);
	}

	/**
	* Prepare html elements
	* @ignore
	*/
	private injectHTML() {
		// create container
		this.holder = document.createElement('div');
		this.holder.id = 'icueholder';
		// create icon (no ref needed)
		const imgg = document.createElement('img');
		imgg.id = 'icuelogo';
		imgg.setAttribute('src', IMG_SRC);
		imgg.setAttribute('alt', 'ICUE Icon');
		// make text holder
		this.texter = document.createElement('div');
		this.texter.id = 'icuetext';

		// preview area
		this.preview = document.createElement('div');
		this.preview.classList.add('cuePreview');
		this.preview.innerHTML = '<h1>This is the LED/iCUE Projection-Area preview.<br />It will hide automatically.<br /><br />You can disable LED/iCUE projection under:<br />"Settings > 💡 LED/iCUE > Projection-mode = None"</h1>';

		// append image and text
		this.holder.append(imgg, this.texter);
		document.body.append(this.holder, this.preview);
	}

	/**
	* show a message by icue
	* @param {string} msg
	* @param {boolean} waiting
	* @ignore
	*/
	private icueMessage(msg: string, waiting :boolean = false) {
		Smallog.debug('MSG:  ' + msg, ClassName);
		// set text
		this.texter.innerHTML = msg;
		// show
		this.holder.classList.add('show');
		if (waiting) this.holder.classList.add('waiting');
		// hide again
		const waiTime = waiting ? (WaitTime) : (Transition * 1000 + 4000);
		setTimeout(() => {
			this.holder.classList.remove('show');
			if (waiting) this.holder.classList.remove('waiting');
		}, waiTime);
	}

	/**
	* helper
	* @param {boolean} inPx suffix "px" string to number (allows direct css use)
	* @return {Object} area
	* @ignore
	*/
	private getArea(inPx = false) {
		const sett = this.settings;
		const wwid = window.innerWidth;
		const whei = window.innerHeight;
		const w = wwid * sett.icue_area_width / 100;
		const h = whei * sett.icue_area_height / 100;
		const l = ((wwid - w) * sett.icue_area_xoff / 100);
		const t = ((whei - h) * sett.icue_area_yoff / 100);
		return {
			width: w + (inPx ? 'px' : ''),
			height: h + (inPx ? 'px' : ''),
			left: l + (inPx ? 'px' : ''),
			top: t + (inPx ? 'px' : ''),
		};
	}

	/**
	* convert data for icue
	* @param {ImageData} imageData
	* @return {string}
	* @ignore
	*/
	private getEncodedCanvasImageData(imageData: ImageData) {
		const colorArray = [];
		for (let d = 0; d < imageData.data.length; d += 4) {
			const write = d / 4 * 3;
			colorArray[write] = imageData.data[d];
			colorArray[write + 1] = imageData.data[d + 1];
			colorArray[write + 2] = imageData.data[d + 2];
		}
		return String.fromCharCode.apply(null, colorArray);
	}

	/**
	* canvas blur helper function
	* @param {HTMLCanvasElement} canvas
	* @param {CanvasRenderingContext2D} ctx
	* @param {number} blur
	* @ignore
	*/
	private gBlurCanvas(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, blur: number) {
		let sum = 0;
		const delta = 5;
		const alpha_left = 1 / (2 * Math.PI * delta * delta);
		const step = blur < 3 ? 1 : 2;

		let x; let weight;
		for (let y = -blur; y <= blur; y += step) {
			for (x = -blur; x <= blur; x += step) {
				weight = alpha_left * Math.exp(-(x * x + y * y) / (2 * delta * delta));
				sum += weight;
			}
		}
		for (let y = -blur; y <= blur; y += step) {
			for (x = -blur; x <= blur; x += step) {
				ctx.globalAlpha = alpha_left * Math.exp(-(x * x + y * y) / (2 * delta * delta)) / sum * blur * blur;
				ctx.drawImage(canvas, x, y);
			}
		}
		ctx.globalAlpha = 1;
	}

	/**
	* Show waiting message and init canvas
	* @ignore
	*/
	private init() {
		const sett = this.settings;
		// dont initialize if disabled
		if (sett.icue_mode == 0) return;

		this.icueMessage('LED: waiting for plugin.', true);
		this.initCUE(0);
		Smallog.debug('init...', ClassName);

		// recreate if reinit
		if (this.icueInterval) clearInterval(this.icueInterval);
		if (this.helperCanvas) document.body.removeChild(this.helperCanvas);
		// setup canvas
		this.helperCanvas = document.createElement('canvas');
		this.helperCanvas.id = 'helpCvs';
		this.helperCanvas.width = canvasX;
		this.helperCanvas.height = canvasY;
		this.helperCanvas.style.display = 'none';
		this.helperContext = this.helperCanvas.getContext('2d');
		document.body.appendChild(this.helperCanvas);

		// update devices about every 33ms/30fps. iCue doesnt really support higher values
		this.icueInterval = window.setInterval(() => this.updateFrame(), 1000 / 30);
	}


	/**
	* show or hide preview
	* @public
	* @return {Promise} finished
	*/
	public updateSettings(): Promise<void> {
		// reset timeout?
		if (this.prevTimeout) {
			clearTimeout(this.prevTimeout);
			this.prevTimeout = null;
		}
		// update / show preview
		if (this.isAvailable && this.preview && this.settings.icue_mode == 1) {
			Object.assign(this.preview.style, this.getArea(true));
			this.preview.classList.add('show');
			this.prevTimeout = setTimeout(() => {
				this.preview.classList.remove('show');
			}, 6000);
		}
		return Promise.resolve();
	}

	/**
	* will initialize ICUE api & usage
	* @param {number} count Retries (will stop at 100)
	* @ignore
	*/
	private initCUE(count: number) {
		// wait for plugins
		if (!this.isAvailable) {
			if (count < 100) setTimeout(() => this.initCUE(++count), 150);
			else this.icueMessage('LED: Plugin not found!');
			return;
		}
		// setup devices
		this.icueDevices = [];

		this.cue.getDeviceCount((deviceCount) => {
			this.icueMessage('LED: Found ' + deviceCount + ' devices.');
			for (let xi = 0; xi < deviceCount; xi++) {
				const xl = xi;
				this.cue.getDeviceInfo(xl, (info) => {
					info.id = xl;
					this.cue.getLedPositionsByDeviceIndex(xl, (leds) => {
						info.leds = leds;
						this.icueDevices[xl] = info;
					});
				});
			}
		});
	}

	/**
	* do the thing...
	* @ignore
	*/
	private updateFrame() {
		const sett = this.settings;
		if (this.PAUSED || !this.isAvailable || sett.icue_mode == 0 || this.icueDevices.length < 1) return;
		// projection mode
		if (sett.icue_mode == 1) {
			// get scaled down image data and encode it for icue
			const encDat = this.getEncodedCanvasImageData(this.helperContext.getImageData(0, 0, canvasX, canvasY));
			// update all icueDevices with data
			for (let xi = 0; xi < this.icueDevices.length; xi++) {
				this.cue.setLedColorsByImageData(xi, encDat, canvasX, canvasY);
			}
		}
		// color mode
		if (sett.icue_mode == 2) {
			// try audio multiplier processing
			let mlt = 255;
			if (this.weas.hasAudio()) {
				const aud = this.weas.lastAudio;
				mlt *= aud.average / aud.range / aud.intensity * 10;
			}
			// get lol objects
			const ledCol = rgbToObj(sett.icue_main_color, mlt);
			// update all icueDevices with data
			for (let xi = 0; xi < this.icueDevices.length; xi++) {
				this.cue.setAllLedsColorsAsync(xi, ledCol as any);
			}
		}
	}

	/**
	* copy main canvas portion to our helper
	* @public
	* @param {HTMLCanvasElementq} mainCanvas
	*/
	public updateCanvas(mainCanvas: HTMLCanvasElement) {
		const sett = this.settings;
		if (!this.isAvailable || !mainCanvas || sett.icue_mode == 0 || this.icueDevices.length < 1) return;

		if (sett.icue_mode == 1) {
			// get helper vars
			const area: any = this.getArea(false);
			const hctx = this.helperContext;
			// get real rgb values
			const cO = rgbToObj(sett.main_color);
			hctx.fillStyle = `rgba(${cO.r}, ${cO.g}, ${cO.b}, ${sett.icue_area_decay / 100})`;
			hctx.fillRect(0, 0, canvasX, canvasY);
			// scale down and copy the image to the helper canvas
			hctx.drawImage(mainCanvas, area.left, area.top, area.width, area.height, 0, 0, canvasX, canvasY);
			// blur the helper projection canvas
			if (sett.icue_area_blur > 0) this.gBlurCanvas(this.helperCanvas, hctx, sett.icue_area_blur);
		}
	}
}
