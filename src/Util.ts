/**
* @author hexxone / https://hexx.one
*
* @license
* Copyright (c) 2021 hexxone All rights reserved.
* Licensed under the GNU GENERAL PUBLIC LICENSE.
* See LICENSE file in the project root for full license information.
*
* @description
* Shorthand Document ready wrapper
*/

/**
* Helper function
* @return {Promise} resolve when site ready
*/
export function waitReady() {
	return new Promise((resolve) => {
		// If document is already loaded, run method
		if (document.readyState === 'interactive' || document.readyState === 'complete') {
			resolve(true);
		}
		// Otherwise, wait until document is loaded
		document.addEventListener('DOMContentLoaded', resolve, false);
	});
}
