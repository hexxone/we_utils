
/**
* @author hexxone / https://hexx.one
*
* @license
* Copyright (c) 2021 hexxone All rights reserved.
* Licensed under the GNU GENERAL PUBLIC LICENSE.
* See LICENSE file in the project root for full license information.
*/

/* eslint-disable no-unused-vars */

/**
 * trace exception calls
 * @param {string} def error message
 * @param {number} depth which call to pick
 * @return {string}
 * @ignore
 */
function traceCall(def: string, depth: number = 3) {
	try {
		throw new Error('TraceCall()');
	} catch (e) {
		// Examine e.stack here
		if (e.stack) {
			const splt = e.stack.split(/\n/);
			if (splt.length > depth) return '[' + splt[depth].trim().substring(3) + '] ';
		}
	}
	return def;
}

/**
 * @see {Smallog}
 */
export enum LogLevel {
	/**
	 * Print only error messages
	 */
	Error = 0,
	/**
	 * Print error and info messages
	 */
	Info = 1,
	/**
	 * Print all messages
	 */
	Debug = 2
}

/**
 * Small logging util, with name/time prefix & log levels
 */
export module Smallog {

	let logLevel: LogLevel = LogLevel.Debug; // todo level Info for release
	let preFix: string = '[Smallog] ';
	let printTime: boolean = false;

	/**
	 * get logging output level
	 * @return {LogLevel} current
	 */
	export function getLevel() {
		return logLevel;
	}

	/**
	 * set logging output level
	 * @param {LogLevel} level new
	 */
	export function setLevel(level: LogLevel) {
		logLevel = level;
	}

	/**
	 * set logging prefix
	 * @param {string} pre
	 */
	export function setPrefix(pre: string) {
		preFix = pre;
	}

	/**
	 * set time prefix
	 * @param {boolean} print
	 */
	export function setPrintTime(print: boolean) {
		printTime = print;
	}

	/**
	 * print error message
	 * @param {string} msg log
	 * @param {string} hdr overwrite header
	 */
	export function error(msg: string, hdr: string = preFix) {
		log(console.error, msg, traceCall(hdr));
	}

	/**
	 * print info message
	 * @param {string} msg log
	 * @param {string} hdr overwrite header
	 */
	export function info(msg: string, hdr: string = preFix) {
		if (logLevel >= 2) hdr = traceCall(hdr);
		if (logLevel >= 1) log(console.info, msg, hdr);
	}

	/**
	 * print debug message
	 * @param {string} msg log
	 * @param {string} hdr overwrite header
	 */
	export function debug(msg: string, hdr: string = preFix) {
		if (logLevel >= 2) log(console.debug, msg, traceCall(hdr));
	}

	/**
	 * internal logging function
	 * @param {Function} call log callback
	 * @param {string} msg text to print
	 * @param {string} hdr header to include
	 * @ignore
	 */
	function log(call: (...data: any) => void, msg: string, hdr: string) {
		let m = msg;
		if (printTime) m = ('[' + new Date().toLocaleString() + '] ') + m;
		call(hdr + m);
	}
}
