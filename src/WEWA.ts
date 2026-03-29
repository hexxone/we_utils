/**
 * @author hexxone / https://hexx.one
 *
 * @license
 * Copyright (c) 2026 hexxone All rights reserved.
 * Licensed under the GNU GENERAL PUBLIC LICENSE.
 * See LICENSE file in the project root for full license information.
 */

import { OfflineHelper } from './offline/OfflineHelper';
import { Smallog } from './Smallog';
import { normalizeColorInput, rgbToObj, waitReady } from './Util';
import { WascUtil } from './wasc-worker/WascUtil';

const LogHead = '[WEWA] ';
const DefLang = 'en-us';

/**
 * WEWA
 *
 * Wallpaper Engine Web Adapter
 *
 * This is an aditional class to be included in your Typescript/Webpack Wallpaper Engine
 * Web-Wallpaper project - so you can test, run & configure it from a normal web browser.
 *
 * REQUIREMENTS:
 *
 * - HTML5 Browser
 * - the "project.json" needs to be in the root folder like "index.html"
 * - this file needs to be included/built in your "index.html"
 *
 *
 * FEATURES:
 *
 * - automatically detecting if the web wallpaper is opened by wallpaper engine or browser
 * - if opened by wallpaper engine, nothing will happen
 * - if opened by a browser:
 *   - use a ServiceWorker to make page always available offline
 *   - automatically load the "project.json"
 *   - parse the settings, languages & conditions
 *   - add respective html elements for each setting type & condition
 *   - put these elements into an option menu which can be hidden
 *   - check localStorage for already saved/customized values
 *   - apply all settings once
 * - react to changes made in the ui and update them in the wallpaper
 * - save changes made in the ui to localStorage
 *
 * @todo
 * - inject "audio processing" setting
 *
 * lighthouse:
 * - image explicit width/height
 * - cf longer cache policy (2d?)
 * - <img alt's
 * - <form <input <label's
 *
 * @public
 */
export class WEWA {

    private audioListener: string;
    private propListener: string;

    private projectFile: string;
    private defLang: string;

    private projectData?: any = undefined; // TODO type WE project.json

    private htmlMenu?: Element = undefined;
    private htmlIcon?: Element = undefined;

    private audio?: HTMLAudioElement = undefined;
    private ctx?: AudioContext = undefined;

    private source?: MediaStreamAudioSourceNode | MediaElementAudioSourceNode = undefined;

    private analyser?: AnalyserNode = undefined;

    private audioInterval?: number = undefined;
    private audioCallback?: (data: number[]) => void = undefined;

    private pauseOnUnfocus
        = localStorage.getItem('wewaPauseOnUnfocus') !== 'false';
    private isPaused = false;

    /**
     * Check if we are running in Web-Mode
     * if yes => iniitialize, else => do nothing
     * @param {Function} finished Callback for initializing the wallpaper
     * @param {string} audioListener to register
     * @param {string} propListener to register
     * @param {string} projFile to register
     * @param {string} defLang default languague from project file
     */
    constructor(
        finished: () => void = undefined,
        audioListener: string = 'wallpaperRegisterAudioListener',
        propListener: string = 'wallpaperPropertyListener',
        projFile: string = 'project.json',
        defLang: string = DefLang
    ) {
        this.audioListener = audioListener;
        this.propListener = propListener;
        this.projectFile = projFile;
        this.defLang = defLang;

        if (window[audioListener]) {
            Smallog.info('detected wallpaper engine => Standby.', LogHead);
            if (finished !== undefined) {
                finished();
            }

            return;
        }

        Smallog.info('wallpaper engine not detected => Init!', LogHead);

        // define audio listener first, so we dont miss when it gets registered.
        window[audioListener] = (callback) => {
            // set callback to be called later with analysed audio data
            this.audioCallback = callback;
            Smallog.info('Registered wallpaper AudioListener.', LogHead);
        };

        // initialize when ready
        waitReady()
            // make the website available offline using service worker
            .then(() => { return OfflineHelper.register(document.title.replace(' ', '')); })
            .then(() => {
                // continue initializing
                if (finished !== undefined) {
                    finished();
                }
                this.init();

                // pause and resume on focus events
                window.onblur = () => {
                    return this.setPaused(true);
                };
                window.onfocus = () => {
                    return this.setPaused(false);
                };
            });
    }

    /**
     * Initialize the Web Adapter
     * @ignore
     * @returns {void}
     */
    private init() {
        WascUtil.myFetch(this.projectFile, 'json').then((json) => {
            if (json.type !== 'web') {
                Smallog.error(
                    `Error! Loaded ${json} is not a web Wallpaper. How did this happen? Aborting...`,
                    LogHead
                );

                return;
            }

            // new NDBG();

            this.projectData = json;
            this.loadStorage();
            this.addStyle();
            this.addMenu(localStorage.getItem('wewaLang'));
            this.applyAudioProcessingSettings();
            this.evaluateSettings();
            this.applyProp(json.general.properties);
        });
    }

    /**
     * Load last settings from localStorage
     * @ignore
     * @returns {void}
     */
    private loadStorage() {
        const props = this.projectData.general.properties;
        const last = localStorage.getItem('wewaLastProps');

        if (last !== null) {
            try {
                const parsed = JSON.parse(last) ?? {};

                Object.keys(props).forEach((key) => {
                    const prop = props[key];
                    const savedValue = parsed[key];

                    if (!prop || savedValue === undefined) {
                        return;
                    }

                    prop.value = this.coercePropertyValue(prop, savedValue);
                });
                Smallog.debug('Loaded persisted values.', LogHead);
            } catch (error) {
                Smallog.error(`Failed to load stored settings: ${error}`, LogHead);
            }
        }
    }

