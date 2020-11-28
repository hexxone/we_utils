/**
 * @author D.Thiele @https://hexx.one
 * 
 * @license
 * Copyright (c) 2020 D.Thiele All rights reserved.  
 * Licensed under the GNU GENERAL PUBLIC LICENSE.
 * See LICENSE file in the project root for full license information.  
 * 
 * @see
 * REQUIREMENTS:
 * - JQUERY >= 3.3.1
 * - HTML5 supported Browser (for webAudio processing)
 * - this file needs to be in the same (root) folder as your "project.json"
 * - this file needs to be included/loaded in your "index.html"
 * 
 * @description
 * WEWWA
 * Wallpaper Engine Web Wallpaper Adapter
 * 
 * This is an aditional TS class to be included in your Typescript/Webpack Wallpaper Engine
 * Web-Wallpaper project - so you can test, run & configure it from a normal web browser.
 * 
 * FEATURES:
 * - automatically detecting if the web wallpaper is opened by wallpaper engine or browser
 * - if opened by wallpaper engine, nothing will happen
 * - if opened by a browser:
 *   - automatically load the "project.json"
 *   - parse the settings, languages & conditions
 *   - add respective html elements for each setting type & condition
 *   - put these elements into an option menu which can be hidden
 *   - check localStorage for already saved/customized values
 *   - apply all settings once
 * - react to changes made in the ui and update them in the wallpaper
 * - save changes made in the ui to localStorage
 * 
*/

import { Ready } from "./Ready";
import { Smallog } from "./Smallog";
import { OfflineHelper } from "./OfflineHelper";

export class WEWWA {

    private project: any = null;

    private htmlIcon: Element = null;
    private htmlMenu: Element = null;

    private audio: any = null;
    private ctx: any = null;
    private source: any = null;
    private analyser: any = null;

    private audioInterval: any = null;
    private audioCallback: any = null;


    constructor() {
        if (window['wallpaperRegisterAudioListener']) Smallog.Info("[WEWWA] detected wallpaper engine => Standby.");
        else {
            Smallog.Info("[WEWWA] wallpaper engine not detected => Init!");
            // define audio listener first, so we dont miss when it gets registered.
            window['wallpaperRegisterAudioListener'] = function (callback) {
                // set callback to be called later with analysed audio data
                this.audioCallback = callback;
            }
            // intialize when ready
            Ready.On(() => {
                // make the website available offline using service worker
                OfflineHelper.Register();
                // continue initializing
                this.Init();
            });
        }
    }

    Init = () => {
        this.LoadProjectJSON((proj) => {
            if (proj.type != "web") {
                Smallog.Error("Error! Loaded project.json is not a web Wallpaper. How did this happen? Aborting...");
                return;
            }
            this.project = proj;
            this.LoadStorage();
            this.AddStyle();
            this.AddMenu(localStorage.getItem("wewwaLang"));
            this.UpdateSettings();
            this.ApplyProp(proj.general.properties);
        });
    }

    LoadProjectJSON = (complete) => {
        $.ajax({
            url: "project.json",
            beforeSend: (xhr) => xhr.overrideMimeType("text/plain;"),
            success: (result) => complete(JSON.parse(result)),
            error: (xhr, status, error) => Smallog.Error(status + ": ajax error!\r\n" + error)
        });
    }

    LoadStorage = () => {
        var props = this.project.general.properties;
        var last = localStorage.getItem("wewwaLastProps");
        if (last != null) {
            var merged = Object.assign(props, JSON.parse(last));
            this.project.general.properties = merged;
            Smallog.Debug("Loaded & merged settings.")
        }
    }

