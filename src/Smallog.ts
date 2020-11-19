/**
 * @author D.Thiele @https://hexx.one
 */

export enum LogLevel {
    Error = 0,
    Info = 1,
    Debug = 2
}

export module Smallog {

    var logLevel: LogLevel = LogLevel.Info;
    var preFix: string = " AudiOrbits: ";
    var printTime: boolean = true;

    export function GetLevel() {
        return logLevel;
    }

    export function SetLevel(level: LogLevel) {
        logLevel = level;
    }

    export function Error(msg: string) {
        Log(console.error, msg);
    }

    export function Info(msg: string) {
        if (logLevel >= 1) Log(console.info, msg);
    }

    export function Debug(msg: string) {
        if (logLevel >= 2) Log(console.debug, msg);
    }

    function Log(call: any, msg: string) {
        var m = preFix+ msg;
        if (printTime) m = ("[" + new Date().toLocaleString() + "]") + m;
        call(m);
    }
}