/**
 * @author D.Thiele @https://hexx.one
 */


export function TraceCall(def: string, depth: number = 3) {
    try {
        throw new Error("TraceCall()");
    }
    catch (e) {
        // Examine e.stack here
        if (e.stack) {
            const splt = e.stack.split(/\n/);
            if (splt.length > depth) return "[" + splt[depth].trim().substring(3) + "] ";
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

    var logLevel: LogLevel = LogLevel.Debug; // todo level Info for release

    var preFix: string = "[Smallog] ";
    var printTime: boolean = false;

    export function GetLevel() {
        return logLevel;
    }

    export function SetLevel(level: LogLevel) {
        logLevel = level;
    }

    export function SetPrefix(pre: string) {
        preFix = pre;
    }

    export function Error(msg: string, hdr: string = preFix) {
        Log(console.error, msg, TraceCall(hdr));
    }

    export function Info(msg: string, hdr: string = preFix) {
        if (logLevel >= 2) hdr = TraceCall(hdr);
        if (logLevel >= 1) Log(console.info, msg, hdr);
    }

    export function Debug(msg: string, hdr: string = preFix) {
        if (logLevel >= 2) Log(console.debug, msg, TraceCall(hdr));
    }

    function Log(call: any, msg: string, hdr: string) {
        var m = msg;
        if (printTime) m = ("[" + new Date().toLocaleString() + "] ") + m;
        call(hdr + m);
    }
}