    AddStyle = () => {
        var st = document.createElement("style");
        st.innerHTML = `
        .wewwaMenu, .wewwaIcon {
            transform: none;
            transition: transform 500ms ease;
            position:absolute;
            top:0px;
            padding:10px;
            margin:10px;
            z-index:9999;
        }
        .wewwaMenu {
            border: solid 2px #444;
            width:400px;
            right:-440px;
            color:white;
            background-color:#333333;
            overflow-x:hidden;
            overflow-y:scroll;
            max-height:95%;
            max-width: 90%;
            font-family: Helvetica, Verdana, Arial;
            font-size: larger;
        }
        .wewwaMenu.open {
            transform: translateX(-440px);
            transition: transform 500ms ease;
        }
        @media all and (max-width: 520px) {
            .wewwaMenu.open {
                max-height:85%;
                transform: translateX(-440px) translateY(55px);
                transition: transform 500ms ease;
            }
        }
        .wewwaMenu a {
            color: white;
            border: 2px solid #4CAF50;
            padding: 5px 20px;
            text-decoration: none;
            display: inline-block;
        }
        .wewwaMenu a:hover {
            background: #4CAF50;
        }
        .wewwaMenu audio {
            width: 100%;
        }
        .wewwaMenu table {
            width:100%;
            table-layout: fixed;
        }
        .wewwaMenu td {
            width: 50%;
            padding: 5px;
        }
        .wewwaMenu img {
            width: 200px;
            max-width: 90%;
            heigth: auto;
        }
        .wewwaMenu input[type='checkbox'][readonly]{
            pointer-events: none;
        }
        .wewwaMenu .droparea {
            border: 2px dashed #bbb;
            -webkit-border-radius: 5px;
            border-radius: 5px;
            padding: 20px;
            text-align: center;
            font: 18pt;
            color: #bbb;
        }
        .wewwaIcon {
            right:0px;
            cursor:pointer;
        }
        .wewwaIcon div {
            width:35px;
            height:5px;
            background-color:#888888;
            margin:6px 0;
        }
        @media all and (min-width: 520px) {
            .wewwaIcon.open {
                transform: translateX(-440px);
                transition: transform 500ms ease;
            }
        }
        `;
        document.head.append(st);
    }

