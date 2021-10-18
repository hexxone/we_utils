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

const ELM_ID = 'triggerwarn';
const IMG_SRC = './img/triggerwarn.png';

/**
* Seizure display warnings
* @public
* @extends {CSettings}
*/
class WarnSettings extends CSettings {
	seizure_warning: boolean = true;
	animate_seconds: number = 2;
	wait_seconds: number = 6;
}

/**
* Displays a seizure warning image centered on html for a given Time.
* @public
* @extends {CComponent}
*/
export class WarnHelper extends CComponent {
	/*
	* @public
	*/
	public settings: WarnSettings = new WarnSettings();

	private element: HTMLDivElement;

	/**
	* Create and prepare once document ready
	*/
	constructor() {
		super();

		waitReady().then(() => {
			this.injectCSS();
			this.injectHTML();
		});
	}

	/**
	* Make custom style
	* @ignore
	*/
	private injectCSS() {
		const st = document.createElement('style');
		st.innerHTML = `
		#${ELM_ID} {
			opacity: 0;
			position: absolute;
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%);
			transition: opacity ${this.settings.animate_seconds}s ease;
		}
		#${ELM_ID}.show {
			opacity: 1;
		}
		`;
		document.head.append(st);
	}

	/**
	* Make custom html
	* @ignore
	*/
	private injectHTML() {
		this.element = document.createElement('img');
		this.element.id = ELM_ID;
		this.element.setAttribute('src', IMG_SRC);
		this.element.setAttribute('alt', 'Seizure Warning');
		document.body.append(this.element);
	}

	/**
	* Show the warning
	* @public
	* @return {Promise} hidden again
	*/
	public show(): Promise<void> {
		return new Promise((resolve) => {
			// dont show
			if (!this.settings.seizure_warning) {
				resolve();
				return;
			}
			// show it
			this.element.classList.add('show');
			// wait some time
			setTimeout(() => {
				this.hide().then(() => {
					resolve();
				});
			}, this.settings.wait_seconds * 1000);
		});
	}

	/**
	* Hide warning
	* @public
	* @return {Promise} hidden
	*/
	public hide(): Promise<void> {
		return new Promise((resolve) => {
			// hide it & wait
			this.element.classList.remove('show');
			setTimeout(() => {
				resolve();
			}, this.settings.animate_seconds * 1000);
		});
	}

	/**
	* Settings have been changed
	* @public
	* @return {Promise} finished
	*/
	public updateSettings(): Promise<void> {
		// fix for instantly removing the warning while it shows
		if (!this.settings.seizure_warning && this.element.classList.contains('show')) {
			this.hide();
		}
		// whatever
		return Promise.resolve();
	}
};
