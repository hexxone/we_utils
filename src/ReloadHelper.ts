/**
 * @author D.Thiele @https://hexx.one
 * 
 * @license
 * Copyright (c) 2020 D.Thiele All rights reserved.  
 * Licensed under the GNU GENERAL PUBLIC LICENSE.
 * See LICENSE file in the project root for full license information.  
 * 
 * @description
 * Displays a html reload bar for a given Time.
 * 
 */

import { CComponent } from "./CComponent";
import { CSettings } from "./CSettings";
import { Ready } from "./Util";

class ReloadSettings extends CSettings {
    reload_seconds: number = 3;
}

export class ReloadHelper extends CComponent {

    public settings: ReloadSettings = new ReloadSettings();

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
        #reload-bar {
            position: absolute;
            opacity: 0;
            top: 0px;
            height: 10px;
            width: 0%;
            background-color: #989a;
        }
        #reload-bar.show {
            opacity: 1;
            width: 100%;
            background-color: #e11a;
            transition: all ${this.settings.reload_seconds}s ease, opacity 0.33s ease;
        }
        #reload-bar.done {
            transition: opacity 0.33s ease;
        }
        #reload-text {
            position: absolute;
            top: -6em;
            width: 100%;
            text-align: center;
            font-weight: 100;
            font-size: 3em;
            color: #fffa;
        }
        #reload-text.show {
            top: 10px;
            color: #e11a;
            text-shadow: 0 0 20px rgba(255, 50, 50, .5), 0 0 15px rgba(255, 50, 50, .5);
            transition: all .33s ease, color ${this.settings.reload_seconds}s ease, text-shadow ${this.settings.reload_seconds}s ease;
        }
        #reload-text.done {
            transition: position 0.33s linear;
        }
        #reload-text {
            text-shadow: 0 0 20px rgba(255, 255, 255, .5), 0 0 15px rgba(255, 255, 255, .5);
        }
        `;
        document.head.append(st);
    }

    private injectHTML() {
        var outer = document.createElement("div");
        outer.id = "reloadhelper";
        var bar = document.createElement("div");
        bar.id = "reload-bar";
        var tex = document.createElement("h1");
        tex.id = "reload-text";
        tex.innerHTML = "Reload";
        outer.append(bar, tex);
        document.body.append(outer);
    }

    // @Todo test: bar always reset to 0 on show ??
    public Show(visible: boolean) {
        const e1 = document.getElementById("reload-bar");
        const e2 = document.getElementById("reload-text");
        if(visible) {
            e1.classList.add("show");   
            e2.classList.add("show");
        }
        else {
            e1.classList.remove("show");
            e2.classList.remove("show");
        }
    }

    // dont print IMPL error
    public UpdateSettings(): Promise<void> { return; }
};