    AddMenu = (lang) => {
        if (this.htmlMenu) {
            document.body.removeChild(this.htmlMenu);
            document.body.removeChild(this.htmlIcon);
            this.htmlMenu = null;
        }
        // quick wrapper, we need this a lot
        var ce = (e) => document.createElement(e);
        // local vars faster
        var proj = this.project;
        var props = proj.general.properties;

        // create root menu
        var menu = ce("div");
        menu.classList.add("wewwaMenu");
        // create preview img wrap
        var preview = ce("img");
        preview.setAttribute("src", proj.preview);
        // create menu app title
        var header = ce("div");
        header.innerHTML = "<h2>" + proj.title + "</h2>";
        // create workshop link
        var link = ce("a");
        link.setAttribute("href", "https://steamcommunity.com/sharedfiles/filedetails/?id=" + proj.workshopid);
        link.setAttribute("target", "_blank");
        link.innerHTML = "<h3>Open Workshop Page</h3>";

        // table is better for formatting
        var tmain = ce("table")
        tmain.innerHTML = "<col style=\"width:50%\"> <col style=\"width:30%\"> <col style=\"width:20%\">";
        var table = ce("tbody");
        tmain.append(table);

        // if app supports audio, add input menu & handlers
        if (proj.general.supportsaudioprocessing) {

            // audio input methods
            var row = ce("tr");
            var td1 = ce("td");
            td1.innerHTML = "<br><hr><h2>Audio Input</h2><hr>";
            td1.setAttribute("colspan", 3);
            var aBtn1 = ce("a");
            var aBtn2 = ce("a");
            var aBtn3 = ce("input");
            aBtn1.innerHTML = "Microphone";
            aBtn1.addEventListener("click", function (e) {
                this.requestMicrophone();
            });
            aBtn2.innerHTML = "Select URL";
            aBtn2.addEventListener("click", function (e) {
                var uri = prompt("Please enter some audio file URL\r\n\r\nYouTube, Soundcloud etc. ARE NOT YET SUPPORTED!", "https://example.com/test.mp3");
                this.initiateAudio(uri);
            });
            aBtn3.id = "wewwaAudioInput";
            aBtn3.innerHTML = "Select File";
            aBtn3.setAttribute("type", "file");
            aBtn3.addEventListener("change", function (e) {
                var file = e.target.files[0];
                if (!file) return;
                this.initiateAudio(file);
            });
            td1.append(aBtn1, aBtn2, aBtn3);
            row.append(td1);

            // file drag & drop area
            var dropRow = ce("tr");
            var dropt1 = ce("td");
            var dropt2 = ce("td");
            dropt1.setAttribute("colspan", 3);
            var dropArea = ce("div");
            dropArea.innerHTML = "Drag & Drop"
            dropArea.classList.add("droparea");
            dropArea.addEventListener('dragover', (evt) => {
                evt.stopPropagation();
                evt.preventDefault();
                evt.dataTransfer.dropEffect = 'copy';
            }, false);
            dropArea.addEventListener("drop", (e) => {
                e.stopPropagation();
                e.preventDefault();
                var droppedFiles = e.dataTransfer.files;
                this.initiateAudio(droppedFiles[0]);
            }, false);
            dropt1.append(dropArea);
            dropRow.append(dropt1, dropt2);

            // Player & Stop Btn
            var hrrow = ce("tr");
            var hrtd1 = ce("td");
            var hrtd2 = ce("td");
            var hrstop = ce("a");
            hrstop.innerHTML = "Stop All Audio";
            hrstop.addEventListener("click", function (e) {
                this.stopAudioInterval();
            });
            var hrhr = ce("hr")
            hrtd1.id = "audioMarker";
            hrtd1.setAttribute("colspan", 3);
            hrtd1.append(hrstop, hrhr);
            hrrow.append(hrtd1, hrtd2);

            // finally add rows to table
            table.append(row, dropRow, hrrow);
        }

        // create actual settings wrapper
        var settings = ce("tr");
        settings.innerHTML = "<td colspan=3><h2>Settings</h2></td>";
        table.append(settings);

        // process languages?
        var local = proj.general.localization;
        if (local) {
            // set default language
            if (!lang) lang = "en-us";
            // add html struct
            var row = ce("tr");
            var td1 = ce("td");
            td1.innerHTML = "<h4>🇩🇪🇬🇧🇮🇹🇷🇺🇨🇳</h4>";
            var td2 = ce("td");
            var lan = ce("select");
            // process all
            for (var loc in local) {
                // build select option for this
                var lcs = ce("option");
                lcs.value = loc;
                lcs.innerHTML = loc.toUpperCase();
                lan.append(lcs);
                // check for correct language code
                if (loc != lang) continue;
                else lcs.setAttribute("selected", true);
                // set properties translated text
                for (var p in props) {
                    var itm = props[p];
                    var pTxt = itm.text;
                    var rTxt = local[loc][pTxt];
                    if (rTxt) itm.realText = rTxt;
                    // process combo box values
                    if (itm.type == "combo") {
                        for (var o of itm.options) {
                            var lTxt = local[loc][o.label];
                            if (lTxt) o.realLabel = lTxt;
                        }
                    }
                }
            }
            // if changed, do it all over again.
            lan.addEventListener("change", function (e) {
                localStorage.setItem("wewwaLang", this.value);
                this.AddMenu(this.value);
                this.UpdateSettings();
                this.html.icon.click();
            });
            td2.setAttribute("colspan", 2);
            td2.append(lan);
            row.append(td1, td2);
            table.append(row);
        }

        // split content from actual settings
        var splitr = ce("tr");
        splitr.innerHTML = "<td colspan=3><hr></td>";
        table.append(splitr);

        // sort settings by order
        var sortable = [];
        for (var p in props) sortable.push([p, props[p]]);
        sortable.sort((a, b) => a[1].order - b[1].order);
        // add setting html elements
        for (var s of sortable)
            table.append(this.CreateItem(s[0], s[1]));

        // pre-footer for resetting saved settings
        var preFoot = ce("div");
        preFoot.innerHTML = "<br><hr>";
        var reset = ce("a");
        reset.innerHTML = "Reset Settings";
        reset.addEventListener("click", function (e) {
            localStorage.clear();
            location = location;
        });
        preFoot.append(reset);

        // footer with ident
        var footer = ce("div");
        footer.innerHTML = "<br><hr><h3 style='width:130px;text-align:left;display:block;margin:0 auto;'>[W] allpaper<br>[E] ngine<br>[W] eb<br>[W] allpaper<br>[A] dapter<a target=\"_blank\" href='https://hexx.one'>hexxone</a>";
        // finish up menu
        menu.append(preview, header, link, tmain, preFoot, footer)

        // create icon for opening & closing the menu
        var icon = ce("div");
        icon.classList.add("wewwaIcon");
        icon.addEventListener("click", () => {
            $(".wewwaMenu, .wewwaIcon").toggleClass("open");
        });
        var bar1 = ce("div");
        var bar2 = ce("div");
        var bar3 = ce("div");
        icon.append(bar1, bar2, bar3);

        // finally add the menu to the DOM
        document.body.append(menu, icon);
        this.htmlMenu = menu;
        this.htmlIcon = icon;
    }