    private saveStorage() {
        localStorage.setItem(
            'wewaLastProps',
            JSON.stringify(this.getSerializableProps())
        );
    }

    private getSerializableProps() {
        const props = this.projectData.general.properties;
        const savedValues = {};

        Object.keys(props).forEach((key) => {
            const prop = props[key];

            if (
                !prop
                || prop.type === 'hidden'
                || key.startsWith('HDR_')
                || key.startsWith('SPCR_')
            ) {
                return;
            }

            savedValues[key] = prop.value;
        });

        return savedValues;
    }

    private coercePropertyValue(prop: any, rawValue: any) {
        if (!prop) {
            return rawValue;
        }

        const fallback = prop.value;

        switch (prop.type) {
            case 'bool':
                if (typeof rawValue === 'boolean') {
                    return rawValue;
                }
                if (typeof rawValue === 'number') {
                    return rawValue !== 0;
                }
                if (typeof rawValue === 'string') {
                    const normalized = rawValue.trim().toLowerCase();

                    if (['true', '1', 'on', 'yes'].includes(normalized)) {
                        return true;
                    }
                    if (['false', '0', 'off', 'no'].includes(normalized)) {
                        return false;
                    }
                }

                return fallback;

            case 'slider': {
                const numericValue
                    = typeof rawValue === 'number'
                        ? rawValue
                        : parseFloat(rawValue);

                if (!Number.isFinite(numericValue)) {
                    return fallback;
                }

                const min = Number.isFinite(prop.min) ? prop.min : numericValue;
                const max = Number.isFinite(prop.max) ? prop.max : numericValue;

                return Math.min(max, Math.max(min, numericValue));
            }

            case 'combo':
                if (!(prop.options instanceof Array)) {
                    return fallback;
                }

                for (const option of prop.options) {
                    if (
                        option?.value === rawValue
                        || String(option?.value) === String(rawValue)
                    ) {
                        return option.value;
                    }
                }

                return fallback;

            case 'color':
                if (typeof rawValue !== 'string') {
                    return fallback;
                }

                return normalizeColorInput(rawValue) ?? fallback;

            case 'file':
            case 'textinput':
            case 'text':
            case 'hidden':
                return typeof rawValue === 'string' ? rawValue : fallback;

            default:
                return rawValue;
        }
    }

    /**
     * apply Audio Processing Settings
     * @ignore
     * @returns {void}
     */
    private applyAudioProcessingSettings() {
        this.projectData.general.properties.audioprocessing = {
            value: this.projectData.general.supportsaudioprocessing,
            type: 'hidden'
        };
    }

    /**
     * CSS Insertion
     * @ignore
     * @returns {void}
     */
    private addStyle() {
        const st = document.createElement('style');
        // precalculation
        const minWidthPx = 420;
        const percentageWidth = 20;
        const pwShort = `${percentageWidth}vw`;

        st.innerHTML = `
#wewaMenu, #wewaIcon {
    transform: none;
    transition: transform 500ms ease;
    position: fixed;
    top: 0px;
    padding: 15px;
    z-index: 9999;
}
#wewaMenu {
    top: 12px;
    bottom: 12px;
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 18px;
    width:${pwShort};
    left:100vw;
    color:#f5f7fb;
    background: linear-gradient(180deg, rgba(16, 21, 28, 0.76), rgba(10, 14, 18, 0.7));
    overflow-x:hidden;
    overflow-y:auto;
    max-height: calc(100vh - 24px);
    min-width: ${minWidthPx}px;
    max-width: 100vw;
    font-family: "Overpass Mono", Helvetica, Verdana, Arial;
    font-size: 1rem;
    box-shadow: 0 24px 60px rgba(0,0,0,0.38);
    backdrop-filter: blur(14px);
    scrollbar-width: thin;
    scrollbar-color: rgba(255,255,255,0.25) rgba(255,255,255,0.06);
    box-sizing: border-box;
}
#wewaMenu hr {
    margin: 16px 0px;
    border: 0;
    border-top: 1px solid rgba(255,255,255,0.1);
}
#wewaMenu a {
    color: #f5f7fb;
    border: 1px solid rgba(110, 231, 183, 0.7);
    background: rgba(110, 231, 183, 0.08);
    border-radius: 10px;
    padding: 8px 12px;
    margin: 5px;
    text-decoration: none;
    display: block;
    transition: background-color 150ms ease, border-color 150ms ease, transform 150ms ease;
}
#wewaMenu a:hover {
    background: rgba(110, 231, 183, 0.18);
    transform: translateY(-1px);
}
#wewaMenu .red {
    border-color: rgba(255, 127, 80, 0.75);
    background: rgba(255, 127, 80, 0.08);
}
#wewaMenu .red:hover {
    background-color: rgba(255, 127, 80, 0.18);
}
#wewaMenu .audio {
    border-color: rgba(0, 161, 255, 0.75);
    background: rgba(0, 161, 255, 0.08);
}
#wewaMenu .audio:hover {
    background-color: rgba(0, 161, 255, 0.18);
}
#wewaMenu audio, #wewaMenu select, #wewaMenu input[type="text"], #wewaMenu input[type="number"], #wewaMenu input[type="range"], #wewaMenu input[type="color"], #wewaMenu input[type="file"] {
    width: 100%;
}
#wewaMenu select, #wewaMenu input[type="text"], #wewaMenu input[type="number"], #wewaMenu input[type="color"], #wewaMenu input[type="file"] {
    padding: 8px 10px;
    border-radius: 10px;
    border: 1px solid rgba(255,255,255,0.14);
    background: rgba(255,255,255,0.06);
    color: inherit;
    box-sizing: border-box;
}
#wewaMenu input[type="range"] {
    accent-color: #6ee7b7;
}
#wewaMenu input[type="checkbox"] {
    transform: scale(1.2);
    accent-color: #6ee7b7;
}
#wewaMenu table {
    width:100%;
    table-layout: fixed;
    border-spacing: 0 4px;
}
#wewaMenu tr.hide {
    display: none;
}
#wewaMenu td {
    width: 50%;
    padding: 6px 4px;
    vertical-align: middle;
}
#wewaMenu .left {
    text-align: left;
}
#wewaMenu .right {
    text-align: right;
}
#wewaMenu img {
    width: ${percentageWidth / 2}vw;
    min-width: ${Math.floor(minWidthPx / 2)}px;
    max-width: 90%;
    height: auto;
    border-radius: 12px;
    display: block;
    margin: 0 auto 10px auto;
    box-shadow: 0 16px 30px rgba(0,0,0,0.24);
}
#wewaMenu .droparea {
    border: 2px dashed rgba(255,255,255,0.24);
    border-radius: 10px;
    padding: 20px;
    text-align: center;
    font-size: 18pt;
    color: rgba(255,255,255,0.7);
    background: rgba(255,255,255,0.03);
}
#wewaMenu .actionRow {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
    margin: 10px 0 4px 0;
}
#wewaMenu .actionRow a {
    margin: 0;
    text-align: center;
}
#wewaMenu::-webkit-scrollbar {
    width: 10px;
}
#wewaMenu::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,0.18);
    border-radius: 999px;
}
#wewaMenu::-webkit-scrollbar-track {
    background: rgba(255,255,255,0.05);
}
/* Icon */
#wewaIcon {
    right:10px;
    top: 14px;
    cursor:pointer;
    border-radius: 14px;
    background: rgba(10, 14, 18, 0.62);
    border: 1px solid rgba(255,255,255,0.1);
    box-shadow: 0 12px 30px rgba(0,0,0,0.28);
}
#wewaIcon div {
    width:35px;
    height:5px;
    background-color:#b4bec8;
    margin:6px 0;
    border-radius: 999px;
}
#wewaMenu.open, #wewaIcon.open {
    transform: translateX(calc(-1 * max(${pwShort}, ${minWidthPx}px) - 12px));
    transition: transform 500ms ease;
}
/* Smartphone format */
@media all and (max-width: 1000px) {
    #wewaMenu {
        width:90vw;
    }
    #wewaMenu.open {
        transform: translateX(-95vw);
        transition: transform 500ms ease;
    }
    #wewaIcon.open {
        transform: translateX(calc(-100vw + 60px));
        transition: transform 500ms ease;
    }
}`;
        document.head.append(st);
    }

