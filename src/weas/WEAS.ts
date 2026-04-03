/**
 * @author hexxone / https://hexx.one
 *
 * @license
 * Copyright (c) 2026 hexxone All rights reserved.
 * Licensed under the GNU GENERAL PUBLIC LICENSE.
 * See LICENSE file in the project root for full license information.
 */

import { CComponent } from '../CComponent';
import { CSettings } from '../CSettings';
import { Smallog } from '../Smallog';
import { getRealWindowSize, sharedWorker, waitReady } from '../Util';
import { WascInterface } from '../wasc-worker/WascInterface';
import { BeatAnalysis, TempoAnalyzerMode, TempoAnalyzerModeValue } from './Bea';
import { WEAITempoAnalyzer } from './WEAI';

const DAT_LEN = 128;
const LISTENAME = 'wallpaperRegisterAudioListener';
const AUDIO_ACTIVE_TIMEOUT_MS = 3000;
const AUDIO_DEBUG_HIDE_TIMEOUT_MS = 5000;
const METRIC_COLORS = {
    bass: '#ff6361',
    mids: '#ffd166',
    highs: '#06d6a0',
    peakActivation: '#f72585',
    sum: '#8ecae6',
    min: '#9b5de5',
    max: '#ef476f',
    average: '#ffffff',
    range: '#f4a261',
    silent: '#7a8594',
    intensity: '#118ab2'
};

/**
 * Audio processing settings.
 * Even though some may appear unused, they are all required for the WebAssembly module.
 * @extends {CSettings}
 * @public
 */
export class WEASettings extends CSettings {

    debugging = false;

    /** do audio processing? */
    audioprocessing = true;
    // do dynamic processing?
    equalize = true;
    // convert to mono?
    mono_audio = true;
    // invert low & high freqs?
    audio_direction = 0;
    // peak filtering
    peak_filter = 1;
    // neighbour-smoothing value
    value_smoothing = 2;
    // time-value smoothing ratio
    audio_increase = 75;
    audio_decrease = 25;
    // multipliers
    treble_multiplier = 0.666;
    mids_multiplier = 0.8;
    bass_multiplier = 1.2;
    // ignore value leveling for "silent" data
    minimum_volume = 0.005;
    // tempo analyzer mode
    analyzer_mode: TempoAnalyzerModeValue = TempoAnalyzerMode.General;
    // use low latency audio?
    low_latency = false;
    // show debug rendering?
    show_canvas = true;

}

/**
 * Processed audio data representation
 * @public
 */
export type WEAudio = {
    time: number;
    ellapsed: number;
    data: Float64Array;
    bass: number;
    mids: number;
    highs: number;
    sum: number;
    min: number;
    max: number;
    average: number;
    range: number;
    silent: number;
    intensity: number;
    bpm?: BpmDataWip[];
    peakActivation?: number;
    phaseLock?: number;
    beatPhase?: number;
    isBeat?: boolean;
    beatConfidence?: number;
    secondsSinceLastBeat?: number;
    secondsToNextBeat?: number;
    beatInterval?: number;
    lastBeatTime?: number;
    nextBeatTime?: number;
    analyzerMode?: TempoAnalyzerModeValue;
    analyzerBackend?: 'heuristic' | 'ai-webgpu' | 'ai-wasm' | 'fallback-edm';
    aiReady?: boolean;
    aiInferenceMs?: number;
    aiModelConfidence?: number;
    aiFrameStride?: number;
    primaryPulseSource?: string;
    tempoFamily?: string;
    transientCorroboration?: boolean;
    switchConfidence?: number;
};

export type BpmDataWip = {
    value: number;
    weight: number;
};

/**
 * @public
 */
const SettIDs = {
    equalize: 0,
    mono_audio: 1,
    audio_direction: 2,
    peak_filter: 3,
    value_smoothing: 4,
    audio_increase: 5,
    audio_decrease: 6,
    treble_multiplier: 7,
    mids_multiplier: 8,
    bass_multiplier: 9,
    minimum_volume: 10
};

