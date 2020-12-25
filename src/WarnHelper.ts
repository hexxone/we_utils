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
 * - Remove embedded image
 */

import { Ready } from "./Ready";

export class WarnHelper {

    animationSeconds = 1;
    waitSeconds = 10;

    constructor() {
        Ready.On(() => {
            this.injectCSS();
            this.injectHTML();
        });
    }

    private injectCSS() {
        var st = document.createElement("style");
        st.innerHTML = `
        #triggerwarn {
            object-fit: contain;
            max-height: 30vmax;
            top: 25vmin;
            opacity: 0;
            transition: opacity ` + this.animationSeconds + `s ease;
        }
        #triggerwarn.show {
            opacity: 1;
        }
        `;
        document.head.append(st);
    }

    private injectHTML() {
        var outer = document.createElement("div");
        outer.id = "triggerwarn";
        outer.innerHTML = `
        
        `;
        document.body.append(outer);
    }

    public Show(callback) {
        // show it
        $("#triggerwarn").addClass("show");
        // wait some time
        setTimeout(() => {
            // hide it & wait again
            $("#triggerwarn").removeClass("show");
            setTimeout(callback, this.animationSeconds * 1000);
        }, this.waitSeconds * 1000);
    }
};