    /**
     * HTML Creation
     * @param {string} lang WE language
     * @ignore
     * @returns {void}
     */
    private addMenu(lang) {
        if (this.htmlMenu) {
            document.body.removeChild(this.htmlMenu);
            document.body.removeChild(this.htmlIcon);
            this.htmlMenu = undefined;
        }

        // quick wrapper, we need this a lot
        const ce = (e) => {
            return document.createElement(e);
        };

        // local vars faster
        const proj = this.projectData;
        const props = proj.general.properties; // TODO Type

        // create root menu
        this.htmlMenu = ce('div');
        this.htmlMenu.id = 'wewaMenu';

        // create preview img wrap
        this.addMenuHeader(ce, proj);
        // create table with settings
        this.addMenuSettings(ce, proj, this, lang, props);
        // Add Footer
        this.addMenuFooter(ce);
        // finally add the menu to the DOM
        document.body.append(this.htmlMenu);

        // last create the icon for opening & closing the menu
        this.addMenuIcon(ce);
    }

    /**
     * Adds the Menu Icon
     * @param {Function} ce CreateElement
     * @ignore
     * @returns {void}
     */
    private addMenuIcon(ce: (e: any) => any) {
        const icon = (this.htmlIcon = ce('div'));

        icon.id = 'wewaIcon';
        icon.addEventListener('click', () => {
            if (this.htmlMenu.classList.contains('open')) {
                this.htmlMenu.classList.remove('open');
            } else {
                this.htmlMenu.classList.add('open');
            }
            if (icon.classList.contains('open')) {
                icon.classList.remove('open');
            } else {
                icon.classList.add('open');
            }
        });
        const bar1 = ce('div');
        const bar2 = ce('div');
        const bar3 = ce('div');

        icon.append(bar1, bar2, bar3);
        document.body.append(icon);
    }

