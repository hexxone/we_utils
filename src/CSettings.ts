/**
* @author hexxone / https://hexx.one
*
* @license
* Copyright (c) 2021 hexxone All rights reserved.
* Licensed under the GNU GENERAL PUBLIC LICENSE.
* See LICENSE file in the project root for full license information.
*/

import {Smallog} from './Smallog';

/**
* Base-Component Settings helper
*
* Core Settings interface, used for type-secure setting applying.
*
* All Settings-classes should be dereived from this one.
*
* @see {CComponent}
*/
export class CSettings {
	/**
	* check if a certain key exists on a (dereived) object and the value type matches
	* @param {string} key
	* @param {Object} castedValue
	* @return {boolean} success
	*/
	public apply(key: string, castedValue: any) {
		if (this[key] !== undefined) {
			if (typeof this[key] === typeof castedValue) {
				this[key] = castedValue;
				return true;
			} else {
				Smallog.Error('CSettings Error: invalid type on: \'' + key +
				'\'. Is: \'' + typeof this[key] + '\', applied: \'' + typeof castedValue + '\'');
			}
		}
		return false;
	}
}
