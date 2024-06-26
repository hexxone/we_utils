/**
 * @author hexxone / https://hexx.one
 *
 * @license
 * Copyright (c) 2024 hexxone All rights reserved.
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
     * Print warnings and Info
     */
    Warn = 1,

    /**
     * Print error and info messages
     */
    Info = 2,

    /**
     * Print all messages
     */
    Debug = 3
}

/**
 * Small logging util, with name/time prefix & log levels
 */
class Smalog {

    logLevel: LogLevel = LogLevel.Info; // @todo change default logging level
    preFix = '[Smallog] ';
    printTime = false;
    printTrace = false;

    /**
     * trace exception calls
     * @param {string} def error message
     * @param {number} depth which call to pick
     * @returns {string} error message
     * @ignore
     */
    traceCall(def: string, depth = 3): string {
        try {
            throw new Error('trace()');
        } catch (e) {
            // Examine e.stack here
            if (e.stack) {
                const splt = e.stack.split(/\n/);
                let trim = splt[depth].trim();

                if (trim.indexOf('at ') === 0) {
                    trim = trim.substring(3);
                }
                if (splt.length > depth) {
                    return `[${trim}] `;
                }
            }
        }

        return def;
    }

    /**
     * get logging output level
     * @returns {LogLevel} current
     */
    getLevel() {
        return this.logLevel;
    }

    /**
     * set logging prefix
     * @param {string} pre new prefix
     * @returns {void}
     */
    setPrefix(pre: string) {
        this.preFix = pre;
    }

    /**
     * set time prefix
     * @param {boolean} print true to print time
     * @returns {void}
     */
    setPrintTime(print: boolean) {
        this.printTime = print;
    }

    /**
     * print error message
     * @param {string} msg log
     * @param {string} hdr overwrite header
     * @returns {void}
     */
    error(msg: string, hdr: string = this.preFix) {
        if (this.printTime) {
            msg = `[${new Date().toLocaleString()}] ${msg}`;
        }
        // should print the trace as a browser feature by default.
        console.error(hdr + msg);
    }

    /**
     * print info message
     * @param {string} msg log
     * @param {string} hdr overwrite header
     * @returns {void}
     */
    warn(msg: string, hdr: string = this.preFix) {
        if (this.logLevel >= 1) {
            if (this.printTime) {
                msg = `[${new Date().toLocaleString()}] ${msg}`;
            }
            if (this.printTrace) {
                hdr = this.traceCall(hdr);
            }
            console.warn(hdr + msg);
        }
    }

    /**
     * print info message
     * @param {string} msg log
     * @param {string} hdr overwrite header
     * @returns {void}
     */
    info(msg: string, hdr: string = this.preFix) {
        if (this.logLevel >= 1) {
            if (this.printTime) {
                msg = `[${new Date().toLocaleString()}] ${msg}`;
            }
            if (this.printTrace) {
                hdr = this.traceCall(hdr);
            }
            console.info(hdr + msg);
        }
    }

    /**
     * print debug message
     * @param {string} msg log
     * @param {string} hdr overwrite header
     * @returns {void}
     */
    debug(msg: string, hdr: string = this.preFix) {
        if (this.logLevel >= 2) {
            if (this.printTime) {
                msg = `[${new Date().toLocaleString()}] ${msg}`;
            }
            if (this.printTrace) {
                hdr = this.traceCall(hdr);
            }
            console.debug(hdr + msg);
        }
    }

}

export const Smallog = new Smalog();