    /**
     * Adds the actual Wallpaper Props as HTML
     * @param {Function} ce Create Element wrapper
     * @param {Object} proj project
     * @param {object} self this
     * @param {string} lang uage
     * @param {object} props options
     * @ignore
     * @returns {void}
     */
    private addMenuSettings(
        ce: (e: any) => any,
        proj: any,
        self: this,
        lang: string,
        props: any
    ) {
        const tbl = ce('table');

        tbl.innerHTML
            = '<col style="width:50%"> <col style="width:30%"> <col style="width:20%">';
        const tblBody = ce('tbody');

        tbl.append(tblBody);

        // if app supports audio, add input menu & handlers
        if (proj.general.supportsaudioprocessing) {
            this.addMenuAudio(ce, tblBody);
        }

        // create actual settings wrapper
        const settings = ce('tr');

        settings.innerHTML = '<td colspan=3><hr><h2>Settings</h2><hr></td>';
        tblBody.append(settings);

        // pause checkbox
        const pauseRow = ce('tr');
        const pauseOne = ce('td');

        pauseOne.innerHTML = '<h4>Pause on Unfocus</h4>';
        const pauseTwo = ce('td');

        pauseTwo.setAttribute('colspan', '2');
        const pauseBox = ce('input');

        pauseBox.setAttribute('type', 'checkbox');
        pauseBox.checked = this.pauseOnUnfocus;
        pauseBox.addEventListener('change', function() {
            // eslint-disable-next-line no-invalid-this
            self.pauseOnUnfocus = this.checked;
            localStorage.setItem('wewaPauseOnUnfocus', String(self.pauseOnUnfocus));
            // unpause if paused
            if (!self.pauseOnUnfocus && self.isPaused) {
                self.setPaused(false);
            }
        });
        pauseTwo.append(pauseBox);
        pauseRow.append(pauseOne, pauseTwo);
        tblBody.append(pauseRow);

        // language select?
        const local = proj.general.localization;

        if (local) {
            // set default language
            if (!lang) {
                lang = DefLang;
            }
            // add default strings
            this.mergeLocals(local);
            // add language menu row
            const row = this.makeMenuLocalization(ce, lang, local, props);

            tblBody.append(row);
        }

        // split content from actual settings
        const splitr = ce('tr');

        splitr.innerHTML = '<td colspan=3><hr></td>';
        tblBody.append(splitr);

        // sort settings by order
        const sortable = [];

        for (const p in props) {
            if (p) {
                sortable.push([p, props[p]]);
            }
        }
        sortable.sort((a, b) => {
            return a[1].order - b[1].order;
        });
        // add setting html elements
        for (const s of sortable) {
            const itm = this.createItem(s[0], s[1]);

            if (itm) {
                tblBody.append(itm);
            }
        }

        // pre-footer for resetting saved settings
        // finish up menu
        this.htmlMenu.append(tbl);
    }

    /**
     * Add missing default localization strings
     * @param {Object} local languageObj
     * @ignore
     * @returns {void}
     */
    private mergeLocals(local: any) {
        const locDefs = {
            ui_browse_properties_scheme_color: 'Scheme color',
            ui_ao_1303: 'Distance LOD',
            ui_ao_1303_1: 'Off',
            ui_ao_1303_2: 'Low',
            ui_ao_1303_3: 'Medium',
            ui_ao_1303_4: 'Strong',
            ui_ao_1304: 'Hotspot avoidance',
            ui_ao_1304_1: 'Off',
            ui_ao_1304_2: 'Low',
            ui_ao_1304_3: 'Medium',
            ui_ao_1304_4: 'Strong'
        };

        for (const loc in local) {
            if (!local[loc]) {
                continue;
            }
            for (const def in locDefs) {
                if (!local[loc][def]) {
                    local[loc][def] = locDefs[def];
                }
            }
        }
    }

    /**
     * Adds the Footer Link to the Menu
     * @param {Function} ce create element
     * @ignore
     * @returns {void}
     */
    private addMenuFooter(ce: (e: any) => any) {
        const preFoot = ce('div');

        preFoot.innerHTML = '<hr>';

        const actions = ce('div');

        actions.classList.add('actionRow');

        const copy = ce('a');

        copy.innerHTML = 'Copy Settings';
        copy.addEventListener('click', () => {
            this.copySettingsToClipboard();
        });

        const paste = ce('a');

        paste.innerHTML = 'Apply Settings';
        paste.addEventListener('click', () => {
            this.applySettingsFromClipboard();
        });

        actions.append(copy, paste);

        const rst = ce('a');

        rst.classList.add('red');
        rst.innerHTML = 'Reset ↩️';
        rst.addEventListener('click', () => {
            if (
                !window.confirm(
                    'This action will clear ALL local data!\r\n\r\nAre you sure?'
                )
            ) {
                return;
            }
            OfflineHelper.reset().then(() => {
                localStorage.clear();
                // eslint-disable-next-line no-self-assign
                location.reload();
            });
        });
        preFoot.append(actions, rst);

        // footer with ident
        const footer = ce('div');

        footer.innerHTML = `
        <hr>
        <p style='text-align:left; width:11ch; margin:auto; padding:auto;'>
        [W]allpaper<br>
        [E]ngine<br>
        [W]eb<br>
        [A]dapter
        </p>
        <a rel="noreferrer" target="_blank" href="https://hexx.one">by hexxone</a>
        `;

        this.htmlMenu.append(preFoot, footer);
    }

    // eslint-disable-next-line valid-jsdoc
    /**
     * Add Language Menu
     * @ignore
     */
    private makeMenuLocalization(ce: (e: any) => any, lang, local, props) {
        // add html struct
        const row = ce('tr');
        const td1 = ce('td');

        td1.innerHTML = '<h1>🌍</h1>';
        const td2 = ce('td');
        const lan = ce('select');

        // process all
        for (const loc in local) {
            if (!loc) {
                continue;
            }
            // build select option for this
            const lcs = ce('option');

            lcs.value = loc;
            lcs.innerHTML = loc.toUpperCase();
            lan.append(lcs);
            // check for correct language code
            if (loc !== lang) {
                continue;
            } else {
                lcs.setAttribute('selected', 'true');
            }
            // set properties translated text
            for (const p in props) {
                if (!p) {
                    continue;
                }
                const itm = props[p];
                const pTxt = itm.text;
                const rTxt = local[loc][pTxt];

                if (rTxt) {
                    itm.realText = rTxt;
                }
                // process combo box values
                if (itm.type === 'combo') {
                    for (const o of itm.options) {
                        const lTxt = local[loc][o.label];

                        if (lTxt) {
                            o.realLabel = lTxt;
                        }
                    }
                }
            }
        }
        // if changed, do it all over again.
        // eslint-disable-next-line @typescript-eslint/no-this-alias, consistent-this
        const ref = this;

        lan.addEventListener('change', function() {
            // eslint-disable-next-line no-invalid-this
            localStorage.setItem('wewaLang', this.value);
            // eslint-disable-next-line no-invalid-this
            ref.addMenu(this.value);
            ref.applyAudioProcessingSettings();
            ref.evaluateSettings();
            (ref.htmlIcon as any).click();
        });
        td2.setAttribute('colspan', '2');
        td2.append(lan);
        row.append(td1, td2);

        return row;
    }

