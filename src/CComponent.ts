/**
* @author hexxone / https://hexx.one
*
* @license
* Copyright (c) 2021 hexxone All rights reserved.
* Licensed under the GNU GENERAL PUBLIC LICENSE.
* See LICENSE file in the project root for full license information.
*/

import {CSettings} from './CSettings';
import {Smallog} from './Smallog';

/**
* Base-Component for a TypeScript Web Wallpaper
*/
export class CComponent {
	private needsUpdate = false;

	/** main Settings, need to be overwritten with Specific settings
	 * @see {CSettings}
	 */
	public settings: CSettings = null;

	/* Important: Append your child objects, for settings to be applied correctly! */
	public children: CComponent[] = [];

	/**
	* will recursively try to set a setting with type and return success
	* <br/>
	* will also flag the module as needs-Update.
	*
	* @param {Object} key
	* @param {Object} value
	* @return {boolean} found
	*/
	public applySetting(key: any, value: any): boolean {
		let found = this.settings.apply(key, value);
		if (found) {
			this.needsUpdate = true;
			Smallog.debug(`ApplySetting: ${key}:${value}`);
		}
		this.children.forEach((ch) => found = (found || ch.applySetting(key, value)));
		return found;
	}

	/**
	* DO NOT OVERWWRITE !!!
	* <br/>
	* will recursively update all needed modules after settings changes
	*/
	public updateAll() {
		this.children.forEach((c) => c.updateAll());
		if (this.needsUpdate) this.updateSettings();
		this.needsUpdate = false;
	}

	/**
	* NEEDS TO BE OVERWRITTEN FOR DOING ACTIONS ON SETTINGS CHANGE.
	* <br/>
	* should usually get called automatically when needed.. no need for extra calling
	*
	* @return {Promise} async commpletion event
	*/
	public updateSettings(): Promise<void> {
		console.error(`ERROR_NO_IMPL at: CComponent.UpdateSettings!\r\nPlease override this method!`);
		return Promise.resolve();
	}
}
