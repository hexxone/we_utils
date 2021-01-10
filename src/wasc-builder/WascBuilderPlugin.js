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
 * This is a webpack plugin 
 * 
 */

const fs = require("fs");
const path = require('path');

const asc = require("assemblyscript/bin/asc");
const validate = require('schema-utils');
const { RawSource } = require('webpack-sources');

const pluginName = 'WasmPlugin';
const outPath = path.resolve(__dirname, 'build');

// schema for options object
const schema = {
    type: 'object',
    properties: {
        production: {
            type: 'boolean'
        },
        relpath: {
            type: 'string'
        },
        regexx: {
            type: 'object'
        },
        cleanup: {
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
        var fle = subDir + "/" + file;
        if (fs.statSync(sub + "/" + file).isDirectory())
            arrayOfFiles = getAllFiles(baseDir, fle, arrayOfFiles);
        else
            arrayOfFiles.push(fle);
    });
    return arrayOfFiles;
}

// compile assemblyscript (typescript) module to wasm and return binary
function compileWasm(inputPath, newName, production) {
    return new Promise(resolve => {
        try {
            const newOut = path.resolve(outPath, newName);

            asc.main([
                inputPath,
                "--extension", "asc",
                "--binaryFile", newOut,
                "--measure",
                "--runtime", "full",
                production ? "--optimize" : "--sourceMap"
            ], (err) => {
                //let output = execSync('npm run asbuild', { cwd: __dirname });
                if (err) throw err;
                // none? -> read and resolve optimized.wasm string
                resolve(production ? {
                    normal: fs.readFileSync(newOut)
                } : {
                        normal: fs.readFileSync(newOut),
                        map: fs.readFileSync(newOut + ".map")
                    });
            });
        }
        catch (ex) {
            console.warn("[" + pluginName + "] Compile Error!");
            console.error(ex);
        }
    });
}

// delete all files in the output dir
function CleanUp() {
    console.info("[" + pluginName + "] Cleaning...");
    return new Promise(resolve => {
        fs.readdir(outPath, (err, files) => {
            if (err) throw err;
            Promise.all(files.map(file => {
                return new Promise(res => {
                    fs.unlink(path.join(outPath, file), err => {
                        if (err) throw err;
                        console.info("[" + pluginName + "] delete: "+ file);
                        res();
                    });
                })
            })).then(resolve);
        });
    });
}

// actual webpack plugin
class WascBuilderPlugin {

    options = {};

    constructor(options = {}) {
        validate.validate(schema, options);
        this.options = options;
    }

    // Define `apply` as its prototype method which is supplied with compiler as its argument
    apply(compiler) {
        var addedOnce = false;
        // Specify the event hook to attach to
        compiler.hooks.thisCompilation.tap(pluginName,
            (compilation) => compilation.hooks.processAssets.tap({
                name: pluginName,
                stage: -2000,
            }, async () => {
                if (addedOnce) return;
                addedOnce = true;
                console.log("[" + pluginName + "] Gathering Infos....");

                // add static files from folder
                const rPath = path.resolve(__dirname, this.options.relpath);
                var sFiles = getAllFiles(rPath, "");

                for (var staticFile in sFiles) {

                    const sFile = sFiles[staticFile];
                    const sName = sFile.replace(/^.*[\\\/]/, '');

                    // if regex match wasm name, compile
                    if (sName.match(this.options.regexx)) {
                        console.info(`[${pluginName}] Compile ${this.options.production ? "prod" : "debug"} wasm: ${sName}`);
                        // keep ".wasm" and remove ".ts" part of name
                        const newName = sName.replace(/\.[^/.]+$/, "");

                        await compileWasm(rPath + sFile, newName, this.options.production).then(({ normal, map }) => {
                            console.info("[" + pluginName + "] Success: " + newName);
                            // emit files into compilation
                            if (normal) compilation.emitAsset(newName, new RawSource(normal));
                            if (map) compilation.emitAsset(newName + ".map", new RawSource(map));
                        });
                    }
                }

                // finalize
                if(this.options.cleanup) await CleanUp();

                console.info("[" + pluginName + "] finished.");
            })
        );
    }
}

module.exports = WascBuilderPlugin;