    // eslint-disable-next-line valid-jsdoc
    /**
     * Add Audio Menu
     * @ignore
     */
    private addMenuAudio(ce: (e: any) => any, tblBody: any) {
        // audio input methods
        const row = ce('tr');

        const td1 = ce('td');

        td1.innerHTML = '<hr><h2>Audio Input</h2><hr>';
        td1.setAttribute('colspan', '3');

        // Microphone input
        const aBtn1 = ce('a');

        aBtn1.classList.add('audio');
        aBtn1.innerHTML = 'Microphone';
        aBtn1.addEventListener('click', () => {
            this.initMicrophone();
        });

        // Desktop Audio input
        const aBtn2 = ce('a');

        aBtn2.classList.add('audio');
        aBtn2.innerHTML = 'Desktop Audio (Chrome)';
        aBtn2.addEventListener('click', () => {
            this.initDesktop();
        });

        // File Url input
        const aBtn3 = ce('a');

        aBtn3.classList.add('audio');
        aBtn3.innerHTML = 'Select URL';
        aBtn3.addEventListener('click', () => {
            const uri = prompt(
                'Please enter some audio file URL\r\n\r\nYouTube, Soundcloud etc. ARE NOT YET SUPPORTED!',
                'https://example.com/test.mp3'
            );

            this.initFile(uri);
        });

        // System file input
        const aBtn4 = ce('input');

        aBtn4.id = 'wewaAudioInput';
        aBtn4.innerHTML = 'Select File';
        aBtn4.setAttribute('type', 'file');
        aBtn4.addEventListener('change', (e) => {
            const file = (e.target as any).files[0];

            if (!file) {
                return;
            }
            this.initFile(file);
        });

        td1.append(aBtn1, aBtn2, aBtn3, aBtn4);
        row.append(td1);

        // file drag & drop area
        const dropRow = ce('tr');
        const dropCol1 = ce('td');
        const dropCol2 = ce('td');

        dropCol1.setAttribute('colspan', '3');

        const dropArea = ce('div');

        dropArea.innerHTML = 'Drag & Drop';
        dropArea.classList.add(...['droparea', 'audio']);
        dropArea.addEventListener(
            'dragover',
            (evt) => {
                evt.stopPropagation();
                evt.preventDefault();
                evt.dataTransfer.dropEffect = 'copy';
            },
            false
        );
        dropArea.addEventListener(
            'drop',
            (e) => {
                e.stopPropagation();
                e.preventDefault();
                const droppedFiles = e.dataTransfer.files;

                this.initFile(droppedFiles[0]);
            },
            false
        );
        dropCol1.append(dropArea);
        dropRow.append(dropCol1, dropCol2);

        // Play & Stop Btn
        const hrrow = ce('tr');
        const hrtd1 = ce('td');

        hrtd1.id = 'audioMarker';
        hrtd1.setAttribute('colspan', '3');
        const stopBtn = ce('a');

        stopBtn.classList.add('red');
        stopBtn.innerHTML = 'Stop All Audio';
        stopBtn.addEventListener('click', () => {
            this.stopAudioInterval();
        });
        hrtd1.append(stopBtn);
        const hrtd2 = ce('td');

        hrrow.append(hrtd1, hrtd2);

        // finally add rows to table
        tblBody.append(row, dropRow, hrrow);
    }

    // eslint-disable-next-line valid-jsdoc
    /**
     * Add preview Image, Title and Link
     * @ignore
     */
    private addMenuHeader(
        ce: (e: any) => any,
        proj: any,
        menu = this.htmlMenu
    ) {
        const preview = ce('img');

        preview.setAttribute('src', proj.preview);
        preview.setAttribute('alt', 'Steam Workshop Preview Image');
        // create menu app title
        const header = ce('div');

        header.innerHTML = `<h2>${proj.title}</h2>`;
        // create workshop link
        const link = ce('a');

        link.setAttribute('rel', 'noreferrer');
        link.setAttribute(
            'href',
            `https://steamcommunity.com/sharedfiles/filedetails/?id=${proj.workshopid}`
        );
        link.setAttribute('target', '_blank');
        link.innerHTML = '<h3>Open Workshop Page</h3>';
        menu.append(preview, header, link);
    }

