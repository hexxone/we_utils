
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
* @see {Smalog}
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
class Smalog {
	logLevel: LogLevel = LogLevel.Debug;
	preFix: string = '[Smallog] ';
	printTime: boolean = false;

	/**
	* trace exception calls
	* @param {string} def error message
	* @param {number} depth which call to pick
	* @return {string}
	* @ignore
	*/
	traceCall(def: string, depth: number = 3) {
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
	* get logging output level
	* @return {LogLevel} current
	*/
	getLevel() {
		return this.logLevel;
	}

	/**
	* set logging prefix
	* @param {string} pre
	*/
	setPrefix(pre: string) {
		this.preFix = pre;
	}

	/**
	* set time prefix
	* @param {boolean} print
	*/
	setPrintTime(print: boolean) {
		this.printTime = print;
	}

	/**
	* print error message
	* @param {string} msg log
	* @param {string} hdr overwrite header
	*/
	error(msg: string, hdr: string = this.preFix) {
		if (this.printTime) msg = ('[' + new Date().toLocaleString() + '] ') + msg;
		console.error(hdr + msg);
	}

	/**
	* print info message
	* @param {string} msg log
	* @param {string} hdr overwrite header
	*/
	info(msg: string, hdr: string = this.preFix) {
		if (this.logLevel >= 1) {
			if (this.printTime) msg = ('[' + new Date().toLocaleString() + '] ') + msg;
			if (this.logLevel >= 2) hdr = this.traceCall(hdr);
			console.info(hdr + msg);
		}
	}

	/**
	* print debug message
	* @param {string} msg log
	* @param {string} hdr overwrite header
	*/
	debug(msg: string, hdr: string = this.preFix) {
		if (this.logLevel >= 2) {
			if (this.printTime) msg = ('[' + new Date().toLocaleString() + '] ') + msg;
			console.debug(hdr + msg);
		}
	}
}

export const Smallog = new Smalog();