/**
 * @public
 */
const PropIDs = {
    bass: 0,
    mids: 1,
    highs: 2,
    sum: 3,
    min: 4,
    max: 5,
    average: 6,
    range: 7,
    silent: 8,
    intensity: 9
};

/**
 * WEAS
 * <br/>
 * Wallpaper Engine Audio Supplier makes working with audio easier.
 * <br/>
 * It will automatically start to receive and process the audio data
 * which can then be accessed on the global object.
 * <br/>
 * DEPENDS ON:
 * <br/>
 * - Wallpaper Engine Web Wallpaper environment
 * <br/>
 * - audio-processing supported web wallpaper
 * @extends {CComponent}
 * @public
 */
export class WEAS extends CComponent {


    /** @public last processed audio object */
    public lastAudio: WEAudio | undefined;

    /** @public settings object */
    public settings: WEASettings = new WEASettings();

    /** @public transfer buffer (last raw data) */
    public inBuff = new Float64Array(DAT_LEN);

    // has context been set?
    initialized = false;

    // web assembly functions
    weasModule: WascInterface = null;

    // bpm detektor
    bpModule: WEAITempoAnalyzer;

    // debug render elements
    mainElm: HTMLDivElement;
    canvas1: HTMLCanvasElement;
    context1: CanvasRenderingContext2D;
    canvas2: HTMLCanvasElement;
    context2: CanvasRenderingContext2D;
    canvas3: HTMLCanvasElement;
    context3: CanvasRenderingContext2D;
    display: HTMLElement;
    private lastAudibleTime = 0;
    private debugCanvasVisible = true;
    private debugCanvasCleared = true;
    private metricLogPeak = 1;
    private debugBeatFlashUntil = 0;

    public init?: () => Promise<void>;

    /**
     * Constructs a new Wallpaper Engine Audio Supplier.
     * @param {boolean} autoInit start listening automatically after page is ready?
     * @param {boolean} detectBpm (optional)
     */
    constructor(autoInit: boolean = false, detectBpm: boolean = false) {
        super();
        if (detectBpm) {
            this.bpModule = new WEAITempoAnalyzer(this.settings.analyzer_mode);
        }
        if (autoInit) {
            waitReady().then(() => {
                return this.realInit();
            });
        } else {
            this.init = this.realInit;
        }
    }

    /**
     * initializes audio processing pipeline
     * and starts listening on audio data
     * @ignore
     * @returns {void}
     */
    private async realInit() {
        // only listen if wallpaper engine context given
        if (!window[LISTENAME]) {
            Smallog.warn("'window.wallpaperRegisterAudioListener' not given!");

            return;
        }
        this.init = null;

        this.injectCSS();
        this.injectHTML();

        sharedWorker('WEAS.wasm', 4096, {}, !this.settings.low_latency)
            .then((myModule) => {
                this.weasModule = myModule;

                if (myModule.shared) {
                    Smallog.debug('Got shared WebAssembly audio!');
                }

                this.updateSettings().then(() => {
                    this.registerListener();
                    this.initialized = true;
                    Smallog.debug('WebAssembly Audio provider is ready!');
                });
            })
            .catch((err) => {
                const m = `Could not create WebAssembly Audio provider! ErrMsg: ${err}`;

                Smallog.error(m);
                alert(m);
            });
    }