    // eslint-disable-next-line valid-jsdoc
    /**
     * Create an HTML Menu Item from project json property
     * @ignore
     */
    private createItem(prop, itm) {
        if (!itm.type || itm.type === 'hidden') {
            return null;
        }

        // eslint-disable-next-line @typescript-eslint/no-this-alias, consistent-this
        const ref = this;

        const ce = (e) => {
            return document.createElement(e);
        };

        // table structure
        const row = ce('tr');

        row.setAttribute('id', `wewa_${prop}`);

        // Text
        const column1 = ce('td');

        column1.classList.add('left');
        // Input
        const column2 = ce('td');

        column2.classList.add('right');

        // optional NumericUpDown Column for sliders
        let column3 = null;

        // div or label text element
        let txt = null;
        // main input element
        let inpt = null;

        // Process actual prop type
        switch (itm.type) {
            // only text across 3 columns
            case 'text':
                txt = ce('div');
                txt.innerHTML = itm.realText ? itm.realText : itm.text;
                column1.setAttribute('colspan', 3);
                break;

            // combo select-box across 2 columns
            case 'combo':
                inpt = ce('select');
                // set options
                for (const o of itm.options) {
                    const opt = ce('option');

                    opt.value = String(o.value);
                    opt.innerText = o.realLabel ? o.realLabel : o.label;
                    inpt.appendChild(opt);
                }
                inpt.value = String(itm.value);
                break;

            // system color picker across 2 columns
            case 'color':
                inpt = ce('input');
                inpt.setAttribute('type', 'color');
                break;

            // Checkbox across 2 columns
            case 'bool':
                inpt = ce('input');
                inpt.setAttribute('type', 'checkbox');
                inpt.setAttribute('readonly', true);
                break;

            // Slider input across 1 column; + 1 column Up/Down
            case 'slider': {
                const canEdit = itm.editable;
                // create numeric-up-down
                const sliderVal = ce(canEdit ? 'input' : 'output');

                sliderVal.name = `wewa_out_${prop}`;
                sliderVal.setAttribute('id', sliderVal.name);
                sliderVal.setAttribute('type', 'number');
                sliderVal.style.width = '75%';
                if (canEdit) {
                    sliderVal.setAttribute('value', itm.value);
                    sliderVal.addEventListener('change', function() {
                        // eslint-disable-next-line no-invalid-this
                        ref.setProperty(prop, this);
                    });
                } else {
                    sliderVal.innerHTML = itm.value;
                }
                // create td3
                column3 = ce('td');
                column3.append(sliderVal);
                // create actual slider & values
                inpt = ce('input');
                inpt.setAttribute('type', 'range');
                inpt.max = itm.max;
                inpt.min = itm.min;
                inpt.step = 0.1;
                break;
            }
            // Text input across 2 columns
            case 'textinput':
                inpt = ce('input');
                inpt.setAttribute('type', 'text');
                break;

            // File input across 2 columns
            case 'file':
                inpt = ce('input');
                inpt.setAttribute('type', 'file');
                break;

            default:
                Smallog.error(`unkown setting type: ${itm.type}`, LogHead);
                break;
        }

        const eid = `wewa_prop_${prop}`;

        // make input label if not text
        if (!txt) {
            txt = ce('label');
            txt.setAttribute('for', eid);
            txt.innerHTML = itm.realText ? itm.realText : itm.text;
        }
        column1.append(txt);

        // listen for changes if input type (no text)
        if (inpt) {
            inpt.style.width = '100%';
            inpt.setAttribute('id', eid);
            inpt.addEventListener('change', function() {
                // eslint-disable-next-line no-invalid-this
                ref.setProperty(prop, this);
            });
            column2.prepend(inpt);
        }

        // append td3 or stretch td2?
        row.append(column1, column2);
        if (column3) {
            row.append(column3);
        } else {
            column2.setAttribute('colspan', 2);
        }

        return row;
    }

    // -------------------------------------
    //  Settings Helper
    // -------------------------------------

    // eslint-disable-next-line valid-jsdoc
    /**
     * Callback for UI-Settings changes
     * Will apply them to the storage and running wallaper.
     * @public
     */
    public setProperty(prop, elm) {
        // get the type and apply the value
        const props = this.projectData.general.properties;

        // check for legit setting...
        if (!props[prop]) {
            Smallog.error(`SetProperty name not found: ${prop}`, LogHead);

            return;
        }

        // enabled delayed call of settings update
        const applyCall = (val) => {
            // save the updated value to storage
            props[prop].value = val;
            // update
            this.applyAudioProcessingSettings();
            this.evaluateSettings();
            const obj = {};

            obj[prop] = props[prop];
            this.applyProp(obj);
        };

        // process value based on DOM element type
        switch (props[prop].type) {
            case 'bool':
                applyCall(this.coercePropertyValue(props[prop], elm.checked));
                break;
            case 'color':
                applyCall(this.coercePropertyValue(props[prop], elm.value));
                break;
            case 'file':
                this.loadXHRSaveLocal(elm.value, (res) => {
                    return applyCall(this.coercePropertyValue(props[prop], res));
                });
                break;
            case 'slider':
                if (elm.name.includes('_out_')) {
                    const inpt: any = document.querySelector(
                        `#wewa_prop_${prop}`
                    );

                    if (inpt) {
                        inpt.value = elm.value;
                    } else {
                        Smallog.error(`Slider not found: ${prop}`, LogHead);
                    }
                } else {
                    const slide: any = document.querySelector(
                        `#wewa_out_${prop}`
                    );

                    if (slide) {
                        slide.value = elm.value;
                    } else {
                        Smallog.error(
                            `Numericupdown not found: ${prop}`,
                            LogHead
                        );
                    }
                }
            // eslint-disable-next-line no-fallthrough
            case 'combo':
            case 'textinput':
                applyCall(this.coercePropertyValue(props[prop], elm.value));
                break;
        }
    }

    /**
     * @ignore
     * will load the given file and return it as dataURL.
     * this way we can easily store whole files in the configuration & localStorage.
     * its not safe that this works with something else than image files.
     * @param {string} url file
     * @param {function} resCall finished-call
     * @returns {void}
     */
    private loadXHRSaveLocal(
        url,
        resCall: (data: string | ArrayBuffer) => void
    ) {
        WascUtil.myFetch(url, 'blob').then((resp) => {
            // Read out file contents as a Data URL
            const fReader = new FileReader();

            // onload needed since Google Chrome doesn't support addEventListener for FileReader
            fReader.onload = (evt) => {
                return resCall(evt.target.result);
            };
            // Load blob as Data URL
            fReader.readAsDataURL(resp);
        });
    }

