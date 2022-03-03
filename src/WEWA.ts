/**
 * @author hexxone / https://hexx.one
 *
 * @license
 * Copyright (c) 2021 hexxone All rights reserved.
 * Licensed under the GNU GENERAL PUBLIC LICENSE.
 * See LICENSE file in the project root for full license information.
 */

import { Smallog, waitReady, OfflineHelper, WascUtil } from "./";

const LogHead = "[WEWWA] ";
const DefLang = "de-de";
const wral = "wallpaperRegisterAudioListener";
const proj = "project.json";

/**
 * WEWWA
 * <br/>
 * Wallpaper Engine Web Wallpaper Adapter
 * <br/>
 * This is an aditional TS class to be included in your Typescript/Webpack Wallpaper Engine
 * Web-Wallpaper project - so you can test, run & configure it from a normal web browser.
 * <br/>
 * REQUIREMENTS:
 * <br/>
 * - HTML5 Browser
 * <br/>
 * - the "project.json" needs to be in the root folder like "index.html"
 * <br/>
 * - this file needs to be included/built in your "index.html"
 * <br/>
 * <br/>
 * FEATURES:
 * <br/>
 * - automatically detecting if the web wallpaper is opened by wallpaper engine or browser
 * <br/>
 * - if opened by wallpaper engine, nothing will happen
 * <br/>
 * - if opened by a browser:
 * <br/>
 *   - use a ServiceWorker to make page always available offline
 * <br/>
 *   - automatically load the "project.json"
 * <br/>
 *   - parse the settings, languages & conditions
 * <br/>
 *   - add respective html elements for each setting type & condition
 * <br/>
 *   - put these elements into an option menu which can be hidden
 * <br/>
 *   - check localStorage for already saved/customized values
 * <br/>
 *   - apply all settings once
 * <br/>
 * - react to changes made in the ui and update them in the wallpaper
 * <br/>
 * - save changes made in the ui to localStorage
 *
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
export class WEWWA {
	private project: any = null;

	private htmlMenu: Element = null;
	private htmlIcon: Element = null;

	private audio: HTMLAudioElement = null;
	private ctx: AudioContext = null;
	private source: any = null;
	private analyser: any = null;

	private audioInterval: any = null;
	private audioCallback: any = null;

	private pauseOnUnfocus = true;
	private isPaused = false;

	/**
	 * Check if we are running in Web-Mode
	 * if yes => iniitialize, else => do nothing
	 * @param {Function} finished Callback for initializing the wallpaper
	 */
	constructor(finished) {
		if (window[wral]) {
			Smallog.info("detected wallpaper engine => Standby.", LogHead);
			finished();
			return;
		}

		Smallog.info("wallpaper engine not detected => Init!", LogHead);

		// define audio listener first, so we dont miss when it gets registered.
		window[wral] = (callback) => {
			// set callback to be called later with analysed audio data
			this.audioCallback = callback;
			Smallog.info("Registered wallpaper AudioListener.", LogHead);
		};

		// intialize when ready
		waitReady().then(() => {
			// make the website available offline using service worker
			OfflineHelper.register(document.title.replace(" ", "")).then(() => {
				// continue initializing
				finished();
				this.init();

				// pause and resume on focus events
				window.onblur = () => this.setPaused(true);
				window.onfocus = () => this.setPaused(false);
			});
		});
	}

	/**
	 * Initialize the Web Adapter
	 * @ignore
	 * @returns {void}
	 */
	private init() {
		WascUtil.myFetch(proj, "json").then((proj) => {
			if (proj.type != "web") {
				Smallog.error(
					`Error! Loaded ${proj} is not a web Wallpaper. How did this happen? Aborting...`,
					LogHead
				);
				return;
			}

			// new NDBG();

			this.project = proj;
			this.loadStorage();
			this.addStyle();
			this.addMenu(localStorage.getItem("wewwaLang"));
			this.evaluateSettings();
			this.applyProp(proj.general.properties);
		});
	}

	/**
	 * Load last settings from localStorage
	 * @ignore
	 * @returns {void}
	 */
	private loadStorage() {
		const props = this.project.general.properties;
		const last = localStorage.getItem("wewwaLastProps");
		if (last != null) {
			const merged = Object.assign(props, JSON.parse(last));
			merged.audioprocessing = {
				value: this.project.general.supportsaudioprocessing,
				type: "hidden",
			};
			this.project.general.properties = merged;
			Smallog.debug("Loaded & merged settings.", LogHead);
		}
	}

	/**
	 * CSS Insertion
	 * @ignore
	 * @returns {void}
	 */
	private addStyle() {
		const st = document.createElement("style");
		// precalculation
		const minWidthPx = 420;
		const percentageWidth = 20;
		const pwShort = `${percentageWidth}vw`;
		st.innerHTML = `
		#wewwaMenu, #wewwaIcon {
			transform: none;
			transition: transform 500ms ease;
			position:absolute;
			top:0px;
			padding:15px;
			z-index:9999;
		}
		#wewwaMenu {
			top:10px;
			border: solid 2px #444;
			width:${pwShort};
			left:100vw;
			color:white;
			background-color: rgba(0.6,0.6,0.6,0.8);
			overflow-x:hidden;
			overflow-y:scroll;
			max-height:92.5%;
			min-width: ${minWidthPx}px;
			max-width: 100vw;
			font-family: Helvetica, Verdana, Arial;
			font-size: larger;
		}
		#wewwaMenu hr {
			margin: 20px 0px;
		}
		#wewwaMenu a {
			color: white;
			border: 2px solid #4CAF50;
			padding: 5px 10px;
			margin: 5px;
			text-decoration: none;
			display: block;
		}
		#wewwaMenu a:hover {
			background: #4CAF50;
		}
		#wewwaMenu .red {
			border-color: #FF7F50;
		}
		#wewwaMenu .red:hover {
			background-color: #FF7F50;
		}
		#wewwaMenu .audio {
			border-color: #00a1ff;
		}
		#wewwaMenu .audio:hover {
			background-color: #00a1ff;
		}
		#wewwaMenu audio, #wewwaMenu select {
			width: 100%;
		}
		#wewwaMenu table {
			width:100%;
			table-layout: fixed;
		}
		#wewwaMenu tr.hide {
			display: none;
		}
		#wewwaMenu td {
			width: 50%;
			padding: 5px;
		}
		#wewwaMenu .left {
			text-align: left;
		}
		#wewwaMenu .right {
			text-align: right;
		}
		#wewwaMenu img {
			width: ${percentageWidth / 2}vw;
			min-width: ${Math.floor(minWidthPx / 2)}px;
			max-width: 90%;
			heigth: auto;
		}
		#wewwaMenu .droparea {
			border: 2px dashed #bbb;
			-webkit-border-radius: 5px;
			border-radius: 5px;
			padding: 20px;
			text-align: center;
			font: 18pt;
			color: #bbb;
		}
		/* Icon */
		#wewwaIcon {
			right:0px;
			cursor:pointer;
		}
		#wewwaIcon div {
			width:35px;
			height:5px;
			background-color:#888888;
			margin:6px 0;
		}
		
		#wewwaMenu.open, #wewwaIcon.open {
			transform: translateX(min(-${percentageWidth * 1.1}vw, -${Math.floor(
			minWidthPx * 1.1
		)}px));
			transition: transform 500ms ease;
		}
		
		/* Smartphone format */
		@media all and (max-width: 1000px) {
			#wewwaMenu {
				width:90vw;
			}
			#wewwaMenu.open {
				transform: translateX(-95vw);
				transition: transform 500ms ease;
			}
			#wewwaIcon.open {
				transform: translateX(calc(-100vw + 60px));
				transition: transform 500ms ease;
			}
		}
		`;
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
			this.htmlMenu = null;
		}

		// quick wrapper, we need this a lot
		const ce = (e) => document.createElement(e);

		// local vars faster
		const proj = this.project;
		const props = proj.general.properties;

		// create root menu
		this.htmlMenu = ce("div");
		this.htmlMenu.id = "wewwaMenu";

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
		const icon = (this.htmlIcon = ce("div"));
		icon.id = "wewwaIcon";
		icon.addEventListener("click", () => {
			if (this.htmlMenu.classList.contains("open")) {
				this.htmlMenu.classList.remove("open");
			} else {
				this.htmlMenu.classList.add("open");
			}
			if (icon.classList.contains("open")) {
				icon.classList.remove("open");
			} else {
				icon.classList.add("open");
			}
		});
		const bar1 = ce("div");
		const bar2 = ce("div");
		const bar3 = ce("div");
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
		const tbl = ce("table");
		tbl.innerHTML =
			'<col style="width:50%"> <col style="width:30%"> <col style="width:20%">';
		const tblBody = ce("tbody");
		tbl.append(tblBody);

		// if app supports audio, add input menu & handlers
		if (proj.general.supportsaudioprocessing) {
			this.addMenuAudio(ce, tblBody);
		}

		// create actual settings wrapper
		const settings = ce("tr");
		settings.innerHTML = "<td colspan=3><hr><h2>Settings</h2><hr></td>";
		tblBody.append(settings);

		// pause checkbox
		const pauseRow = ce("tr");
		const pauseOne = ce("td");
		pauseOne.innerHTML = "<h4>Pause on Unfocus</h4>";
		const pauseTwo = ce("td");
		pauseTwo.setAttribute("colspan", "2");
		const pauseBox = ce("input");
		pauseBox.setAttribute("type", "checkbox");
		pauseBox.setAttribute("checked", this.pauseOnUnfocus);
		pauseBox.addEventListener("change", function () {
			// eslint-disable-next-line no-invalid-this
			self.pauseOnUnfocus = this.checked;
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
		const splitr = ce("tr");
		splitr.innerHTML = "<td colspan=3><hr></td>";
		tblBody.append(splitr);

		// sort settings by order
		const sortable = [];
		for (const p in props) {
			if (p) sortable.push([p, props[p]]);
		}
		sortable.sort((a, b) => a[1].order - b[1].order);
		// add setting html elements
		for (const s of sortable) {
			const itm = this.createItem(s[0], s[1]);
			if (itm) tblBody.append(itm);
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
			ui_browse_properties_scheme_color: "Scheme color",
		};
		for (const loc in local) {
			if (!local[loc]) continue;
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
		const preFoot = ce("div");
		preFoot.innerHTML = "<hr>";

		const rst = ce("a");
		rst.classList.add("red");
		rst.innerHTML = "Reset ↩️";
		rst.addEventListener("click", () => {
			if (
				!window.confirm(
					"This action will clear ALL local data!\r\n\r\nAre you sure?"
				)
			) {
				return;
			}
			OfflineHelper.reset().then(() => {
				localStorage.clear();
				// eslint-disable-next-line no-self-assign
				location = location;
			});
		});
		preFoot.append(rst);

		// footer with ident
		const footer = ce("div");
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
		const row = ce("tr");
		const td1 = ce("td");
		td1.innerHTML = "<h1>🌍</h1>";
		const td2 = ce("td");
		const lan = ce("select");
		// process all
		for (const loc in local) {
			if (!loc) continue;
			// build select option for this
			const lcs = ce("option");
			lcs.value = loc;
			lcs.innerHTML = loc.toUpperCase();
			lan.append(lcs);
			// check for correct language code
			if (loc != lang) continue;
			else lcs.setAttribute("selected", "true");
			// set properties translated text
			for (const p in props) {
				if (!p) continue;
				const itm = props[p];
				const pTxt = itm.text;
				const rTxt = local[loc][pTxt];
				if (rTxt) itm.realText = rTxt;
				// process combo box values
				if (itm.type == "combo") {
					for (const o of itm.options) {
						const lTxt = local[loc][o.label];
						if (lTxt) o.realLabel = lTxt;
					}
				}
			}
		}
		// if changed, do it all over again.
		// eslint-disable-next-line @typescript-eslint/no-this-alias
		const self = this;
		lan.addEventListener("change", function () {
			// eslint-disable-next-line no-invalid-this
			localStorage.setItem("wewwaLang", this.value);
			// eslint-disable-next-line no-invalid-this
			self.addMenu(this.value);
			self.evaluateSettings();
			(self.htmlIcon as any).click();
		});
		td2.setAttribute("colspan", "2");
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
		const row = ce("tr");

		const td1 = ce("td");
		td1.innerHTML = "<hr><h2>Audio Input</h2><hr>";
		td1.setAttribute("colspan", "3");

		// Microphone input
		const aBtn1 = ce("a");
		aBtn1.classList.add("audio");
		aBtn1.innerHTML = "Microphone";
		aBtn1.addEventListener("click", () => {
			this.initMicrophone();
		});

		// Desktop Audio input
		const aBtn2 = ce("a");
		aBtn2.classList.add("audio");
		aBtn2.innerHTML = "Desktop Audio (Chrome)";
		aBtn2.addEventListener("click", () => {
			this.initDesktop();
		});

		// File Url input
		const aBtn3 = ce("a");
		aBtn3.classList.add("audio");
		aBtn3.innerHTML = "Select URL";
		aBtn3.addEventListener("click", () => {
			const uri = prompt(
				"Please enter some audio file URL\r\n\r\nYouTube, Soundcloud etc. ARE NOT YET SUPPORTED!",
				"https://example.com/test.mp3"
			);
			this.initFile(uri);
		});

		// System file input
		const aBtn4 = ce("input");
		aBtn4.id = "wewwaAudioInput";
		aBtn4.innerHTML = "Select File";
		aBtn4.setAttribute("type", "file");
		aBtn4.addEventListener("change", (e) => {
			const file = (e.target as any).files[0];
			if (!file) {
				return;
			}
			this.initFile(file);
		});

		td1.append(aBtn1, aBtn2, aBtn3, aBtn4);
		row.append(td1);

		// file drag & drop area
		const dropRow = ce("tr");
		const dropCol1 = ce("td");
		const dropCol2 = ce("td");
		dropCol1.setAttribute("colspan", "3");

		const dropArea = ce("div");
		dropArea.innerHTML = "Drag & Drop";
		dropArea.classList.add(...["droparea", "audio"]);
		dropArea.addEventListener(
			"dragover",
			(evt) => {
				evt.stopPropagation();
				evt.preventDefault();
				evt.dataTransfer.dropEffect = "copy";
			},
			false
		);
		dropArea.addEventListener(
			"drop",
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
		const hrrow = ce("tr");
		const hrtd1 = ce("td");
		hrtd1.id = "audioMarker";
		hrtd1.setAttribute("colspan", "3");
		const stopBtn = ce("a");
		stopBtn.classList.add("red");
		stopBtn.innerHTML = "Stop All Audio";
		stopBtn.addEventListener("click", () => {
			this.stopAudioInterval();
		});
		hrtd1.append(stopBtn);
		const hrtd2 = ce("td");
		hrrow.append(hrtd1, hrtd2);

		// finally add rows to table
		tblBody.append(row, dropRow, hrrow);
	}

	// eslint-disable-next-line valid-jsdoc
	/**
	 * Add preview Image, Title and Link
	 * @ignore
	 */
	private addMenuHeader(ce: (e: any) => any, proj: any, menu = this.htmlMenu) {
		const preview = ce("img");
		preview.setAttribute("src", proj.preview);
		preview.setAttribute("alt", "Steam Workshop Preview Image");
		// create menu app title
		const header = ce("div");
		header.innerHTML = "<h2>" + proj.title + "</h2>";
		// create workshop link
		const link = ce("a");
		link.setAttribute("rel", "noreferrer");
		link.setAttribute(
			"href",
			"https://steamcommunity.com/sharedfiles/filedetails/?id=" +
				proj.workshopid
		);
		link.setAttribute("target", "_blank");
		link.innerHTML = "<h3>Open Workshop Page</h3>";
		menu.append(preview, header, link);
	}

	// eslint-disable-next-line valid-jsdoc
	/**
	 * Create an HTML Menu Item from project json property
	 * @ignore
	 */
	private createItem(prop, itm) {
		if (!itm.type || itm.type == "hidden") return null;

		// eslint-disable-next-line @typescript-eslint/no-this-alias
		const self = this;

		const ce = (e) => document.createElement(e);

		// table structure
		const row = ce("tr");
		row.setAttribute("id", "wewwa_" + prop);

		// Text
		const column1 = ce("td");
		column1.classList.add("left");
		// Input
		const column2 = ce("td");
		column2.classList.add("right");
		// optional NumericUpDown Column
		let column3 = null;
		// div or label text element
		let txt = null;
		// main input element
		let inpt = null;

		// Process actual prop type
		switch (itm.type) {
			// only text across 3 columns
			case "text":
				txt = ce("div");
				txt.innerHTML = itm.realText ? itm.realText : itm.text;
				column1.setAttribute("colspan", 3);
				break;

			// combo select-box across 2 columns
			case "combo":
				inpt = ce("select");
				// set options
				for (const o of itm.options) {
					const opt = ce("option");
					opt.setAttribute("value", o.value);
					opt.innerText = o.realLabel ? o.realLabel : o.label;
					if (itm.value == o.value) opt.setAttribute("selected", true);
					inpt.appendChild(opt);
				}
				break;

			// system color picker across 2 columns
			case "color":
				inpt = ce("input");
				inpt.setAttribute("type", "color");
				break;

			// Checkbox across 2 columns
			case "bool":
				inpt = ce("input");
				inpt.setAttribute("type", "checkbox");
				inpt.setAttribute("readonly", true);
				break;

			// Slider input across 1 column; + 1 column Up/Down
			case "slider": {
				const canEdit = itm.editable;
				// create numeric-up-down
				const sliderVal = ce(canEdit ? "input" : "output");
				sliderVal.name = "wewwa_out_" + prop;
				sliderVal.setAttribute("id", sliderVal.name);
				sliderVal.setAttribute("type", "number");
				sliderVal.style.width = "75%";
				if (canEdit) {
					sliderVal.setAttribute("value", itm.value);
					sliderVal.addEventListener("change", function () {
						// eslint-disable-next-line no-invalid-this
						self.setProperty(prop, this);
					});
				} else {
					sliderVal.innerHTML = itm.value;
				}
				// create td3
				column3 = ce("td");
				column3.append(sliderVal);
				// create actual slider & values
				inpt = ce("input");
				inpt.setAttribute("type", "range");
				inpt.max = itm.max;
				inpt.min = itm.min;
				inpt.step = 0.1;
				break;
			}
			// Text input across 2 columns
			case "textinput":
				inpt = ce("input");
				inpt.setAttribute("type", "text");
				break;

			// File input across 2 columns
			case "file":
				inpt = ce("input");
				inpt.setAttribute("type", "file");
				break;

			default:
				Smallog.error("unkown setting type: " + itm.type, LogHead);
				break;
		}

		const eid = "wewwa_prop_" + prop;

		// make input label if not text
		if (!txt) {
			txt = ce("label");
			txt.setAttribute("for", eid);
			txt.innerHTML = itm.realText ? itm.realText : itm.text;
		}
		column1.append(txt);

		// listen for changes if input type (no text)
		if (inpt) {
			inpt.style.width = "100%";
			inpt.setAttribute("id", eid);
			inpt.addEventListener("change", function () {
				// eslint-disable-next-line no-invalid-this
				self.setProperty(prop, this);
			});
			column2.prepend(inpt);
		}

		// append td3 or stretch td2?
		row.append(column1, column2);
		if (column3) row.append(column3);
		else column2.setAttribute("colspan", 2);

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
		const props = this.project.general.properties;

		// check for legit setting...
		if (!props[prop]) {
			Smallog.error("SetProperty name not found: " + prop, LogHead);
			return;
		}

		// enabled delayed call of settings update
		const applyCall = (val) => {
			// save the updated value to storage
			props[prop].value = val;
			// update
			this.evaluateSettings();
			const obj = {};
			obj[prop] = props[prop];
			this.applyProp(obj);
		};

		// process value based on DOM element type
		switch (props[prop].type) {
			case "bool":
				applyCall(elm.checked == true);
				break;
			case "color":
				applyCall(this.hexToRgb(elm.value));
				break;
			case "file":
				this.loadXHRSaveLocal(elm.value, (res) => applyCall(res));
				break;
			case "slider":
				if (elm.name.includes("_out_")) {
					const inpt: any = document.querySelector("#wewwa_" + prop);
					if (inpt) inpt.value = elm.value;
					else Smallog.error("Slider not found: " + prop, LogHead);
				} else {
					const slide: any = document.querySelector("#wewwa_out_" + prop);
					if (slide) slide.value = elm.value;
					else Smallog.error("Numericupdown not found: " + prop, LogHead);
				}
			// eslint-disable-next-line no-fallthrough
			case "combo":
			case "textinput":
				applyCall(elm.value);
				break;
		}
	}

	/**
	 * will load the given file and return it as dataURL.
	 * this way we can easily store whole files in the configuration & localStorage.
	 * its not safe that this works with something else than image files.
	 * @param {string} url file
	 * @param {function (data: (string | ArrayBuffer)): void} resCall finished-call
	 * @ignore
	 * @returns {void}
	 */
	private loadXHRSaveLocal(url, resCall) {
		WascUtil.myFetch(url, "blob").then((resp) => {
			// Read out file contents as a Data URL
			const fReader = new FileReader();
			// onload needed since Google Chrome doesn't support addEventListener for FileReader
			fReader.onload = (evt) => resCall(evt.target.result);
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
		const pre = "wewwaProps";
		const wewwaProps = this.project.general.properties;

		localStorage.setItem("wewwaLastProps", JSON.stringify(wewwaProps));
		for (const p in wewwaProps) {
			if (!p) continue;
			const prop = wewwaProps[p];

			// some ev(a|i)l magic
			let visible = true;
			if (prop.condition != null) {
				// copy our condition string to modify
				let cprop = String(prop.condition).split(" ").join("");
				// remove whitespaces and split to partials by logic operators
				const partials = cprop.split(/&&|\|\|/);
				// loop all partial values of the check
				for (const part of partials) {
					let prefix = pre + ".";
					const onlyVal = part.match(/[!a-zA-Z0-9_.]*/)[0];
					if (
						!onlyVal.startsWith(prefix) &&
						!onlyVal.startsWith("!" + prefix)
					) {
						// fix for inverted values
						let replW = onlyVal;
						if (replW.startsWith("!")) {
							replW = replW.substr(1);
							prefix = "!" + prefix;
						}
						// Smallog.Debug("replace: " + onlyVal + " >> " + prefix + replW);
						cprop = cprop.replace(onlyVal, prefix + replW);
					}
				}
				try {
					visible =
						new Function(pre, "return (" + cprop + ")")(wewwaProps) === true;
				} catch (e) {
					Smallog.error(
						"Error: (" + cprop + ") for: " + p + " => " + e,
						LogHead
					);
				}
			}

			// get input dom element
			const htElm = document.getElementById("wewwa_" + p);
			if (!htElm || htElm.childNodes.length < 2) continue;

			if (visible) htElm.classList.remove("hide");
			else htElm.classList.add("hide");

			// set its value
			const elm: any = htElm.childNodes[1].childNodes[0];
			switch (prop.type) {
				case "color":
					elm.value = this.rgbToHex(prop.value);
					break;
				case "bool":
					elm.checked = prop.value == true;
					break;
				case "slider":
				case "combo":
				case "textinput":
					elm.value = prop.value;
					break;
			}
		}
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
		const wpl = window["wallpaperPropertyListener"];
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
		const wpl = window["wallpaperPropertyListener"];
		if (this.isPaused == val) return;
		if (val && !this.pauseOnUnfocus) return;
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
		// eslint-disable-next-line require-jsdoc
		function cth(c) {
			const h = Math.floor(c * 255).toString(16);
			return h.length == 1 ? "0" + h : h;
		}
		const spl = rgb.split(" ");
		return "#" + cth(spl[0]) + cth(spl[1]) + cth(spl[2]);
	}

	// eslint-disable-next-line require-jsdoc
	private hexToRgb(hex) {
		const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
		return result
			? [
					parseInt(result[1], 16) / 255,
					parseInt(result[2], 16) / 255,
					parseInt(result[3], 16) / 255,
			  ].join(" ")
			: null;
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
		if (!md["getUserMedia"]) return;
		md.getUserMedia({
			audio: true,
		})
			.then((stream) => {
				Smallog.debug("Got Microphone MediaStream!");
				// stop previous analyzer
				this.stopAudioInterval();
				this.makeAnalyzer(stream);
			})
			.catch((err) => {
				Smallog.error(err, LogHead);
				if (location.protocol != "https:") {
					const r = confirm(
						"Activating the Microphone failed! Your Browser might require the site to be loaded using HTTPS! Press 'ok'/'yes' to get redirected from HTTP => HTTPS."
					);
					if (r)
						window.location.href = window.location.href.replace(
							"http",
							"https"
						);
				}
			});
	}

	/**
	 * Initiate Desktop auddio streaming
	 * @returns {void}
	 */
	private async initDesktop() {
		const md = navigator.mediaDevices as any;
		if (!md["getDisplayMedia"]) return;
		md.getDisplayMedia({
			video: true,
			audio: true,
		})
			.then((stream) => {
				Smallog.debug("Got Desktop MediaStream!");
				// stop previous analyzer
				this.stopAudioInterval();
				this.makeAnalyzer(stream);
			})
			.catch((e) => {
				Smallog.error("Cant Open Desktop Audio Stream!", "[WEWA] ");
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
		if (!source) return;

		// create player
		this.audio = document.createElement("audio");
		this.audio.src =
			source instanceof String
				? (source as string)
				: URL.createObjectURL(source as any);
		this.audio.autoplay = true;
		this.audio.setAttribute("controls", "true");
		this.audio.play();
		// insert before marker
		const markr = document.getElementById("audioMarker");
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
		this.ctx = new (window.AudioContext || window["webkitAudioContext"])({
			sampleRate: 48000,
		});
		// microphone or desktop stream sauce
		if (source instanceof MediaStream) {
			this.source = this.ctx.createMediaStreamSource(source);
			// hack for firefox to keep stream running
			window["persistAudioStream"] = source;
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
		this.audioInterval = window.setInterval(() => {
			if (this.audioCallback == null) {
				this.stopAudioInterval();
				Smallog.error("no AudioCallback!", LogHead);
				return;
			}
			this.analyser.getByteFrequencyData(data);
			const stereo = this.convertAudio(data);
			this.audioCallback(stereo);
		}, 33);
		// tell Wallpaper we are sending audio
		this.applyProp({ audioprocessing: { value: true } });
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
	private convertAudio(data: Uint8Array) {
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
		window["persistAudioStream"] = null;
		document.getElementById("wewwaAudioInput").setAttribute("value", "");
		if (this.audio) {
			this.audio.remove();
		}
		if (this.audioInterval) {
			clearInterval(this.audioInterval);
			this.audioInterval = null;
		}
	}
}