    /**
     * Registers the wallpaper engine audio listener
     * @returns {void}
     * @ignore
     */
    private registerListener(): void {
        // register audio callback on module
        window[LISTENAME]((audioArray) => {
            // Smallog.debug('Get Audio Data!');
            // check basic
            if (
                !this.settings.audioprocessing
                || audioArray === null
                || audioArray.length !== DAT_LEN
            ) {
                Smallog.error(
                    `received invalid audio data: ${JSON.stringify([audioArray?.length || null, audioArray])}`
                );

                return;
            }

            // prepare data
            const start = performance.now();

            this.inBuff.set(audioArray);

            // WRAP IN isolated Function ran inside worker
            this.weasModule
                .run(
                    ({ instance, exports, params }) => {
                        const ex = instance.exports as any;
                        const { data } = params[0];
                        const arrData = new Float64Array(data);

                        // set audio data directly in module memory
                        exports
                            .__getFloat64ArrayView(ex.inputData)
                            .set(arrData);
                        // trigger processing
                        ex.update();

                        // get a copy of webassembly data
                        return {
                            // ptr: {data: ex.outputData, props: ex.audioProps},
                            data: new Float64Array(
                                exports.__getFloat64ArrayView(ex.outputData)
                            ).buffer,
                            props: new Float64Array(
                                exports.__getFloat64ArrayView(ex.audioProps)
                            ).buffer
                        };
                    },
                    {
                        data: this.inBuff.buffer
                    }
                )
                .then((result) => {
                    // worker result, back in main context
                    const { data, props } = result;
                    const arrData = new Float64Array(data);
                    const arrProps = new Float64Array(props);

                    const realProps = this.getProps(arrProps);
                    const teim = performance.now() - start;

                    // if (
                    //     this.lastAudio
                    //     && !this.lastAudio.silent
                    //     && realProps.silent
                    // ) {
                    //     console.debug(audioArray, arrData, arrProps);
                    // }

                    let bpmObj: BeatAnalysis | undefined;

                    if (this.bpModule) {
                        bpmObj = this.bpModule.process(
                            start / 1000.0,
                            audioArray
                        );
                    }

                    if (!realProps.silent) {
                        this.lastAudibleTime = start;
                    }

                    // apply actual last Data from worker
                    this.lastAudio = {
                        time: start,
                        ellapsed: teim,
                        data: arrData,
                        ...realProps,
                        ...(bpmObj || {})
                    } as any;
                    this.triggerDebugBeatFlash();
                });
        });
    }

    /**
     * Inject preview CSS
     * @returns {void}
     * @ignore
     */
    private injectCSS(): void {
        const st = document.createElement('style');

        st.innerHTML = `
#weas-preview {
    opacity: 0;
    position: fixed;
    top: 12px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 2;
    width: min(60vw, 960px);
    height: calc(100vh - 24px);
    max-height: calc(100vh - 24px);
    padding: 12px;
    color: #f5f7fb;
    background: linear-gradient(180deg, rgba(16, 21, 28, 0.66), rgba(10, 14, 18, 0.6));
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 18px;
    box-shadow: 0 24px 60px rgba(0,0,0,0.38);
    backdrop-filter: blur(14px);
    font-family: "Overpass Mono", monospace;
    box-sizing: border-box;
    overflow-y: auto;
    overflow-x: hidden;
    scrollbar-width: thin;
    scrollbar-color: rgba(255,255,255,0.18) rgba(255,255,255,0.05);
}
#weas-preview canvas {
    display: block;
    width: 100%;
    background: linear-gradient(180deg, rgba(14, 20, 26, 0.68), rgba(7, 10, 14, 0.62));
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 12px;
    margin: 6px 0 10px 0;
}
#weas-preview.show {
    opacity: 1;
    transition: none !important;
}
#WEASDisplay {
    display: block;
    min-height: 52px;
    overflow: hidden;
    white-space: pre-wrap;
    padding: 10px;
    margin: 6px 0 8px 0;
    border-radius: 12px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.08);
    font-size: 0.85rem;
    line-height: 1.2;
}
#weas-preview .weas-title {
    font-size: 1.1rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    text-align: center;
    margin-bottom: 2px;
}
#weas-preview .weas-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    margin-bottom: 2px;
}
#weas-preview .weas-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 10px 14px;
    margin: 4px 0 6px 0;
    font-size: 0.74rem;
    line-height: 1.1;
}
#weas-preview .weas-legend span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
}
#weas-preview .weas-legend i {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 999px;
}
#weas-preview::-webkit-scrollbar {
    width: 10px;
}
#weas-preview::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,0.18);
    border-radius: 999px;
}
#weas-preview::-webkit-scrollbar-track {
    background: rgba(255,255,255,0.05);
}
@media all and (max-width: 900px) {
    #weas-preview {
        width: calc(100vw - 24px);
    }
    #weas-preview canvas {
        width: 100%;
    }
}`;
        document.head.append(st);
    }