    /**
     * Show or hide menu items based on eval condition
     * @public
     * @returns {void}
     */
    public evaluateSettings() {
        // dynamic prefix for evaluation
        const pre = 'wewaProps';
        const wewaProps = this.projectData.general.properties;

        this.saveStorage();
        for (const p in wewaProps) {
            if (!p) {
                continue;
            }
            const prop = wewaProps[p];

            // some ev(a|i)l magic
            let visible = true;

            if (prop.condition?.length > 0) {
                // copy our condition string to modify
                let cprop = String(prop.condition).split(' ')
                    .join('');
                // remove whitespaces and split to partials by logic operators
                const partials = cprop.split(/&&|\|\|/);

                // loop all partial values of the check
                for (const part of partials) {
                    let prefix = `${pre}.`;
                    const onlyVal = part.match(/[!a-zA-Z0-9_.]*/)[0];

                    if (
                        !onlyVal.startsWith(prefix)
                        && !onlyVal.startsWith(`!${prefix}`)
                    ) {
                        // fix for inverted values
                        let replW = onlyVal;

                        if (replW.startsWith('!')) {
                            replW = replW.substring(1);
                            prefix = `!${prefix}`;
                        }
                        // Smallog.Debug("replace: " + onlyVal + " >> " + prefix + replW);
                        cprop = cprop.replace(onlyVal, prefix + replW);
                    }
                }
                try {
                    visible
                        = new Function(pre, `return (${cprop})`)(wewaProps)
                        === true;
                } catch (e) {
                    Smallog.error(
                        `Error: (${cprop}) for: ${p} => ${e}`,
                        LogHead
                    );
                }
            }

            // get input dom element
            const htElm = document.getElementById(`wewa_${p}`);

            if (!htElm || htElm.childNodes.length < 2) {
                continue;
            }

            if (visible) {
                htElm.classList.remove('hide');
            } else {
                htElm.classList.add('hide');
            }

            // set its value
            const elm: any = htElm.childNodes[1].childNodes[0];

            switch (prop.type) {
                case 'color':
                    elm.value = this.rgbToHex(prop.value);
                    break;
                case 'bool':
                    elm.checked = prop.value === true;
                    break;
                case 'slider':
                    elm.value = String(prop.value);
                    {
                        const outElm = document.getElementById(
                            `wewa_out_${p}`
                        ) as HTMLInputElement | HTMLOutputElement | null;

                        if (outElm) {
                            if (outElm instanceof HTMLInputElement) {
                                outElm.value = String(prop.value);
                            } else {
                                outElm.textContent = String(prop.value);
                            }
                        }
                    }
                    break;
                case 'combo':
                case 'textinput':
                    elm.value = String(prop.value);
                    break;
            }
        }
    }

    private async copySettingsToClipboard() {
        const payload = JSON.stringify(this.getSerializableProps(), null, 2);

        try {
            await navigator.clipboard.writeText(payload);
            Smallog.info('Copied settings to clipboard.', LogHead);
        } catch (error) {
            Smallog.error(`Clipboard copy failed: ${error}`, LogHead);
            window.prompt('Copy the settings JSON manually:', payload);
        }
    }

    private async applySettingsFromClipboard() {
        let rawSettings = '';

        try {
            rawSettings = await navigator.clipboard.readText();
        } catch (error) {
            Smallog.error(`Clipboard read failed: ${error}`, LogHead);
            rawSettings = window.prompt('Paste the settings JSON:', '') ?? '';
        }

        if (!rawSettings) {
            return;
        }

        let parsed;

        try {
            parsed = JSON.parse(rawSettings);
        } catch (error) {
            Smallog.error(`Invalid settings JSON: ${error}`, LogHead);
            alert('Could not parse clipboard settings.');

            return;
        }

        if (!parsed || typeof parsed !== 'object' || parsed instanceof Array) {
            alert('Clipboard settings must be a JSON object.');

            return;
        }

        const props = this.projectData.general.properties;
        const changedProps = {};

        Object.keys(parsed).forEach((key) => {
            const prop = props[key];

            if (!prop || prop.type === 'hidden') {
                return;
            }

            prop.value = this.coercePropertyValue(prop, parsed[key]);
            changedProps[key] = prop;
        });

        this.applyAudioProcessingSettings();
        this.evaluateSettings();
        this.applyProp(changedProps);
        this.saveStorage();
        Smallog.info(
            `Applied clipboard settings (${Object.keys(changedProps).length} values).`,
            LogHead
        );
    }

    // -------------------------------------
    //  Wallpaper Interface
    // -------------------------------------

    // eslint-disable-next-line valid-jsdoc
    /**
     * Send one or more properties to the Wallpaper
     * @public
     */
    public applyProp(prop) {
        const wpl = window[this.propListener];

        if (wpl && wpl.applyUserProperties) {
            wpl.applyUserProperties(prop);
        }
    }

    // eslint-disable-next-line valid-jsdoc
    /**
     * Send paused-status to the Wallpaper
     * @public
     */
    public setPaused(val: boolean) {
        const wpl = window[this.propListener];

        if (this.isPaused === val) {
            return;
        }
        if (val && !this.pauseOnUnfocus) {
            return;
        }
        if (wpl && wpl.setPaused) {
            wpl.setPaused(val);
            this.isPaused = val;
        }
    }

    // -------------------------------------
    //  UI Color Input conversion
    // -------------------------------------

