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

export module OfflineHelper {
    // function helper, so OfflineWorker is actually packed
    function DontRemove() { return new OfflineWorker() };

    export async function Register(workerPath: string = "OfflineWorker.worker.js?jsonPath=offlinefiles.json") {
        if ('serviceWorker' in navigator) {
            await navigator.serviceWorker.register(workerPath).then(
                () => Smallog.Info('[OfflineHelper]: service-worker registration complete.'),
                () => Smallog.Error('[OfflineHelper]: service-worker registration failure.'));
            return true;
        }
        else Smallog.Info('[OfflineHelper]: service-worker is not supported.');
        return false;
    }
}