    /**
     * Inject preview canvas
     * @returns {void}
     * @ignore
     */
    private injectHTML() {
        this.mainElm = document.createElement('div');
        this.mainElm.id = 'weas-preview';
        this.mainElm.innerHTML = `
<div class="weas-title">WEAS Debug Preview</div>
<div class="weas-row">
<span>Raw Data</span>
<span>Left / Right</span>
</div>
<canvas id="WEASCanvas1"></canvas>
<div class="weas-row">
<span>Processed Metrics</span>
</div>
<span id="WEASDisplay"></span>
<div class="weas-legend">
<span><i style="background:${METRIC_COLORS.bass}"></i>bass</span>
<span><i style="background:${METRIC_COLORS.mids}"></i>mids</span>
<span><i style="background:${METRIC_COLORS.highs}"></i>highs</span>
<span><i style="background:${METRIC_COLORS.peakActivation}"></i>peak</span>
<span><i style="background:${METRIC_COLORS.sum}"></i>sum</span>
<span><i style="background:${METRIC_COLORS.min}"></i>min</span>
<span><i style="background:${METRIC_COLORS.max}"></i>max</span>
<span><i style="background:${METRIC_COLORS.average}"></i>average</span>
<span><i style="background:${METRIC_COLORS.range}"></i>range</span>
<span><i style="background:${METRIC_COLORS.silent}"></i>silent</span>
<span><i style="background:${METRIC_COLORS.intensity}"></i>intensity</span>
</div>
<canvas id="WEASCanvas3"></canvas>
<div class="weas-row">
<span>Spectrum</span>
</div>
<canvas id="WEASCanvas2"></canvas>`;
        document.body.append(this.mainElm);

        const { x: realWidth } = getRealWindowSize();
        // TODO should also apply Height ????

        this.canvas1 = document.getElementById(
            'WEASCanvas1'
        ) as HTMLCanvasElement;
        this.canvas1.width = realWidth;
        this.context1 = this.canvas1.getContext('2d');

        this.canvas2 = document.getElementById(
            'WEASCanvas2'
        ) as HTMLCanvasElement;
        this.canvas2.width = realWidth;
        this.context2 = this.canvas2.getContext('2d');

        this.canvas3 = document.getElementById(
            'WEASCanvas3'
        ) as HTMLCanvasElement;
        this.canvas3.width = realWidth;
        this.context3 = this.canvas3.getContext('2d');

        this.display = document.getElementById('WEASDisplay');
        window.addEventListener('resize', this.updateDebugLayout, {
            passive: true
        });
        this.updateDebugLayout();
        this.setCanvasPreviewVisible(false);
    }

    /**
     * converts calculated output property number-array to string-associative-array
     * @param {ArrayLike<number>} dProps processed properties
     * @returns {any} props
     * @ignore
     */
    private getProps(dProps: ArrayLike<number>): any {
        const keys = Object.keys(PropIDs);
        const res = {};

        for (let index = 0; index < keys.length; index++) {
            const key = keys[index];

            res[key] = dProps[PropIDs[key]];
        }

        return res;
    }


