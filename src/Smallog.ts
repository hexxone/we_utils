
/**
* @author hexxone / https://hexx.one
*
* @license
* Copyright (c) 2021 hexxone All rights reserved.
* Licensed under the GNU GENERAL PUBLIC LICENSE.
* See LICENSE file in the project root for full license information.
*/

/* eslint-disable no-unused-vars */
/* eslint-disable require-jsdoc */

export function traceCall(def: string, depth: number = 3) {
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

export enum LogLevel {
	Error = 0,
	Info = 1,
	Debug = 2
}

export module Smallog {

	let logLevel: LogLevel = LogLevel.Debug; // todo level Info for release
	let preFix: string = '[Smallog] ';
	let printTime: boolean = false;

	export function GetLevel() {
		return logLevel;
	}

	export function setLevel(level: LogLevel) {
		logLevel = level;
	}

	export function setPrefix(pre: string) {
		preFix = pre;
	}

	export function SetPrintTime(print: boolean) {
		printTime = print;
	}

	export function Error(msg: string, hdr: string = preFix) {
		log(console.error, msg, traceCall(hdr));
	}

	export function info(msg: string, hdr: string = preFix) {
		if (logLevel >= 2) hdr = traceCall(hdr);
		if (logLevel >= 1) log(console.info, msg, hdr);
	}

	export function debug(msg: string, hdr: string = preFix) {
		if (logLevel >= 2) log(console.debug, msg, traceCall(hdr));
	}

	function log(call: any, msg: string, hdr: string) {
		let m = msg;
		if (printTime) m = ('[' + new Date().toLocaleString() + '] ') + m;
		call(hdr + m);
	}
}
