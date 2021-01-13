/**
 * 
 * @author D.Thiele @https://hexx.one
 *
 * @license
 * Copyright (c) 2020 D.Thiele All rights reserved.  
 * Licensed under the GNU GENERAL PUBLIC LICENSE.
 * See LICENSE file in the project root for full license information.
 * 
 * @description
 * This is a webpack plugin for easily making your webapp available Offline.
 * It will simply output a json list of files to cache for the Service Worker on build.
 * 
 * In your source, you just 'require' and 'Register()' the OfflineHelper.
 * The OfflineHelper will then require the OfflineWorker in background.
 * 
 * The OfflineWorker will then: 
 * 1. launch itself
 * 2. load the 'offlinefiles.json' list 
 * 3. cache all files in it
 * 4. return cached files if network fetching fails
 * 
 * @see
 * You can also ignore this plugin and create the 'offlinefiles.json' yourself.
 */


const fs = require("fs");
const validate = require('schema-utils');
const { RawSource } = require('webpack-sources');

const pluginName = 'OfflinePlugin';

// schema for options object
const schema = {
    type: 'object',
    properties: {
        staticdir: {
            type: 'string'
        },
        outfile: {
            type: 'string'
        },
        extrafiles: {
            type: 'array'
        },
        pretty: {
            type: 'boolean'
        }
    }
};

// list files recursively
function getAllFiles(baseDir, subDir, arrayOfFiles) {
    var sub = baseDir + "/" + subDir;
    var files = fs.readdirSync(sub);
    var arrayOfFiles = arrayOfFiles || [];
    files.forEach((file) => {
        var fle = sub + "/" + file;
        if (fs.statSync(fle).isDirectory())
            arrayOfFiles = getAllFiles(baseDir, subDir + "/" + file, arrayOfFiles);
        else
            arrayOfFiles.push(subDir + "/" + file);
    });
    return arrayOfFiles;
}

// actual webpack plugin
class OfflinePlugin {

    options = {};

    constructor(options = {}) {
        validate.validate(schema, options);
        this.options = options;
    }

    // Define `apply` as its prototype method which is supplied with compiler as its argument
    apply(compiler) {
        var addedOnce = false;
        // Specify the event hook to attach to
        compiler.hooks.thisCompilation.tap(pluginName, (compilation) =>
            compilation.hooks.processAssets.tap({
                name: pluginName,
                stage: -2000,
            }, () => {
                if (addedOnce) return;
                addedOnce = true;

                console.log('This is an experimental plugin!');

                // list of all app-contents
                var filelist = [];

                // add static files from folder
                var sFiles = getAllFiles(this.options.staticdir, "");
                for (var staticFile in sFiles) {
                    filelist.push(sFiles[staticFile]);
                }

                // Loop through all compiled assets,
                // adding a new line item for each filename.
                for (var filename in compilation.assets) {
                    filelist.push('/' + filename);
                }

                // add additional files anyway?
                if (this.options.extrafiles)
                    this.options.extrafiles.map(ef => filelist.push(ef));

                // create the target file with all app-contents as json list
                const jList = JSON.stringify(filelist, null, this.options.pretty ? 1 : 0);
                compilation.emitAsset(this.options.outfile, new RawSource(jList));

                console.info("[OfflinePlugin] successfull: " + jList);
            }
            ));
    }
}

module.exports = OfflinePlugin;