    /**
     * @returns {boolean} false if:
     * <br/>
     * - processing is disabled
     * <br/>
     * - there is no data
     * <br/>
     * - the data is silent
     * <br/>
     * - data is too old (> 3s)
     * @public
     */
    public hasAudio(): boolean {
        return (
            this.initialized
            && this.settings.audioprocessing
            && this.hasRecentAudioSample()
            && this.lastAudio.silent <= 0
        );
    }

    /**
     * !! CAVEAT: only available after init and module load !!
     * <br/>
     * Will send the processing settings to the WebAssembly module
     * @returns {Promise} finished event
     * @public
     */
    public updateSettings(): Promise<void> {
        if (this.bpModule) {
            this.bpModule.setMode(this.settings.analyzer_mode);
        }

        if (!this.weasModule) {
            return;
        }

        // show or hide debug info
        if (this.settings.debugging) {
            if (!this.mainElm.classList.contains('show')) {
                this.mainElm.classList.add('show');
            }
        } else {
            this.mainElm.classList.remove('show');
        }
        const { run } = this.weasModule;

        return new Promise((resolve) => {
            const keys = Object.keys(SettIDs);
            const sett = new Float64Array(keys.length);

            for (let index = 0; index < keys.length; index++) {
                const key = keys[index];

                sett[SettIDs[key]] = this.settings[key] || 0;
            }

            // isolated Function running inside worker
            run(
                ({ instance, exports, params }) => {
                    const ex = instance.exports as any;
                    const { data } = params[0];
                    const arrDat = new Float64Array(data);

                    exports.__getFloat64ArrayView(ex.audioSettings).set(arrDat);
                },
                {
                    // Data passed to worker
                    data: sett.buffer
                }
            ).then(() => {
                // Back to main context
                Smallog.debug(`Sent Settings to WEAS: ${JSON.stringify(sett)}`);
                resolve();
            });
        });
    }

    /**
     * Update the debug canvas
     * @returns {void}
     */
    public updateCanvas(): void {
        // update "raw" canvas
        if (
            !this.initialized
            || !this.settings.debugging
            || !this.settings.show_canvas
        ) {
            this.setCanvasPreviewVisible(false);
            this.clearDebugCanvas();

            return;
        }

        const now = performance.now();
        const keepVisible = this.lastAudibleTime > 0
            && now - this.lastAudibleTime < AUDIO_DEBUG_HIDE_TIMEOUT_MS;

        if (!keepVisible) {
            this.setCanvasPreviewVisible(false);
            this.clearDebugCanvas();

            return;
        }

        if (!this.hasRecentAudioSample() || !this.lastAudio || this.lastAudio.silent > 0) {
            return;
        }

        this.setCanvasPreviewVisible(true);
        this.applyDebugBeatFlash(now);
        this.debugCanvasCleared = false;

        // clear the intersection
        this.context1.clearRect(0, 0, this.canvas1.width, this.canvas1.height);
        this.context1.fillStyle = 'rgb(255,0,0)';
        const barWidth = Math.round(
            (1.0 / this.inBuff.length) * this.canvas1.width
        );
        const halfCount = this.inBuff.length / 2;

        for (let i = 0; i < halfCount; ++i) {
            const height = (this.canvas1.height * this.inBuff[i]) / 2;

            this.context1.fillRect(
                barWidth * i,
                this.canvas1.height - height,
                barWidth,
                height
            );
        }
        this.context1.fillStyle = 'rgb(0,0,255)';
        for (let i = halfCount; i < this.inBuff.length; ++i) {
            const height = (this.canvas1.height * this.inBuff[191 - i]) / 2;

            this.context1.fillRect(
                barWidth * i,
                this.canvas1.height - height,
                barWidth,
                height
            );
        }

        // update "processed" data
        this.display.innerText = this.formatDebugStatus();
        this.updateMetricCanvas();

        // update spectrum canvas
        this.context2.clearRect(0, 0, this.canvas2.width, this.canvas2.height);

        if (this.lastAudio && this.lastAudio.data) {
            this.context2.fillStyle = 'rgb(0,255,0)';
            for (let index = 0; index < this.lastAudio.data.length; index++) {
                const height
                    = (this.canvas2.height * this.lastAudio.data[index]) / 2;

                this.context2.fillRect(
                    barWidth * index,
                    this.canvas2.height - height,
                    barWidth,
                    height
                );
            }

            /*
            // draw average, min & max lines
            this.drawHorizontLine('rgb(255,255,0)', this.lastAudio.average);
            this.drawHorizontLine('rgb(255,0,255)', this.lastAudio.max);
            this.drawHorizontLine('rgb(127,127,127)', this.lastAudio.min);
            */
        }
    }

