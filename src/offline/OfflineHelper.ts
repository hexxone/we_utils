/**
* @author hexxone / https://hexx.one
*
* @license
* Copyright (c) 2021 hexxone All rights reserved.
* Licensed under the GNU GENERAL PUBLIC LICENSE.
* See LICENSE file in the project root for full license information.
*/
/* eslint-disable no-unused-vars */

import {Smallog} from '../Smallog';

// this should pack the serviceworker like a webwoker.
import OfflineWorker from 'worker-loader!./Offline';

const LogHead = '[OfflineHelper] ';
const LogErrS = 'service-worker is not supported.';

/**
* @ignore
* Helper class for loading and registering the ServiceWorker
* <br/>
* the workerPath is the path to the compiled OfflineWorker js file, relative from the calling html file...
* <br/>
* the "?jsonPath=" argument will give the worker a "public available" json file, consisting of a string array.
* <br/>
* the array will contain all necessary files to run the app offline.
* <br/>
* the ServiceWorker will cache these files and automatically load them if the website is ran offline.
* <br/>
* ServiceWorker is a progressive technology. Some browsers will be unsupported...
*/
export module OfflineHelper {
	// function helper, so OfflineWorker is actually processed
	// eslint-disable-next-line require-jsdoc
	function DontRemove() {
		return new OfflineWorker();
	};

	// In order to intercept ALL fetch-requests offline, the scope "/" (root) is required.
	// when you put in in a sub-directory like "/js/", the scope is also "/js/".
	// Then, your HTTP Server will have to send the REPONSE HEADER `service-worker-allowed: /`
	// otherwise it will cause an ERROR in your Browser. So: Putting the ServiceWorker in root folder is easiest.
	// obviously with webpack, this causes a problem, when you are not outputting directly into the root dir...
	// eslint-disable-next-line require-jsdoc
	export function register(name: string, worker = 'Offline.worker.js', oFile = 'offlinefiles.json') {
		return new Promise(async (resolve) => {
			if ('serviceWorker' in navigator) {
				const workerPath = `${worker}?name=${name}&jsonPath=${oFile}`;
				await navigator.serviceWorker.register(workerPath, {scope: '/'})
					.then(() => Smallog.info('service-worker registration complete.', LogHead),
						() => Smallog.error('service-worker registration failure.', LogHead))
					.then(() => resolve(true));
				return true;
			} else {
				Smallog.error(LogErrS, LogHead);
				resolve(false);
			}
		});
	}

	/**
	* unregister all service workers
	* @return {Promise} finished
	*/
	export async function reset() {
		return new Promise((resolve) => {
			if ('serviceWorker' in navigator) {
				navigator.serviceWorker.getRegistrations().then(async (registrations) => {
					for (const registration of registrations) {
						await registration.unregister();
					}
					resolve(true);
				});
			} else {
				Smallog.error(LogErrS, LogHead);
				resolve(false);
			}
		});
	}
}
