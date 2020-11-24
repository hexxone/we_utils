/**
 * @author D.Thiele @https://hexx.one
 *
 * @license
 * Copyright (c) 2020 D.Thiele All rights reserved.  
 * Licensed under the GNU GENERAL PUBLIC LICENSE.
 * See LICENSE file in the project root for full license information.
 * 
 * @description
 * Shorthand Document ready wrapper
 */

export module Ready {
    export function On(fn: any) {
        if (typeof fn !== 'function')
            return false;
        // If document is already loaded, run method
        if (document.readyState === 'interactive' || document.readyState === 'complete')
            return fn();
        // Otherwise, wait until document is loaded
        document.addEventListener('DOMContentLoaded', fn, false);
    };
} 
