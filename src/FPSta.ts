/**
 * @author hexxone / https://hexx.one
 *
 * @license
 * Copyright (c) 2026 hexxone All rights reserved.
 * Licensed under the GNU GENERAL PUBLIC LICENSE.
 * See LICENSE file in the project root for full license information.
 */

/* eslint-env browser */

import { CComponent } from './CComponent';
import { CSettings } from './CSettings';
import { waitReady } from './Util';
import { WEAS } from './weas/WEAS';

const ElementId = 'fpstats';
const MemUpdateRate = 19;
const GpuHistoryLimit = 120;

/**
 * Custom Stats settings
 * @public
 * @extends {CSettings}
 */
export class FPSettings extends CSettings {

    debugging = false;
    custom_fps = false;
    fps_value = 60;
    wallpaper_fps = 60;

}

/**
 * Custom FPS Stats module
 *
 * @public
 * @extends {CComponent}
 */
export class FPStats extends CComponent {

    public settings: FPSettings = new FPSettings();

    private container: HTMLElement;

    // FPS
    private fpsHolder: HTMLElement;
    private lastUpdate: number = performance.now();
    private frameCount = 0;

    // usage
    private useHolder: HTMLElement;

    // cpu
    private cpuHolder: HTMLElement;
    private cpuBegin: number = performance.now();
    private cpuEnd: number = performance.now();
    private cpuMS = 0;

    // gpu
    private gpuHolder: HTMLElement;
    private gpuBegin: number = performance.now();
    private gpuEnd: number = performance.now();
    private gpuMS = 0;
    private gpuSupported = false;
    private gpuSamples = 0;
    private gl?: WebGLRenderingContext | WebGL2RenderingContext;
    private gpuTimerExt?: any;
    private gpuActiveQuery?: any;
    private gpuPendingQueries: any[] = [];
    private gpuUsesWebGL2Query = false;
    private gpuHistory: number[] = [];

    // audio
    private auProvider: WEAS = undefined;
    private audHolder: HTMLElement;
    private audioMS = 0;
    private bpmHolder: HTMLDivElement;

    // memory
    private memUpdate = 0;
    private perfMemHolder?: HTMLElement;
    private gpuMemHolder?: HTMLElement;
    private domMemHolder?: HTMLElement;
    private wrkMemHolder?: HTMLElement; // TODO

    // TODO benchmark mode

    /**
     * Create hidden element
     * @param {WEAS} audio (optional)
     */
    constructor(audio?: WEAS) {
        super();
        this.auProvider = audio;

        waitReady().then(() => {
            this.injectCSS();
            this.injectHTML();
        });
    }

    /**
     * Make style
     * @ignore
     * @returns {void}
     */
    private injectCSS() {
        const st = document.createElement('style');

        st.innerHTML = `
#${ElementId} {
    opacity: 0;
    position: fixed;
    top: 50vh;
    left: 10px;
    padding: 10px;
    z-index: 90000;
    font-size: 1.5em;
    text-align: left;
    background: black;
}
#${ElementId}.show {
    opacity: 0.8;
}`;
        document.head.append(st);
    }

    /**
     * Make dom
     * @ignore
     * @returns {void}
     */
    private injectHTML() {
        // root
        this.container = document.createElement('div');
        this.container.id = ElementId;
        document.body.append(this.container);
        // fps
        this.fpsHolder = document.createElement('div');
        this.fpsHolder.innerText = 'FPS: 0 / 60';
        // cpu
        this.cpuHolder = document.createElement('div');
        this.cpuHolder.innerText = 'CPU: 0.00%';
        // gpu
        this.gpuHolder = document.createElement('div');
        this.gpuHolder.innerText = 'GPU: 0.00%';
        // usage
        this.useHolder = document.createElement('div');
        this.useHolder.innerText = 'All: 0.00%';
        // append
        this.container.append(
            this.fpsHolder,
            this.cpuHolder,
            this.gpuHolder,
            this.useHolder
        );
        // audio
        if (this.auProvider) {
            this.bpmHolder = document.createElement('div');
            this.bpmHolder.innerText = 'BPM: n/a';

            this.audHolder = document.createElement('div');
            this.audHolder.innerText = 'Audio: n/a';

            this.container.append(this.bpmHolder, this.audHolder);
        }
    }