    private hasRecentAudioSample(): boolean {
        return Boolean(
            this.lastAudio
            && performance.now() - this.lastAudio.time < AUDIO_ACTIVE_TIMEOUT_MS
        );
    }

    private clearDebugCanvas(): void {
        if (
            this.debugCanvasCleared
            || !this.context1
            || !this.context2
            || !this.context3
            || !this.display
            || !this.canvas1
            || !this.canvas2
            || !this.canvas3
        ) {
            return;
        }

        this.context1.clearRect(0, 0, this.canvas1.width, this.canvas1.height);
        this.context2.clearRect(0, 0, this.canvas2.width, this.canvas2.height);
        this.context3.clearRect(0, 0, this.canvas3.width, this.canvas3.height);
        this.display.innerText = '';
        this.debugCanvasCleared = true;
    }

    private updateMetricCanvas(): void {
        if (!this.context3 || !this.canvas3 || !this.lastAudio) {
            return;
        }

        const ctx = this.context3;
        const canvas = this.canvas3;
        const w = canvas.width;
        const h = canvas.height;

        ctx.drawImage(canvas, -1, 0);
        ctx.fillStyle = 'rgba(7, 10, 14, 0.35)';
        ctx.fillRect(w - 1, 0, 1, h);

        const metricValues = {
            bass: this.lastAudio.bass,
            mids: this.lastAudio.mids,
            highs: this.lastAudio.highs,
            peakActivation: this.lastAudio.peakActivation,
            sum: this.lastAudio.sum,
            min: this.lastAudio.min,
            max: this.lastAudio.max,
            average: this.lastAudio.average,
            range: this.lastAudio.range,
            silent: this.lastAudio.silent,
            intensity: this.lastAudio.intensity
        };
        const peakCandidate = [
            this.lastAudio.bass,
            this.lastAudio.mids,
            this.lastAudio.highs,
            this.lastAudio.peakActivation,
            this.lastAudio.sum,
            this.lastAudio.min,
            this.lastAudio.max,
            this.lastAudio.average,
            this.lastAudio.range,
            this.lastAudio.silent,
            this.lastAudio.intensity
        ].reduce((max, value) => {
            return Number.isFinite(value) ? Math.max(max, value) : max;
        }, 0);

        this.metricLogPeak = Math.max(
            1,
            peakCandidate,
            this.metricLogPeak * 0.985
        );

        const metricKeys = Object.keys(metricValues);

        if (this.lastAudio.isBeat) {
            ctx.fillStyle = 'rgba(235, 239, 244, 0.16)';
            ctx.fillRect(w - 1, 0, 1, h);
        }

        for (let i = 0; i < metricKeys.length; i++) {
            const key = metricKeys[i];
            const value = metricValues[key];
            const normalized = this.normalizeMetricValue(value, this.metricLogPeak);
            const y = h - normalized * (h - 1) - 1;

            ctx.fillStyle = METRIC_COLORS[key];
            ctx.fillRect(w - 1, Math.max(0, Math.min(h - 1, y)), 1, 1);
        }
    }

