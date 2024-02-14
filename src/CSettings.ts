/**
 * @author hexxone / https://hexx.one
 *
 * @license
 * Copyright (c) 2023 hexxone All rights reserved.
 * Licensed under the GNU GENERAL PUBLIC LICENSE.
 * See LICENSE file in the project root for full license information.
 */

import { Smallog } from "./Smallog";

/**
 * Base-Component Settings helper
 *
 * Core Settings interface, used for type-secure setting applying.
 *
 * All Settings-classes should be dereived from this one.
 *
 * @public
 * @see {CComponent}
 */
export class CSettings {
	/**
	 * check if a certain key exists on a (dereived) object.
	 * if it exists, the value type matches and the value is not already equal, apply & return true
	 * otherwise return false
	 *
	 * @public
	 * @param {string} key
	 * @param {Object} castedValue
	 * @returns {boolean} value was found & changed
	 */
	public apply(key: string, castedValue: any): boolean {
		if (this[key] !== undefined) {
			if (typeof this[key] === typeof castedValue) {
				if (this[key] !== castedValue) {
					this[key] = castedValue;
					return true;
				} else
					Smallog.debug(
						"CSettings value not changed: " + key + " = " + castedValue
					);
			} else {
				Smallog.error(
					"CSettings Error: invalid type on: '" +
						key +
						"'. Is: '" +
						typeof this[key] +
						"', applied: '" +
						typeof castedValue +
						"'"
				);
			}
		}
		return false;
	}
}
