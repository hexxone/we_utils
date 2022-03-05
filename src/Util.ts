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

import { WascInterface, wascWorker } from ".";

// promise resolve queue
const promQueue: ((val) => void)[] = [];
const workQueue = () => {
	while (promQueue.length > 0) {
		const call = promQueue.shift();
		call(true);
	}
};
document.addEventListener("DOMContentLoaded", workQueue, false);

/**
 * Shorthand Document ready wrapper
 * @public
 * @return {Promise} resolves when html document is ready
 */
export function waitReady() {
	return new Promise((resolve) => {
		// If document is already loaded, run method
		if (
			document.readyState === "interactive" ||
			document.readyState === "complete"
		) {
			resolve(true);
		}
		// Otherwise, wait until document is loaded
		promQueue.push(resolve);
	});
}

/**
 * @todo check for rgba errors
 * Convert helper
 * @param {string} r_g_b format: "r g b" where each is float 0-1
 * @param {number} mlt multiplier (default 255)
 * @return {Object} {r,g,b,a} with float 0-mlt
 */
export function rgbToObj(
	r_g_b: string,
	mlt = 255
): { r: number; g: number; b: number; a: number } {
	// fix support for rgba strings
	const brackI = r_g_b.indexOf("(");
	if (brackI > -1) {
		r_g_b = r_g_b.substring(brackI + 1, r_g_b.indexOf(")"));
	}
	// do splitting and multiplying
	const spl = r_g_b.split(" ") as any[];
	for (let i = 0; i < spl.length; i++) {
		spl[i] = isNaN(spl[i]) ? 0 : Math.min(mlt, Math.max(0, spl[i] * mlt));
	}
	return {
		r: spl[0] || 0,
		g: spl[1] || 0,
		b: spl[2] || 0,
		a: spl[3] || 1 * mlt,
	};
}

/**
 * Convert helper
 * @param {string} r_g_b format: "r g b" where each is float 0-1
 * @return {Object} {h,s,l} with float 0-1
 */
export function rgbToHSL(r_g_b: string): { h: number; s: number; l: number } {
	const cO = rgbToObj(r_g_b, 1);
	const ma = Math.max(cO.r, cO.g, cO.b);
	const mi = Math.min(cO.r, cO.g, cO.b);
	const hsl = { h: 0, s: 0, l: (mi + ma) / 2 };
	const t = ma - mi;
	switch (((hsl.s = hsl.l <= 0.5 ? t / (ma + mi) : t / (2 - ma - mi)), ma)) {
		case cO.r:
			hsl.h = (cO.g - cO.b) / t + (cO.g < cO.b ? 6 : 0);
			break;
		case cO.g:
			hsl.h = (cO.b - cO.r) / t + 2;
			break;
		case cO.b:
			hsl.h = (cO.r - cO.g) / t + 4;
	}
	hsl.h /= 6;
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
	const iso =
		window["crossOriginIsolated"] === true ||
		window.location.protocol == "file:";
	if (iso) bldr = bldr.replace(".wasm", ".shared.wasm");
	return wascWorker(bldr, memory, iso, options, useWorker);
}