    private applyDebugBeatFlash(now: number): void {
        if (!this.mainElm) {
            return;
        }

        const flashActive = this.settings.debugging
            && now < this.debugBeatFlashUntil;

        this.mainElm.style.borderColor = flashActive
            ? 'rgba(255,255,255,0.95)'
            : 'rgba(255,255,255,0.12)';
        this.mainElm.style.boxShadow = flashActive
            ? '0 0 0 1px rgba(255,255,255,0.95), 0 0 28px rgba(255,255,255,0.45), 0 24px 60px rgba(0,0,0,0.38)'
            : '0 24px 60px rgba(0,0,0,0.38)';
    }

    private triggerDebugBeatFlash(): void {
        if (
            !this.settings.debugging
            || !this.lastAudio
            || !this.lastAudio.isBeat
        ) {
            return;
        }

        this.debugBeatFlashUntil = performance.now() + 90;
        this.applyDebugBeatFlash(performance.now());
    }

    private normalizeMetricValue(value: number, peak: number): number {
        if (!Number.isFinite(value) || value <= 0 || !Number.isFinite(peak) || peak <= 0) {
            return 0;
        }

        return Math.max(0, Math.min(1, Math.log1p(value) / Math.log1p(peak)));
    }

    private formatDebugStatus(): string {
        if (!this.lastAudio) {
            return '';
        }

        const lines = [
            `time: ${this.lastAudio.time.toFixed(4)}`,
            `ellapsed: ${this.lastAudio.ellapsed.toFixed(4)}`,
            `analyzerMode: ${this.formatAnalyzerMode(this.lastAudio.analyzerMode)}`
        ];

        (this.lastAudio.bpm || []).slice(0, 3).forEach((entry, index) => {
            lines.push(
                `bpm[${index}]: ${entry.value.toFixed(4)} (${entry.weight.toFixed(4)})`
            );
        });

        if (Number.isFinite(this.lastAudio.beatPhase)) {
            lines.push(`beatPhase: ${this.lastAudio.beatPhase.toFixed(4)}`);
        }
        if (Number.isFinite(this.lastAudio.peakActivation)) {
            lines.push(`peakActivation: ${this.lastAudio.peakActivation.toFixed(4)}`);
        }
        if (Number.isFinite(this.lastAudio.phaseLock)) {
            lines.push(`phaseLock: ${this.lastAudio.phaseLock.toFixed(4)}`);
        }
        if (Number.isFinite(this.lastAudio.beatConfidence)) {
            lines.push(`beatConfidence: ${this.lastAudio.beatConfidence.toFixed(4)}`);
        }
        if (Number.isFinite(this.lastAudio.secondsSinceLastBeat)) {
            lines.push(`secondsSinceLastBeat: ${this.lastAudio.secondsSinceLastBeat.toFixed(4)}`);
        }
        if (Number.isFinite(this.lastAudio.secondsToNextBeat)) {
            lines.push(`secondsToNextBeat: ${this.lastAudio.secondsToNextBeat.toFixed(4)}`);
        }
        if (Number.isFinite(this.lastAudio.beatInterval)) {
            lines.push(`beatInterval: ${this.lastAudio.beatInterval.toFixed(4)}`);
        }
        if (this.lastAudio.isBeat !== undefined) {
            lines.push(`isBeat: ${this.lastAudio.isBeat ? 'true' : 'false'}`);
        }
        if (this.lastAudio.primaryPulseSource) {
            lines.push(`primaryPulseSource: ${this.lastAudio.primaryPulseSource}`);
        }
        if (this.lastAudio.tempoFamily) {
            lines.push(`tempoFamily: ${this.lastAudio.tempoFamily}`);
        }
        if (this.lastAudio.transientCorroboration !== undefined) {
            lines.push(`transientCorroboration: ${this.lastAudio.transientCorroboration ? 'true' : 'false'}`);
        }
        if (Number.isFinite(this.lastAudio.switchConfidence)) {
            lines.push(`switchConfidence: ${this.lastAudio.switchConfidence.toFixed(4)}`);
        }
        if (this.lastAudio.analyzerBackend) {
            lines.push(`analyzerBackend: ${this.lastAudio.analyzerBackend}`);
        }
        if (this.lastAudio.aiReady !== undefined) {
            lines.push(`aiReady: ${this.lastAudio.aiReady ? 'true' : 'false'}`);
        }
        if (Number.isFinite(this.lastAudio.aiInferenceMs)) {
            lines.push(`aiInferenceMs: ${this.lastAudio.aiInferenceMs.toFixed(4)}`);
        }
        if (Number.isFinite(this.lastAudio.aiModelConfidence)) {
            lines.push(`aiModelConfidence: ${this.lastAudio.aiModelConfidence.toFixed(4)}`);
        }
        if (Number.isFinite(this.lastAudio.aiFrameStride)) {
            lines.push(`aiFrameStride: ${this.lastAudio.aiFrameStride.toFixed(0)}`);
        }

        return lines.join('\n');
    }