    CreateItem = (prop, itm) => {
        var ce = (e) => document.createElement(e);
        var row = ce("tr");
        row.setAttribute("id", "wewwa_" + prop);
        var td1 = ce("td");
        var td2 = ce("td");
        var td3 = null;
        var txt = ce("div");
        txt.innerHTML = itm.realText ? itm.realText : itm.text;
        // create real input element
        var inp = ce("input");
        inp.setAttribute("id", "wewwa_inp_" + prop);
        switch (itm.type) {
            // only have text
            case "text":
                inp = null;
                td1.setAttribute("colspan", 3);
                break;
            // add combo select options
            case "combo":
                inp = ce("select");
                // set options
                for (var o of itm.options) {
                    var opt = ce("option");
                    opt.setAttribute("value", o.value);
                    opt.innerText = o.realLabel ? o.realLabel : o.label;
                    if (itm.value == o.value) opt.setAttribute("selected", true);
                    inp.appendChild(opt);
                }
                break;
            // browser color picker
            case "color":
                inp.setAttribute("type", "color");
                break;
            // Checkbox
            case "bool":
                inp.setAttribute("type", "checkbox");
                inp.setAttribute("readonly", true);
                // makes ticking checkboxes easier
                row.addEventListener("click", (e) => {
                    inp.click();
                });
                break;
            // Slider input
            case "slider":
                var canEdit = itm.editable;
                // create numeric-up-down
                var sliderVal = ce(canEdit ? "input" : "output");
                sliderVal.name = "wewwa_out_" + prop;
                sliderVal.setAttribute("id", sliderVal.name);
                sliderVal.setAttribute("type", "number");
                sliderVal.style.width = "75%";
                if (canEdit) {
                    sliderVal.setAttribute("value", itm.value);
                    sliderVal.addEventListener("change", function (e) { this.SetProperty(prop, this); });
                }
                else {
                    sliderVal.innerHTML = itm.value;
                }
                // create td3
                td3 = ce("td");
                td3.append(sliderVal);
                // create actual slider & values
                inp.setAttribute("type", "range");
                inp.style.width = "100%";
                inp.max = itm.max;
                inp.min = itm.min;
                inp.step = 0.1;
                break;
            case "textinput":
                inp.setAttribute("type", "text");
                break;
            case "file":
                inp.setAttribute("type", "file");
                break;
            default:
                Smallog.Error("unkown setting type: " + itm.type);
                break;
        }
        td1.append(txt);
        // listen for changes if input type (no text)
        if (inp) {
            inp.addEventListener("change", function (e) { this.SetProperty(prop, this); });
            td2.prepend(inp);
        }
        // append td3 or stretch td2?
        if (td3) {
            row.append(td1, td2, td3)
        }
        else {
            td2.setAttribute("colspan", 2);
            row.append(td1, td2);
        }
        return row;
    }


