/**
 * @author D.Thiele @https://hexx.one
 * 
 * @license
 * Copyright (c) 2020 D.Thiele All rights reserved.  
 * Licensed under the GNU GENERAL PUBLIC LICENSE.
 * See LICENSE file in the project root for full license information.  
 * 
 * @description
 * Displays a seizure warning image centered on html for a given Time.
 * 
 * @todo
 * - add trigger warn languages to project json
 * - add trigger warn as html
 */

import { CComponent } from "./CComponent";
import { CSettings } from "./CSettings";
import { Ready } from "./Ready";

const ELM_ID = "triggerwarn";

// TODO test getting text
class WarnSettings extends CSettings {
    seizure_text: string = "/* <!-- ## ERROR ## --> */";
    animate_seconds: number = 1;
    wait_seconds: number = 10;
}

export class WarnHelper extends CComponent {

    public settings: WarnSettings = new WarnSettings();

    private element: HTMLDivElement;

    constructor() {
        super();

        Ready().then(() => {
            this.injectCSS();
            this.injectHTML();
        });
    }

    private injectCSS() {
        var st = document.createElement("style");
        st.innerHTML = `
        #${ELM_ID} {
            object-fit: contain;
            text-align: center;
            max-height: 30vmax;
            top: 25vmin;
            opacity: 0;
            transition: opacity ${this.settings.animate_seconds}s ease;
        }
        #${ELM_ID}.show {
            opacity: 1;
        }
        `;
        document.head.append(st);
    }

    private injectHTML() {
        this.element = document.createElement("div");
        this.element.id = ELM_ID;
        document.body.append(this.element);
    }

    public Show() {
        return new Promise(resolve => {
            // make text
            const txtt = this.settings.seizure_text.replace("\r\n", "<br />");
            this.element.innerHTML = txtt;
            // show it
            this.element.classList.add("show");
            // wait some time
            setTimeout(() => {
                // hide it & wait again
                this.element.classList.remove("show");
                setTimeout(resolve, this.settings.animate_seconds * 1000);
            }, this.settings.wait_seconds * 1000);
        });
    }
};