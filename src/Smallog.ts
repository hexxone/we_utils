
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
			let trim = splt[depth].trim();
			if (trim.indexOf('at ') == 0) trim = trim.substring(3);
			if (splt.length > depth) return '[' + trim + '] ';
		}
	}
	return def;
}

/**
* @see {Smallog}
* @public
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
* @public
*/
export module Smallog {
	const logLevel: LogLevel = LogLevel.Info;
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
		if (printTime) msg = ('[' + new Date().toLocaleString() + '] ') + msg;
		console.error(hdr + msg);
	}

	/**
	* print info message
	* @param {string} msg log
	* @param {string} hdr overwrite header
	*/
	export function info(msg: string, hdr: string = preFix) {
		if (logLevel >= 1) {
			if (printTime) msg = ('[' + new Date().toLocaleString() + '] ') + msg;
			if (logLevel >= 2) hdr = traceCall(hdr);
			console.info(hdr + msg);
		}
	}

	/**
	* print debug message
	* @param {string} msg log
	* @param {string} hdr overwrite header
	*/
	export function debug(msg: string, hdr: string = preFix) {
		if (logLevel >= 2) {
			if (printTime) msg = ('[' + new Date().toLocaleString() + '] ') + msg;
			console.debug(hdr + msg);
		}
	}
}