    SetProperty = (prop, elm) => {
        // get the type and apply the value
        var props = this.project.general.properties;
        // check for legit setting...
        if (!props[prop]) {
            Smallog.Error("SetProperty name not found!");
            return;
        }
        // enabled delayed call of settings update
        var applyCall = (val) => {
            // save the updated value to storage
            props[prop].value = val;

            //Smallog.Debug("Property set: " + prop + " v: " + val);

            // update
            this.UpdateSettings();
            var obj = {};
            obj[prop] = props[prop];
            this.ApplyProp(obj);
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
                this.XHRLoadAndSaveLocal(elm.value, res => applyCall(res));
                break;
            case "slider":
                if (elm.name.includes("_out_")) {
                    var inpt: any = document.querySelector("#wewwa_" + prop);
                    if (inpt) inpt.value = elm.value;
                    else Smallog.Error("Slider not found: " + prop);
                }
                else {
                    var slide: any = document.querySelector("#wewwa_out_" + prop);
                    if (slide) slide.value = elm.value;
                    else Smallog.Error("Numericupdown not found: " + prop);
                }
            case "combo":
            case "textinput":
                applyCall(elm.value);
                break;
        }
    }


    // will load the given file and return it as dataURL.
    // this way we can easily store whole files in the configuration/localStorage.
    // its not safe that this works with something else than image files.
    XHRLoadAndSaveLocal = (url, resCall) => {
        // Create XHR and FileReader objects
        var xhr = new XMLHttpRequest();
        var fileReader = new FileReader();
        xhr.open("GET", url, true);
        xhr.responseType = "blob";
        xhr.addEventListener("load", function () {
            if (xhr.status == 200) {
                // onload needed since Google Chrome doesn't support addEventListener for FileReader
                fileReader.onload = function (evt) {
                    // Read out file contents as a Data URL
                    resCall(evt.target.result)
                };
                // Load blob as Data URL
                fileReader.readAsDataURL(xhr.response);
            }
        }, false);
        // Send XHR
        xhr.send();
    }


