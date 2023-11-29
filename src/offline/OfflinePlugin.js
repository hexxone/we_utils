/**
 * @author hexxone / https://hexx.one
 *
 * @license
 * Copyright (c) 2023 hexxone All rights reserved.
 * Licensed under the GNU GENERAL PUBLIC LICENSE.
 * See LICENSE file in the project root for full license information.
 * @ignore
 */

const fs = require("fs");
const validate = require("schema-utils");
const { Compilation } = require("webpack");
const { RawSource } = require("webpack-sources");

const pluginName = "OfflinePlugin";

/**
 * schema for options object
 * @see {OfflinePlugin}
 */
const offlineSchema = {
	type: "object",
	properties: {
		staticdir: {
			type: "string",
		},
		outfile: {
			type: "string",
		},
		extrafiles: {
			type: "array",
		},
		pretty: {
			type: "boolean",
		},
	},
};

/**
 * list files recursively
 * @param {strring} baseDir start directory
 * @param {string} subDir sub directory
 * @param {array} arrayOfFiles result files
 * @return {array} arrayOfFiles
 */
function getAllFiles(baseDir, subDir, arrayOfFiles) {
	const sub = baseDir + "/" + subDir;
	const files = fs.readdirSync(sub);
	arrayOfFiles = arrayOfFiles || [];
	files.forEach((file) => {
		const fle = sub + "/" + file;
		if (fs.statSync(fle).isDirectory()) {
			arrayOfFiles = getAllFiles(baseDir, subDir + "/" + file, arrayOfFiles);
		} else {
			arrayOfFiles.push(subDir + "/" + file);
		}
	});
	return arrayOfFiles;
}

/**
 * This is a webpack plugin for easily making your webapp available Offline.
 * <br/>
 * It will simply output a json list of files to cache for the Service Worker on build.
 * <br/>
 * In your source, you just 'require' and 'Register()' the OfflineHelper.
 * <br/>
 * The OfflineHelper will then require the OfflineWorker in background.
 * <br/>
 * <br/>
 *
 * The OfflineWorker will then:
 * <br/>
 * 1. launch itself
 * <br/>
 * 2. load the 'offlinefiles.json' list
 * <br/>
 * 3. cache all files in it
 * <br/>
 * 4. return cached files if network fetching fails
 * <br/>
 * <br/>
 * You can also ignore this plugin and create the 'offlinefiles.json' yourself.
 */
class OfflinePlugin {
	options = {};

	/**
	 * Intializes the plugin in the webpack build process
	 * @param {offliineSchema} options
	 */
	constructor(options = {}) {
		validate.validate(offlineSchema, options);
		this.options = options;
	}

	/**
	 * Hook into the compilation process,
	 * find all target files and put them into a json file
	 * @param {Webpack.compiler} compiler object from webpack
	 */
	apply(compiler) {
		let addedOnce = false;
		// Specify the event hook to attach to
		compiler.hooks.thisCompilation.tap(pluginName, (compilation) =>
			compilation.hooks.processAssets.tap(
				{
					name: pluginName,
					stage: Compilation.PROCESS_ASSETS_STAGE_ANALYSE,
				},
				() => {
					if (addedOnce) return;
					addedOnce = true;

					console.info("[" + pluginName + "] Gathering Infos...");

					// list of all app-contents
					const filelist = [];

					// add static files from folder
					const sFiles = getAllFiles(this.options.staticdir, "");
					for (const staticFile in sFiles) {
						if (!staticFile) continue;
						filelist.push(sFiles[staticFile]);
					}

					// Loop through all compiled assets,
					// adding a new line item for each filename.
					for (const filename in compilation.assets) {
						if (!filename) continue;
						filelist.push("/" + filename);
					}

					// add additional files anyway?
					if (this.options.extrafiles) {
						this.options.extrafiles.map((ef) => filelist.push(ef));
					}

					// create the target file with all app-contents as json list
					const jList = JSON.stringify(
						filelist,
						null,
						this.options.pretty ? 1 : 0
					);
					compilation.emitAsset(this.options.outfile, new RawSource(jList));
					console.info("[" + pluginName + "] result: " + jList);

					console.info("[" + pluginName + "] finished.");
				}
			)
		);
	}
}

module.exports = OfflinePlugin;
