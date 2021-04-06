/**
* @author hexxone / https://hexx.one
*
* @license
* Copyright (c) 2021 hexxone All rights reserved.
* Licensed under the GNU GENERAL PUBLIC LICENSE.
* See LICENSE file in the project root for full license information.
*
* @description
* Displays a seizure warning image centered on html for a given Time.
*
* @todo
* - add trigger warn languages to project json
* - add trigger warn as html
*/

import {CComponent} from './CComponent';
import {CSettings} from './CSettings';
import {waitReady} from './Util';

const ELM_ID = 'triggerwarn';

/**
* @TODO test getting text
* @extends {CSettings}
*/
class WarnSettings extends CSettings {
	seizure_warning: boolean = true;
	seizure_text: string = '/* <!-- ## ERROR ## --> */';
	animate_seconds: number = 1;
	wait_seconds: number = 10;
}

/**
* Seizure warning display
* @extends {CComponent}
*/
export class WarnHelper extends CComponent {
	public settings: WarnSettings = new WarnSettings();

	private element: HTMLDivElement;

	// promise behind showing the warning
	private showResolve: any;

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
			object-fit: contain;
			text-align: center;
			max-height: 30vmax;
			top: 25vmin;
			opacity: 0;
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
		this.element = document.createElement('div');
		this.element.id = ELM_ID;
		document.body.append(this.element);
	}

	/**
	* Set html text value
	* @ignore
	*/
	private setText() {
		this.element.innerHTML = this.settings.seizure_text.replace('\r\n', '<br />');
	}

	/**
	* Show the warning
	* @return {Promise} hidden again
	*/
	public show(): Promise<void> {
		return new Promise((resolve) => {
			// dont show
			if (!this.settings.seizure_warning) {
				resolve();
				return;
			}
			// wait for resolve by "Hide()"
			this.showResolve = resolve;
			// make text
			this.setText();
			// show it
			this.element.classList.add('show');
			// wait some time
			setTimeout(this.hide, this.settings.wait_seconds * 1000);
		});
	}

	/**
	* Hide warning
	* @return {Promise} hidden
	*/
	public hide(): Promise<void> {
		return new Promise((resolve) => {
			// hide it & wait
			this.element.classList.remove('show');
			setTimeout(() => {
				if (this.showResolve) this.showResolve();
				this.showResolve = null;
				resolve();
			}, this.settings.animate_seconds * 1000);
		});
	}

	/**
	* Settings have been changed
	* @return {Promise} finished
	*/
	public updateSettings(): Promise<void> {
		// update text
		this.setText();
		// fix for instantly removing the warning while it shows
		if (!this.settings.seizure_warning && this.element.classList.contains('show')) {
			return this.hide();
		}
		// whatever
		return;
	}
};