    /**
     * update visible
     * @public
     * @returns {Promise}
     * @returns {void}
     */
    public updateSettings(): Promise<void> {
        // show or hide debug info
        return waitReady().then(() => {
            if (this.settings.debugging) {
                this.container.classList.add('show');
            } else {
                this.container.classList.remove('show');
            }
        });
    }

    /**
     * Enable GPU timing via timer queries when supported by the active WebGL context.
     * @param {WebGLRenderingContext | WebGL2RenderingContext} gl WebGL context
     * @returns {void}
     */
    public setContext(gl?: WebGLRenderingContext | WebGL2RenderingContext): void {
        this.gl = gl;
        this.gpuTimerExt = undefined;
        this.gpuActiveQuery = undefined;
        this.gpuPendingQueries = [];
        this.gpuSupported = false;
        this.gpuUsesWebGL2Query = false;

        if (!gl || typeof gl.getExtension !== 'function') {
            return;
        }

        const extWebGL2 = gl.getExtension('EXT_disjoint_timer_query_webgl2');

        if (extWebGL2 && typeof (gl as WebGL2RenderingContext).createQuery === 'function') {
            this.gpuTimerExt = extWebGL2;
            this.gpuSupported = true;
            this.gpuUsesWebGL2Query = true;

            return;
        }

        const extWebGL1 = gl.getExtension('EXT_disjoint_timer_query');

        if (extWebGL1 && typeof extWebGL1.createQueryEXT === 'function') {
            this.gpuTimerExt = extWebGL1;
            this.gpuSupported = true;
        }
    }

    /**
     * Start measuring interval
     * @public
     * @param {boolean} cpu True if Cpu, false if GPU
     * @returns {void}
     */
    public begin(cpu: boolean) {
        if (!this.settings.debugging) {
            return;
        }

        if (cpu) {
            this.cpuBegin = performance.now();
        } else if (this.gpuSupported && !this.gpuActiveQuery && this.gl) {
            if (this.gpuUsesWebGL2Query) {
                const gl = this.gl as WebGL2RenderingContext;
                const query = gl.createQuery();

                if (query) {
                    gl.beginQuery(this.gpuTimerExt.TIME_ELAPSED_EXT, query);
                    this.gpuActiveQuery = query;
                }
            } else {
                const query = this.gpuTimerExt.createQueryEXT();

                if (query) {
                    this.gpuTimerExt.beginQueryEXT(
                        this.gpuTimerExt.TIME_ELAPSED_EXT,
                        query
                    );
                    this.gpuActiveQuery = query;
                }
            }
        } else {
            this.gpuBegin = performance.now();
        }
    }

    /**
     * End measuring interval
     * @public
     * @param {boolean} cpu True if Cpu, false if GPU
     * @returns {void}
     */
    public end(cpu: boolean) {
        if (!this.settings.debugging) {
            return;
        }

        if (cpu) {
            this.cpuEnd = performance.now();
        } else if (this.gpuSupported && this.gpuActiveQuery) {
            if (this.gpuUsesWebGL2Query) {
                (this.gl as WebGL2RenderingContext).endQuery(
                    this.gpuTimerExt.TIME_ELAPSED_EXT
                );
            } else {
                this.gpuTimerExt.endQueryEXT(
                    this.gpuTimerExt.TIME_ELAPSED_EXT
                );
            }

            this.gpuPendingQueries.push(this.gpuActiveQuery);
            this.gpuActiveQuery = undefined;
        } else {
            this.gpuEnd = performance.now();
        }
    }

