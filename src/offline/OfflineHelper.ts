/**
 * @author hexxone / https://hexx.one
 *
 * @license
 * Copyright (c) 2024 hexxone All rights reserved.
 * Licensed under the GNU GENERAL PUBLIC LICENSE.
 * See LICENSE file in the project root for full license information.
 */

import { Smallog } from '../Smallog';

// this should pack the serviceworker like a webwoker.

import OfflineWorker from 'worker-loader!./Offline.worker';
// const OfflineWorker = () => new Worker(new URL(, import.meta.url));

const oh = '[OfflineHelper] ';

/**
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
 * @public
 * @ignore
 */

// function helper, so OfflineWorker is actually processed
// eslint-disable-next-line require-jsdoc
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function DontRemove() {
    return new OfflineWorker();
}

// TODO check if offlinefiles exist before registering

/**
 * @description
 * In order to intercept ALL fetch-requests offline, the scope "/" (root) is required.
 * when you put in in a sub-directory like "/js/", the scope is also "/js/".
 * Then, your HTTP Server will have to send the REPONSE HEADER `service-worker-allowed: /`
 * otherwise it will cause an ERROR in your Browser. So: Putting the ServiceWorker in root folder is easiest.
 * obviously with webpack, this causes a problem, when you are not outputting directly into the root dir...
 * eslint-disable-next-line require-jsdoc
 *
 * @param {string} name - the name of the worker
 * @param {string} worker - the Url to instanitate
 * @param {string} oFile - the path to the offline json file
 * @returns {Promise<boolean>} finished
 * @public
 */
function register(
    name: string,
    worker = 'Offline.worker.js',
    oFile = 'offlinefiles.json'
): Promise<boolean> {
    return new Promise((resolve) => {
        if ('serviceWorker' in navigator) {
            const workerPath = `${worker}?name=${name}&jsonPath=${oFile}`;

            navigator.serviceWorker
                .register(workerPath, {
                    scope: '/'
                })
                .then(
                    () => {
                        return Smallog.info(
                            'service-worker registration complete.',
                            oh
                        );
                    },
                    (reason) => {
                        return Smallog.error(
                            `service-worker registration failure: ${reason}`,
                            oh
                        );
                    }
                )
                .then(() => {
                    return resolve(true);
                });

            return true;
        }
        Smallog.error('not supported!', oh);
        resolve(false);
    });
}

/**
 * unregister all service workers
 * @returns {Promise<boolean>} finished
 * @public
 */
async function reset(): Promise<boolean> {
    return new Promise((resolve) => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker
                .getRegistrations()
                .then(async (registrations) => {
                    for (const registration of registrations) {
                        await registration.unregister();
                    }
                    resolve(true);
                });
        } else {
            Smallog.error('not supported!', oh);
            resolve(false);
        }
    });
}

export const OfflineHelper = {
    register,
    reset
};
