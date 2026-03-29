/**
 * @author hexxone / https://hexx.one
 *
 * @license
 * Copyright (c) 2026 hexxone All rights reserved.
 * Licensed under the GNU GENERAL PUBLIC LICENSE.
 * See LICENSE file in the project root for full license information.
 *
 * @ignore
 */

import { wascWorker } from './wasc-worker/Wasc';
import { WascInterface } from './wasc-worker/WascInterface';
import { Color } from './three.ts/src/math/Color';

// promise resolve queue
const promQueue: ((params: any) => void)[] = [];

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
        // If the document is already loaded, run method
        if (
            document.readyState === 'interactive'
            || document.readyState === 'complete'
        ) {
            resolve(true);

            return;
        }
        // Otherwise, wait until the document is loaded
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
type ParsedColor = {
    r: number;
    g: number;
    b: number;
    a: number;
};

function clamp01(value: number): number {
    return Math.min(1, Math.max(0, value));
}

function parseUnitChannel(value: string): number {
    const num = parseFloat(value);

    if (!Number.isFinite(num)) {
        return 0;
    }

    return num > 1 ? clamp01(num / 255) : clamp01(num);
}

function parseAlphaChannel(value?: string): number {
    if (value === undefined || value === null || value === '') {
        return 1;
    }

    const trimmed = String(value).trim();

    if (trimmed.endsWith('%')) {
        const num = parseFloat(trimmed.slice(0, -1));

        return Number.isFinite(num) ? clamp01(num / 100) : 1;
    }

    const num = parseFloat(trimmed);

    if (!Number.isFinite(num)) {
        return 1;
    }

    return num > 1 ? clamp01(num / 255) : clamp01(num);
}

function parseHexColor(input: string): ParsedColor | null {
    const match = input.match(/^#([a-f\d]{3,4}|[a-f\d]{6}|[a-f\d]{8})$/i);

    if (!match) {
        return null;
    }

    let hex = match[1];

    if (hex.length === 3 || hex.length === 4) {
        hex = hex
            .split('')
            .map((char) => {
                return char + char;
            })
            .join('');
    }

    if (hex.length === 6) {
        hex += 'ff';
    }

    return {
        r: parseInt(hex.slice(0, 2), 16) / 255,
        g: parseInt(hex.slice(2, 4), 16) / 255,
        b: parseInt(hex.slice(4, 6), 16) / 255,
        a: parseInt(hex.slice(6, 8), 16) / 255
    };
}

function parseFloatColor(input: string): ParsedColor | null {
    if (input.includes('(') || input.startsWith('#')) {
        return null;
    }

    const parts = input
        .trim()
        .split(/[\s,]+/)
        .filter(Boolean);

    if (parts.length < 3 || parts.length > 4) {
        return null;
    }

    if (
        parts.some((part) => {
            return !Number.isFinite(parseFloat(part));
        })
    ) {
        return null;
    }

    return {
        r: parseUnitChannel(parts[0]),
        g: parseUnitChannel(parts[1]),
        b: parseUnitChannel(parts[2]),
        a: parseAlphaChannel(parts[3])
    };
}

function parseRgbFunction(input: string): ParsedColor | null {
    const match = input.match(/^rgba?\(([^)]*)\)$/i);

    if (!match) {
        return null;
    }

    const parts = match[1].split(',').map((part) => {
        return part.trim();
    });

    if (parts.length < 3 || parts.length > 4) {
        return null;
    }

    const parseRgbChannel = (value: string) => {
        if (value.endsWith('%')) {
            const num = parseFloat(value.slice(0, -1));

            return Number.isFinite(num) ? clamp01(num / 100) : 0;
        }

        return parseUnitChannel(value);
    };

    return {
        r: parseRgbChannel(parts[0]),
        g: parseRgbChannel(parts[1]),
        b: parseRgbChannel(parts[2]),
        a: parseAlphaChannel(parts[3])
    };
}

function parseStyleColor(input: string): ParsedColor | null {
    const style = input.trim();
    const lower = style.toLowerCase();
    const hslMatch = lower.match(/^hsla?\(([^)]*)\)$/);
    const isKnownName = Color.NAMES[lower] !== undefined;

    if (!hslMatch && !isKnownName) {
        return null;
    }

    const color = new Color();

    if (hslMatch) {
        color.setStyle(lower);
    } else {
        color.setColorName(lower);
    }

    const alpha = hslMatch
        ? parseAlphaChannel(
            hslMatch[1]
                .split(',')
                .map((part) => {
                    return part.trim();
                })[3]
        )
        : 1;

    return {
        r: color.r,
        g: color.g,
        b: color.b,
        a: alpha
    };
}

function parseColorInput(input: string): ParsedColor | null {
    if (typeof input !== 'string') {
        return null;
    }

    const trimmed = input.trim();

    if (!trimmed) {
        return null;
    }

    return (
        parseHexColor(trimmed)
        || parseRgbFunction(trimmed)
        || parseFloatColor(trimmed)
        || parseStyleColor(trimmed)
    );
}

function formatNormalizedColor(value: number): string {
    return clamp01(value)
        .toFixed(6)
        .replace(/\.?0+$/, '');
}

export function normalizeColorInput(
    input: string,
    includeAlpha = false
): string | null {
    const parsed = parseColorInput(input);

    if (!parsed) {
        return null;
    }

    const parts = [
        formatNormalizedColor(parsed.r),
        formatNormalizedColor(parsed.g),
        formatNormalizedColor(parsed.b)
    ];

    if (includeAlpha || parsed.a < 1) {
        parts.push(formatNormalizedColor(parsed.a));
    }

    return parts.join(' ');
}

export function rgbToObj(
    input: string,
    mlt: number = 255
): { r: number; g: number; b: number; a: number } {
    const parsed = parseColorInput(input);

    if (!parsed) {
        return {
            r: 0,
            g: 0,
            b: 0,
            a: mlt
        };
    }

    return {
        r: parsed.r * mlt,
        g: parsed.g * mlt,
        b: parsed.b * mlt,
        a: parsed.a * mlt
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
