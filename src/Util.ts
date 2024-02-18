/**
 * @author hexxone / https://hexx.one
 *
 * @license
 * Copyright (c) 2024 hexxone All rights reserved.
 * Licensed under the GNU GENERAL PUBLIC LICENSE.
 * See LICENSE file in the project root for full license information.
 *
 * @ignore
 */

import { wascWorker } from './wasc-worker/Wasc';
import { WascInterface } from './wasc-worker/WascInterface';

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
 * Shorthand Document ready wrapper
 * @public
 * @returns {Promise} resolves when html document is ready
 */
export function waitReady() {
    return new Promise((resolve) => {
        // If document is already loaded, run method
        if (
            document.readyState === 'interactive'
            || document.readyState === 'complete'
        ) {
            resolve(true);
        }
        // Otherwise, wait until document is loaded
        promQueue.push(resolve);
    });
}

/**
 * Color Convert helper
 * Support following input formats:
 *     - RGB float notation: "r g b"
 *     - RGBA float notation: "r g b a"
 *     - RGB hex notation: "#RRGGBB"
 *     - RGBA hex notation: "#RRGGBBAA"
 *  - RGB bracket notation: "rgb(r, g, b)"
 *  - RGBA bracket notation: "rgba(r, g, b, a)"
 * @param {string} input format: "r g b a" where each is float 0-1, or hex color notation "#RRGGBBAA", or "rgba(r, g, b, a)"
 * @param {number} mlt multiplier (default 255)
 * @returns {Object} {r,g,b,a} with float 0-mlt
 */
export function rgbToObj(
    input: string,
    mlt = 255
): { r: number; g: number; b: number; a: number } {
    if (input.startsWith('#')) {
        let hex = input.replace('#', '');

        if (hex.length === 3) {
            hex = `${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`;
        }
        if (hex.length === 4) {
            hex = `${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
        }

        const r = (parseInt(hex.substring(0, 2), 16) / 255) * mlt;
        const g = (parseInt(hex.substring(2, 4), 16) / 255) * mlt;
        const b = (parseInt(hex.substring(4, 6), 16) / 255) * mlt;
        const a = input.length === 8 ? parseInt(hex.substring(6, 8), 16) : mlt;

        return {
            r,
            g,
            b,
            a
        };
    }

    const brackI = input.indexOf('(');

    if (brackI > -1) {
        input = input.substring(brackI + 1, input.indexOf(')'));
    }

    const spl = input.split(/[\s,]+/).map(parseFloat);

    for (let i = 0; i < spl.length; i++) {
        spl[i] = isNaN(spl[i]) ? 0 : Math.min(mlt, Math.max(0, spl[i] * mlt));
    }

    if (spl.length < 4) {
        spl[3] = mlt;
    }

    return {
        r: spl[0] || 0,
        g: spl[1] || 0,
        b: spl[2] || 0,
        a: spl[3]
    };
}

/**
 * Color Convert helper
 * Support following input formats:
 *     - RGB float notation: "r g b"
 *     - RGBA float notation: "r g b a"
 *     - RGB hex notation: "#RRGGBB"
 *     - RGBA hex notation: "#RRGGBBAA"
 *  - RGB bracket notation: "rgb(r, g, b)"
 *  - RGBA bracket notation: "rgba(r, g, b, a)"
 * @param {string} input format: "r g b a" where each is float 0-1, or hex color notation "#RRGGBBAA", or "rgba(r, g, b, a)"
 * @returns {Object} {h,s,l} with float 0-1
 */
export function rgbToHSL(input: string): { h: number; s: number; l: number } {
    const colorObject = rgbToObj(input, 1);
    const { r } = colorObject;
    const { g } = colorObject;
    const { b } = colorObject;
    const ma = Math.max(r, g, b);
    const mi = Math.min(r, g, b);
    const hsl = {
        h: 0,
        s: 0,
        l: (mi + ma) / 2
    };
    const t = ma - mi;

    if (t !== 0) {
        hsl.s = hsl.l <= 0.5 ? t / (ma + mi) : t / (2 - ma - mi);
        switch (ma) {
            case r:
                hsl.h = (g - b) / t + (g < b ? 6 : 0);
                break;
            case g:
                hsl.h = (b - r) / t + 2;
                break;
            case b:
                hsl.h = (r - g) / t + 4;
        }
        hsl.h /= 6;
    }

    return hsl;
}

/**
 * Proxy shared or non-shared module call
 * @param {string} bldr file to load
 * @param {number} memory max mem (shared needs limit)
 * @param {any} options module options
 * @param {boolean} useWorker or load inline
 * @returns {Promise<WascInterface>} loaded module
 */
export function sharedWorker(
    bldr: string,
    memory = 4096,
    options?: any,
    useWorker = true
): Promise<WascInterface> {
    const isolated
        = window.crossOriginIsolated === true
        || window.location.protocol === 'file:';

    if (isolated) {
        bldr = bldr.replace('.wasm', '.shared.wasm');
    }

    return wascWorker(bldr, memory, isolated, options, useWorker);
}

/**
 * Checks whether webgl is available in the current browser
 * @returns {boolean} is Supported?
 */
export function webglSupported() {
    try {
        const cvs = document.createElement('canvas');

        return (
            !!window.WebGLRenderingContext
            && (cvs.getContext('webgl') || cvs.getContext('experimental-webgl'))
        );
    } catch (e) {
        return false;
    }
}

/**
 * Tries to get the correct inner Window Size (for mobile browser mainly).
 * This is needed because some mobile browsers include the nav-bar size in the "innerHeight" prop...
 * @returns {{x: number, y: number}} Tuple x,y
 */
export function getRealWindowSize(): { x: number; y: number } {
    const realHeight
        = document.documentElement.clientHeight ?? window.innerHeight;
    const realWidth = document.documentElement.clientWidth ?? window.innerWidth;

    return {
        x: realWidth,
        y: realHeight
    };
}