    /**
     * update the html representation
     * @public
     * @returns {void}
     */
    public update() {
        this.frameCount++;
        this.cpuMS += this.cpuEnd - this.cpuBegin;

        if (this.gpuSupported) {
            this.resolveGpuQueries();
        } else {
            this.gpuMS += this.gpuEnd - this.gpuBegin;
            this.gpuSamples++;
        }

        const hasAudio = this.auProvider && this.auProvider.hasAudio();

        if (hasAudio && this.auProvider.lastAudio) {
            this.audioMS += this.auProvider.lastAudio.ellapsed;
        }

        // only update text ~every second
        const now = performance.now();
        const refreshRate = 1000;

        const refreshOffset = now - refreshRate - this.lastUpdate;

        if (refreshOffset < 0) {
            return;
        }

        const refreshDelay = refreshRate + refreshOffset;
        const frameMultiplier = refreshDelay / refreshRate;

        // calculate
        const elapsd = (now - this.lastUpdate) / refreshDelay;
        const fps = this.frameCount / elapsd;

        const targetFps = this.getFpsTarget();
        const msPerFps = refreshDelay / targetFps;
        const cpuUse = (this.cpuMS / this.frameCount / msPerFps) * 100;
        const avgGpuMs = this.gpuSupported
            ? this.getGpuAverageMs()
            : (this.gpuSamples > 0 ? this.gpuMS / this.gpuSamples : NaN);
        const gpuUse = Number.isFinite(avgGpuMs)
            ? (avgGpuMs / msPerFps) * 100
            : NaN;
        const resourceUse = Number.isFinite(gpuUse)
            ? (cpuUse + gpuUse)
            : cpuUse;
        const frameBudgetUse = (targetFps * frameMultiplier / fps) * 100;
        const onTarget = fps >= targetFps * frameMultiplier * 0.99;
        const allUse = onTarget
            ? resourceUse
            : frameBudgetUse;

        // apply
        this.fpsHolder.innerText = `FPS: ${fps.toFixed(2)} / ${targetFps}`;
        this.cpuHolder.innerText = `CPU: ${cpuUse.toFixed(2)} %`;
        this.gpuHolder.innerText = Number.isFinite(gpuUse)
            ? `GPU: ${gpuUse.toFixed(2)} %`
            : 'GPU: n/a';
        this.useHolder.innerText = `All: ${allUse.toFixed(2)} %`;

        if (this.audHolder) {
            if (!hasAudio) {
                this.audHolder.innerText = 'Audio: n/a';
            } else {
                this.audHolder.innerText = `Audio: ${(
                    this.audioMS / Math.max(this.frameCount, 1)
                ).toFixed(2)} ms`;
            }
        }
        if (this.bpmHolder) {
            this.bpmHolder.innerText = 'BPM: n/a';
        }
        if (
            hasAudio
            && this.bpmHolder
            && this.auProvider.lastAudio
            && this.auProvider.lastAudio.bpm instanceof Array
        ) {
            let bts = 0;
            const bp = this.auProvider.lastAudio.bpm;

            bp.forEach((b) => {
                return (bts += b.value);
            });
            bts /= bp.length;
            this.bpmHolder.innerText = `BPM: ${bts.toFixed(2)} ~`;
        }

        if (this.memUpdate++ > MemUpdateRate) {
            this.memUpdate = 0;
            this.updateMemory();
        }

        this.lastUpdate = now;
        this.reset();
    }

    /**
     * All back to 0
     * @public
     * @returns {void}
     */
    public reset() {
        this.frameCount = 0;
        this.cpuMS = 0;
        this.gpuMS = 0;
        this.gpuSamples = 0;
        this.audioMS = 0;
    }

