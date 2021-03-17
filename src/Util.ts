/**
 * @author D.Thiele
 * @url https://hexx.one
 *
 * @license
 * Copyright (c) 2020 D.Thiele All rights reserved.  
 * Licensed under the GNU GENERAL PUBLIC LICENSE.
 * See LICENSE file in the project root for full license information.
 * 
 * @description
 * Shorthand Document ready wrapper
 */

export function Ready() {
    return new Promise(resolve => {
        // If document is already loaded, run method
        if (document.readyState === 'interactive' || document.readyState === 'complete')
            resolve(true);
        // Otherwise, wait until document is loaded
        document.addEventListener('DOMContentLoaded', resolve, false);
    });
} 

export function ToggleClass(id: string, clas: string) {
    
}