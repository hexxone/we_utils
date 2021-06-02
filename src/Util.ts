/**
* @author hexxone / https://hexx.one
*
* @license
* Copyright (c) 2021 hexxone All rights reserved.
* Licensed under the GNU GENERAL PUBLIC LICENSE.
* See LICENSE file in the project root for full license information.
*
* @ignore
*/

// promise resolve queue
const promQueue: ((val) => void)[] = [];
const workQueue = () => {
	while (promQueue.length > 0) {
		const call = promQueue.shift();
		call(true);
	}
};
document.addEventListener('DOMContentLoaded', workQueue, false);

/**
* Shorthand Document ready wrapper,\n resolves promise when html document is ready
* @public
* @return {Promise}
*/
export function waitReady() {
	return new Promise((resolve) => {
		// If document is already loaded, run method
		if (document.readyState === 'interactive' || document.readyState === 'complete') {
			resolve(true);
		}
		// Otherwise, wait until document is loaded
		promQueue.push(resolve);
	});
}