    // eslint-disable-next-line require-jsdoc
    private rgbToHex(rgb) {
        const { r, g, b } = rgbToObj(rgb);

        // eslint-disable-next-line require-jsdoc
        function cth(c) {
            const h = Math.floor(c).toString(16);

            return h.length === 1 ? `0${h}` : h;
        }

        return `#${cth(r)}${cth(g)}${cth(b)}`;
    }

    // -------------------------------------
    //  AUDIO PROCESSING
    // -------------------------------------

    /**
     * Request microphone from browser
     * @ignore
     * @returns {void}
     */
    private initMicrophone() {
        const md = navigator.mediaDevices as any;

        if (!md.getUserMedia) {
            return;
        }
        md.getUserMedia({
            audio: true
        })
            .then((stream) => {
                Smallog.debug('Got Microphone MediaStream!');
                // stop previous analyzer
                this.stopAudioInterval();
                this.makeAnalyzer(stream);
            })
            .catch((err) => {
                Smallog.error(err, LogHead);
                if (location.protocol !== 'https:') {
                    const r = confirm(
                        "Activating the Microphone failed! Your Browser might require the site to be loaded using HTTPS! Press 'ok'/'yes' to get redirected from HTTP => HTTPS."
                    );

                    if (r) {
                        window.location.href = window.location.href.replace(
                            'http',
                            'https'
                        );
                    }
                }
            });
    }

    /**
     * Initiate Desktop auddio streaming
     * @returns {void}
     */
    private async initDesktop() {
        const md = navigator.mediaDevices as any;

        if (!md.getDisplayMedia) {
            return;
        }
        md.getDisplayMedia({
            video: true,
            audio: true
        })
            .then((stream) => {
                Smallog.debug('Got Desktop MediaStream!');
                // stop previous analyzer
                this.stopAudioInterval();
                this.makeAnalyzer(stream);
            })
            .catch((e) => {
                Smallog.error('Cant Open Desktop Audio Stream!', '[WEWA] ');
                console.error(e);
            });
    }

    /**
     * Start the audio processing & analyzer
     * @param {Blob | MediaSource | string} source start audio
     * @ignore
     * @returns {void}
     */
    private initFile(source: Blob | MediaSource | string) {
        // stop previous analyzer
        this.stopAudioInterval();
        if (!source) {
            return;
        }

        // create player
        this.audio = document.createElement('audio');
        this.audio.src
            = source instanceof String
                ? (source as string)
                : URL.createObjectURL(source as any);
        this.audio.autoplay = true;
        this.audio.setAttribute('controls', 'true');
        this.audio.play();
        // insert before marker
        const markr = document.getElementById('audioMarker');

        markr.prepend(this.audio);

        this.makeAnalyzer(this.audio);
    }

    /**
     * Create actual HTML5 audio analyzer
     * @param {MediaStream | HTMLAudioElement} source start audio
     * @returns {void}
     */
    private makeAnalyzer(source: MediaStream | HTMLAudioElement) {
        // new context
        // eslint-disable-next-line dot-notation
        this.ctx = new (window.AudioContext || window['webkitAudioContext'])({
            sampleRate: 48000
        });
        // microphone or desktop stream sauce
        if (source instanceof MediaStream) {
            this.source = this.ctx.createMediaStreamSource(source);
            // hack for firefox to keep stream running
            // eslint-disable-next-line dot-notation
            window['persistAudioStream'] = source;
        }
        // audio html element sauce
        if (source instanceof HTMLAudioElement) {
            this.source = this.ctx.createMediaElementSource(source);
            // we want to hear this on our pc => connect source OUT to media IN
            this.source.connect(this.ctx.destination);
        }
        // new analyzer
        this.analyser = this.ctx.createAnalyser();
        this.analyser.smoothingTimeConstant = 0.02;
        this.analyser.fftSize = 256;
        // connect source OUT to analyzer IN
        this.source.connect(this.analyser);
        // start analyzing
        this.startAudioInterval();
    }

    /**
     * Start the processing loop
     * @ignore
     * @returns {void}
     */
    private startAudioInterval() {
        const data = new Uint8Array(128);

        // 33ms ~~ 30fps
        this.audioInterval = setInterval(() => {
            if (this.audioCallback === null) {
                this.stopAudioInterval();
                Smallog.error('no AudioCallback!', LogHead);

                return;
            }
            this.analyser.getByteFrequencyData(data);
            const stereo = this.convertAudio(data);

            this.audioCallback(stereo);
        }, 33);
        // tell Wallpaper we are sending audio
        this.applyProp({
            audioprocessing: {
                value: true
            }
        });
    }

    /**
     * html5 audio analyser gives us mono data from 0(bass) to 128(treble)
     * however, wallpaper engine expects stereo data in following format:
     * 0(L: low) to 63(L: treble) and 64(R: low) to 128(R: treble)
     * so we do some array transformation... and divide by 255 (8bit-uint becomes float)
     * @ignore
     * @param {Uint8Array} data input
     * @returns {number[]} result
     */
    private convertAudio(data: Uint8Array): number[] {
        const stereo = [];
        let sIdx = 0;

        for (let i = 0; i < 64; i++) {
            stereo[i] = data[sIdx++] / 255;
            stereo[64 + i] = data[sIdx++] / 255;
        }

        return stereo;
    }

    /**
     * Stop the processing loop
     * @public
     * @returns {void}
     */
    public stopAudioInterval() {
        // eslint-disable-next-line dot-notation
        window['persistAudioStream'] = null;
        document.getElementById('wewaAudioInput').setAttribute('value', '');
        if (this.audio) {
            this.audio.remove();
        }
        if (this.audioInterval) {
            clearInterval(this.audioInterval);
            this.audioInterval = null;
        }
    }

}