    UpdateSettings = () => {
        var wewwaProps = this.project.general.properties;
        localStorage.setItem("wewwaLastProps", JSON.stringify(wewwaProps));
        for (var p in wewwaProps) {
            var prop = wewwaProps[p];

            // some eval magic
            var visible = true;
            if (prop.condition != null) {
                // copy our condition string to modify
                var cprop = String(prop.condition).split(" ").join("");
                // remove whitespaces and split to partials by logic operators
                var partials = cprop.split(/&&|\|\|/);
                // loop all partial values of the check
                for (var part of partials) {
                    var prefix = "wewwaProps.";
                    var onlyVal = part.match(/[!a-zA-Z0-9_\.]*/)[0];
                    if (!onlyVal.startsWith(prefix) && !onlyVal.startsWith("!" + prefix)) {
                        // fix for inverted values
                        var replW = onlyVal;
                        if (replW.startsWith("!")) {
                            replW = replW.substr(1);
                            prefix = "!" + prefix;
                        }
                        //Smallog.Debug("replace: " + onlyVal + " >> " + prefix + replW);
                        cprop = cprop.replace(onlyVal, prefix + replW);
                    }

                }
                try {
                    visible = eval(cprop) == true;
                }
                catch (e) {
                    Smallog.Error("Error: (" + cprop + ") for: " + p + " => " + e);
                }
            }


            if (visible) $("#wewwa_" + p).fadeIn();
            else $("#wewwa_" + p).fadeOut();

            // get input dom element
            var elm: any = document.getElementById("wewwa_" + p).childNodes[1].childNodes[0];
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


    ApplyProp = (prop) => {
        var wpl = window['wallpaperPropertyListener'];
        if (wpl && wpl.applyUserProperties) {
            wpl.applyUserProperties(prop);
        }
    }

    rgbToHex = (rgb) => {
        function cth(c) {
            var h = Math.floor(c * 255).toString(16);
            return h.length == 1 ? "0" + h : h;
        }
        var spl = rgb.split(" ");
        return "#" + cth(spl[0]) + cth(spl[1]) + cth(spl[2]);
    }

    hexToRgb = (hex) => {
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [parseInt(result[1], 16) / 255, parseInt(result[2], 16) / 255, parseInt(result[3], 16) / 255].join(" ") : null;
    }

    requestMicrophone = () => {
        navigator.mediaDevices.getUserMedia({
            audio: true
        }).then(function (stream) {
            this.stopAudioInterval();
            // hack for firefox to keep stream running
            window['persistAudioStream'] = stream;
            this.ctx = new (window.AudioContext || window['webkitAudioContext'])();
            this.source = this.ctx.createMediaStreamSource(stream);
            this.analyser = this.ctx.createAnalyser();
            this.analyser.smoothingTimeConstant = 0.35;
            this.analyser.fftSize = 256;

            this.source.connect(this.analyser);
            this.startAudioInterval();
        }).catch(function (err) {
            Smallog.Error(err);
            if (location.protocol != "https:") {
                var r = confirm("Activating the Microphone failed! Your Browser might require the site to be loaded using HTTPS for this feature to work! Press 'ok'/'yes' to get redirected to HTTPS and try again.");
                if (r) window.location.href = window.location.href.replace("http", "https");
            }
        });
    }

    // html5 audio analyser gives us mono data from 0(bass) to 128(treble)
    // however, wallpaper engine expects stereo data in following format:
    // 0(L: low) to 63(L: treble) and 64(R: low) to 128(R: treble)
    // so we do some array transformation... and divide by 255 (8bit-uint becomes float)
    convertAudio = (data) => {
        var stereo = [];
        var sIdx = 0;
        for (var i = 0; i < 64; i++) {
            stereo[i] = data[sIdx++] / 255;
            stereo[127 - i] = data[sIdx++] / 255;
        }
        return stereo;
    }


    initiateAudio = (data) => {
        // clear up
        this.stopAudioInterval();
        // create player
        this.audio = document.createElement("audio");
        this.audio.src = data.name ? URL.createObjectURL(data) : data;
        this.audio.autoplay = true;
        this.audio.setAttribute("controls", "true");
        this.audio.play = true;

        $("#audioMarker").prepend(this.audio);

        this.ctx = new (window.AudioContext || window['webkitAudioContext'])();
        this.source = this.ctx.createMediaElementSource(this.audio);
        this.analyser = this.ctx.createAnalyser();
        this.analyser.smoothingTimeConstant = 0.35;
        this.analyser.fftSize = 256;

        this.source.connect(this.ctx.destination);
        this.source.connect(this.analyser);
        this.startAudioInterval();
    }


    startAudioInterval = () => {
        var data = new Uint8Array(128);
        // 33ms ~~ 30fps
        this.audioInterval = setInterval(() => {
            if (this.audioCallback != null) {
                this.stopAudioInterval();
                alert("no AudioCallback!");
                return;
            }
            this.analyser.getByteFrequencyData(data);
            var stereo = this.convertAudio(data);
            this.audioCallback(stereo);
        }, 33);
        // tell Wallpaper we are sending audio
        this.ApplyProp({ audioprocessing: { value: true } })
    }

    stopAudioInterval = () => {
        window['persistAudioStream'] = null;
        $("#wewwaAudioInput").val("");
        if (this.audio)
            this.audio.remove();
        if (this.audioInterval) {
            clearInterval(this.audioInterval);
            this.audioInterval = null;
        }
    }
}