    private updateMemory() {
        // eslint-disable-next-line dot-notation
        if (
            window.crossOriginIsolated
            && performance.measureUserAgentSpecificMemory !== undefined
        ) {
            // eslint-disable-next-line dot-notation
            performance['measureUserAgentSpecificMemory']()
                .then((result) => {
                    if (result && result.breakdown && result.bytes) {
                        let sum = result.bytes;

                        if (isNaN(sum) || sum <= 0) {
                            console.warn(
                                'Invalid performance result: ',
                                result
                            );

                            return;
                        }

                        if (!this.perfMemHolder) {
                            this.perfMemHolder = document.createElement('div');
                            this.useHolder.insertAdjacentElement(
                                'afterend',
                                this.perfMemHolder
                            );
                        }

                        const getDetail = (type: string) => {
                            return (
                                result.breakdown.find((bd) => {
                                    return (
                                        !!bd
                                        && !!bd.types
                                        && !!bd.types.includes
                                        && bd.types.includes(type)
                                    );
                                }) ?? undefined
                            );
                        };

                        const addDetail = (
                            gotDetail: any,
                            text: string,
                            gotElement: HTMLElement,
                            insertAfter: HTMLElement
                        ) => {
                            if (!!gotDetail && !isNaN(gotDetail.bytes)) {
                                if (!gotElement) {
                                    gotElement = document.createElement('div');
                                    insertAfter.insertAdjacentElement(
                                        'afterend',
                                        gotElement
                                    );
                                }
                                const domMem = gotDetail.bytes;

                                sum -= domMem;
                                gotElement.innerText = `${text}: ${this.formatBytes(domMem)}`;
                            }

                            return gotElement;
                        };

                        this.domMemHolder = addDetail(
                            getDetail('DOM'),
                            'DOM',
                            this.domMemHolder,
                            this.perfMemHolder
                        );

                        this.gpuMemHolder = addDetail(
                            getDetail('Canvas'),
                            'VRAM',
                            this.gpuMemHolder,
                            this.perfMemHolder
                        );

                        this.perfMemHolder.innerText = `RAM: ${this.formatBytes(sum)}`;
                    }
                })
                .catch(() => {
                    return console.error;
                });
        }
    }

    private resolveGpuQueries(): void {
        if (!this.gl || !this.gpuTimerExt) {
            return;
        }

        while (this.gpuPendingQueries.length > 0) {
            const query = this.gpuPendingQueries[0];
            let available = false;

            if (this.gpuUsesWebGL2Query) {
                const gl = this.gl as WebGL2RenderingContext;

                available = !!gl.getQueryParameter(
                    query,
                    gl.QUERY_RESULT_AVAILABLE
                );
            } else {
                available = !!this.gpuTimerExt.getQueryObjectEXT(
                    query,
                    this.gpuTimerExt.QUERY_RESULT_AVAILABLE_EXT
                );
            }

            if (!available) {
                break;
            }

            const disjoint = !!this.gl.getParameter(
                this.gpuTimerExt.GPU_DISJOINT_EXT
            );

            if (!disjoint) {
                const elapsedNs = this.gpuUsesWebGL2Query
                    ? (() => {
                        const gl = this.gl as WebGL2RenderingContext;

                        return gl.getQueryParameter(query, gl.QUERY_RESULT);
                    })()
                    : this.gpuTimerExt.getQueryObjectEXT(
                        query,
                        this.gpuTimerExt.QUERY_RESULT_EXT
                    );

                const elapsedMs = elapsedNs / 1_000_000;

                this.gpuMS += elapsedMs;
                this.gpuSamples++;
                this.recordGpuSample(elapsedMs);
            }

            if (this.gpuUsesWebGL2Query) {
                (this.gl as WebGL2RenderingContext).deleteQuery(query);
            } else {
                this.gpuTimerExt.deleteQueryEXT(query);
            }

            this.gpuPendingQueries.shift();
        }
    }

    private recordGpuSample(elapsedMs: number): void {
        this.gpuHistory.push(elapsedMs);

        if (this.gpuHistory.length > GpuHistoryLimit) {
            this.gpuHistory.splice(0, this.gpuHistory.length - GpuHistoryLimit);
        }
    }

    private getGpuAverageMs(): number {
        if (this.gpuHistory.length <= 0) {
            return NaN;
        }

        let total = 0;

        this.gpuHistory.forEach((sample) => {
            total += sample;
        });

        return total / this.gpuHistory.length;
    }

    private getFpsTarget() {
        if (this.settings.custom_fps) {
            return Math.max(1, this.settings.fps_value || 60);
        }

        return Math.max(1, this.settings.wallpaper_fps || 60);
    }

    private formatBytes(n: number) {
        const units = ['b', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
        let l = 0;

        while (n >= 1024 && ++l) {
            n /= 1024;
        }

        return `${n.toFixed(l > 0 ? 2 : 0)} ${units[l]}`;
    }

}
