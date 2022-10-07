/**
 * @author hexxone / https://hexx.one
 *
 * @license
 * Copyright (c) 2022 hexxone All rights reserved.
 * Licensed under the GNU GENERAL PUBLIC LICENSE.
 * See LICENSE file in the project root for full license information.
 *
 * @description
 * Displays a html load bar with given progress.
 *
 */

import { waitReady } from "./Util";

const mainColor = "#69dc00aa";

/**
 * Visual Reload-Bar
 */
export class LoadHelper {
	private _outer: HTMLDivElement;
	private _bar: HTMLDivElement;
	private _tex: HTMLDivElement;

	public progress = 0;

	/**
	 * Create and prepare when document is ready
	 */
	constructor() {
		waitReady().then(() => {
			this.injectCSS();
			this.injectHTML();
			this.setText();
			this.setProgress(1);
		});
	}

	/**
	 * Make custom style
	 * @ignore
	 * @returns {void}
	 */
	private injectCSS() {
		const st = document.createElement("style");
		st.innerHTML = `
		#ldhlpr-bar {
			position: absolute;
			opacity: 0;
			top: 0px;
			height: 10px;
			width: 0%;
			background-color: ${mainColor};
			transition: all 0.1s;
		}
		#ldhlpr-bar.show {
			opacity: 1;
		}
		#ldhlpr-text {
			position: absolute;
			top: -30em;
			width: 100%;
			text-align: center;
			text-shadow: 0 0 20px rgba(42, 255, 69, .5), 0 0 15px rgba(42, 255, 69, .5);
			font-weight: 100;
			font-size: 3em;
			color: ${mainColor};
			transition: all 0.1s ease;
		}
		#ldhlpr-text.show {
			top: 10px;
		}
		`;
		document.head.append(st);
	}

	/**
	 * Make custom html elements
	 * @ignore
	 * @returns {void}
	 */
	private injectHTML() {
		this._outer = document.createElement("div");
		this._outer.id = "loadhelper";
		this._bar = document.createElement("div");
		this._bar.id = "ldhlpr-bar";
		this._tex = document.createElement("h1");
		this._tex.id = "ldhlpr-text";
		this._outer.append(this._bar, this._tex);
		document.body.append(this._outer);
	}

	public setText(text = "") {
		let txt = "--- Loading ---";
		if (text != "") txt += `<br>${text}`;
		this._tex.innerHTML = txt;
	}

	public setProgress(progress: number) {
		this.progress = Math.max(0, Math.min(100, progress));
		this._bar.style.width = `${this.progress}%`;
	}

	/**
	 * always reset bar to 0
	 * @public
	 * @param {boolean} visible show / hide
	 * @returns {void}
	 */
	public show(visible: boolean) {
		const e1 = this._bar;
		const e2 = this._tex;
		e1.classList.remove("show");
		e2.classList.remove("show");
		if (visible) {
			setTimeout(() => {
				e1.classList.add("show");
				e2.classList.add("show");
			}, 10);
		}
	}
}