    private formatAnalyzerMode(mode?: TempoAnalyzerModeValue): string {
        switch (mode) {
            case TempoAnalyzerMode.Off:
                return 'Off';
            case TempoAnalyzerMode.AI:
                return 'AI';
            case TempoAnalyzerMode.EDM:
                return 'EDM';
            case TempoAnalyzerMode.General:
            default:
                return 'General';
        }
    }

    private setCanvasPreviewVisible(visible: boolean): void {
        if (!this.mainElm || this.debugCanvasVisible === visible) {
            return;
        }

        this.mainElm.style.display = visible ? '' : 'none';
        if (!visible) {
            this.debugBeatFlashUntil = 0;
            this.applyDebugBeatFlash(0);
        }
        this.debugCanvasVisible = visible;

        if (visible) {
            this.updateDebugLayout();
        }
    }

    /**
     * Recalculate debug panel element sizes from the current viewport.
     * @returns {void}
     */
    private updateDebugLayout = (): void => {
        if (
            !this.mainElm
            || !this.canvas1
            || !this.canvas2
            || !this.canvas3
            || !this.display
        ) {
            return;
        }

        const { x: realWidth } = getRealWindowSize();
        const viewportHeight = window.innerHeight;
        const panelHeight = Math.max(220, viewportHeight - 24);
        const panelWidth = this.mainElm.clientWidth - 24;

        this.mainElm.style.height = `${panelHeight}px`;

        const canvases = [this.canvas1, this.canvas2, this.canvas3];

        canvases.forEach((canvas) => {
            canvas.style.width = '100%';
        });

        this.display.style.height = `${Math.max(52, Math.floor(panelHeight * 0.11))}px`;

        const reserved = Array.from(this.mainElm.children)
            .filter((elm) => {
                return elm.tagName !== 'CANVAS';
            })
            .reduce((sum, elm: HTMLElement) => {
                return sum + elm.offsetHeight;
            }, 0);
        const verticalGaps = 36;
        const availableForCanvases = Math.max(
            132,
            panelHeight - reserved - verticalGaps
        );
        const canvasHeight = Math.max(44, Math.floor(availableForCanvases / 3));

        canvases.forEach((canvas) => {
            const nextWidth = Math.max(320, Math.min(realWidth, panelWidth));

            if (canvas.width !== nextWidth) {
                canvas.width = nextWidth;
            }
            if (canvas.height !== canvasHeight) {
                canvas.height = canvasHeight;
            }
            canvas.style.height = `${canvasHeight}px`;
        });
    };

    /**
     * Draww Context2 line
     * @param {string} style Canvas fill style
     * @param {number} y Height of line
     * @returns {void}
     */
    private drawHorizontalLine(style, y) {
        const ctx = this.context2;
        const cvs = this.canvas2;

        ctx.fillStyle = style;
        ctx.moveTo(0, cvs.height * y);
        ctx.lineTo(cvs.width, cvs.height * y);
        ctx.closePath();
        ctx.stroke();
    }

}
