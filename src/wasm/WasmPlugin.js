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

const validate = require('schema-utils');
const { RawSource } = require('webpack-sources');
const { execSync } = require('child_process');

const pluginName = 'WasmPlugin';
const sourcePath = path.resolve(__dirname, 'assembly/index.ts');
const targetPath = path.resolve(__dirname, 'build/optimized.wasm');

// schema for options object
const schema = {
    type: 'object',
    properties: {
        relpath: {
            type: 'string'
        },
        regexx: {
            type: 'object'
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


// compile assemblyscript (typescript) module to wasm  and return binary
function compileWasm(inputPath) {
    return new Promise((resolve) => {
        // copy <module>.wasm.ts -> index.ts
        // File destination.txt will be created or overwritten by default.
        fs.copyFile(inputPath, sourcePath, (err) => {
            // check for and catch errors
            try {
                if (err) throw err;
                let output = execSync('npm run asbuild', { cwd: __dirname });
                console.log("Compile result: " + output);
                // none? -> read and resolve optimized.wasm string
                var binary = fs.readFileSync(targetPath);
                resolve(binary);
            }
            catch(ex) {
                console.warn(pluginName + " Compile Error!");
                console.error(ex);
            }
        });
    });

}

// actual webpack plugin
class WasmPlugin {

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

                console.log('This is an experimental plugin!');

                // add static files from folder
                const rPath = path.resolve(__dirname, this.options.relpath);
                var sFiles = getAllFiles(rPath, "");
                for (var staticFile in sFiles) {
                    const sFile = sFiles[staticFile];
                    const sName = sFile.replace(/^.*[\\\/]/, '');
                    // @TODO if regex match wasm name, compile
                    if (sName.match(this.options.regexx)) {
                        console.info("Compile wasm: " + sName);
                        const cWasm = await compileWasm(rPath + sFile);
                        // @todo keep ".wasm" and remove ".ts" part of name
                        const newName = sName.replace(/\.[^/.]+$/, "");
                        console.info("Success! File: " + newName);
                        compilation.emitAsset(newName, new RawSource(cWasm));
                    }
                }

                console.info("[" + pluginName + "] successfull!");
            })
        );
    }
}

module.exports = WasmPlugin;