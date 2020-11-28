

const fs = require("fs");
const validate = require('schema-utils');

// eslint-disable-next-line global-require
const { RawSource } = require('webpack-sources');

const pluginName = 'OfflinePlugin';

// schema for options object
const schema = {
    type: 'object',
    properties: {
        outdir: {
            type: 'string'
        },
        outfile: {
            type: 'string'
        },
        extrafiles: {
            type: 'array'
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
                var sFiles = getAllFiles(this.options.outdir, "");
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
                const jList = JSON.stringify(filelist, null, 1);
                compilation.emitAsset(this.options.outfile, new RawSource(jList));

                console.info("[OfflinePlugin] successfull: " + jList);
            }
            ));
    }
}

module.exports = OfflinePlugin;