/**
 * @author D.Thiele @https://hexx.one
 *
 * @license
 * Copyright (c) 2020 D.Thiele All rights reserved.  
 * Licensed under the GNU GENERAL PUBLIC LICENSE.
 * See LICENSE file in the project root for full license information.
 * 
 * @description
 * Helper class for loading and registering the ServiceWorker
 * 
 * the workerPath is the path to the compiled OfflineWorker js file, relative from the calling html file...
 * the "?jsonPath=" argument will give the worker a "public available" json file, consisting of a string array.
 * the array will contain all necessary files to run the app offline.
 * the ServiceWorker will cache these files and automatically load them if the website is ran offline.
 * ServiceWorker is a progressive technology. Some browsers will be unsupported...
 */

import { Smallog } from "./Smallog";

// this should pack the serviceworker like a webwoker.
import OfflineWorker from 'worker-loader!./OfflineWorker';

const LogHead = "[OfflineHelper] ";
const LogErrS = "service-worker is not supported.";

export module OfflineHelper {
    // function helper, so OfflineWorker is actually processed
    function DontRemove() { return new OfflineWorker() };

    export function Register(workerPath: string = "js/OfflineWorker.worker.js?jsonPath=/js/offlinefiles.json") {
        return new Promise(async (resolve) => {
            if ('serviceWorker' in navigator) {
                await navigator.serviceWorker.register(workerPath)
                    .then(() => Smallog.Info('service-worker registration complete.', LogHead),
                        () => Smallog.Error('service-worker registration failure.', LogHead))
                    .then(() => resolve(true));
                return true;
            }
            else {
                Smallog.Error(LogErrS, LogHead);
                resolve(false);
            }
        });
    }

    export async function Reset() {
        return new Promise((resolve) => {
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(async registrations => {
                    for (let registration of registrations)
                        await registration.unregister();
                    resolve(true);
                });
            }
            else {
                Smallog.Error(LogErrS, LogHead);
                resolve(false);
            }
        });
    }
}