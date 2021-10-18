/**
* @author hexxone / https://hexx.one
*
* @license
* Copyright (c) 2021 hexxone All rights reserved.
* Licensed under the GNU GENERAL PUBLIC LICENSE.
* See LICENSE file in the project root for full license information.
* @ignore
*/

const {RawSource} = require('webpack-sources');

const validate = require('schema-utils');
const pluginName = 'RenamerPlugin';

/**
* schema for options object
* @see {RenamerPlugin}
*/
const offlineSchema = {
	type: 'object',
	properties: {
		regex: {
			type: 'object',
		},
	},
};

/**
* Bruh
*/
class RenamerPlugin {
	options = {};

	// mapped name list: {key,value}
	nameMap = [];
	// saved character count
	savedChars = 0;

	/**
	* Intializes the plugin in the webpack build process
	* @param {offliineSchema} options
	*/
	constructor(options = {}) {
		validate.validate(offlineSchema, options);
		this.options = options;
	}

	/**
	* Get a random variable name, which does not exist in src and mappings
	* @param {string} src
	* @return {string}
	*/
	getRandomName(src) {
		const gen = '$x' + Math.random().toString(20).substr(2, 2 + Math.random() * 4);
		let exist = (src || '').indexOf(gen) >= 0;
		this.nameMap.forEach((mping) => {
			if (mping.key === gen) exist = true;
		});
		return exist ? this.getRandomName() : gen;
	}

	/**
	* Regex replace "match" function
	* @param {string} source
	* @param {string} match
	* @return {string}
	*/
	replaceMatch(source, match) {
		let fnd = null;
		// check if this exact name is already mapped
		this.nameMap.forEach((mping) => {
			if (mping.key === match) fnd = mping.val;
		});
		if (fnd) return fnd;
		// get & add a new random variable name
		fnd = this.getRandomName(source);
		this.nameMap.push({key: match, val: fnd});
		return fnd;
	}

	/**
	* replace all regex matches with random variable names
	* @param {string} source
	* @return {string}
	*/
	processString(source) {
		return source.replace(this.options.regex, (match) => this.replaceMatch(source, match)); // .replaceAll('const ', 'var ');
	}

	/**
	* Hook into the compilation process,
	* Replace regex matches with random strings
	* @param {Webpack.compiler} compiler object from webpack
	*/
	apply(compiler) {
		compiler.hooks.emit.tap(pluginName, (compilation) => {
			try {
				console.info('[' + pluginName + '] Using Regex: ' + this.options.regex);

				// process all compiled .js files
				for (const assetFile in compilation.assets) {
					if (!assetFile || !assetFile.endsWith('.js')) continue;
					console.info('[' + pluginName + '] Processing: ' + assetFile);

					// get the processed asset object / source
					const asset = compilation.getAsset(assetFile);
					const source = asset.source._value;
					const processed = this.processString(source);

					// if anything changed, update the processed asset
					if (source != processed) {
						compilation.updateAsset(assetFile, new RawSource(processed));
						// calculate saved memory
						this.savedChars += (source.length - processed.length);
					}
				}

				// finish up
				console.info('[' + pluginName + '] Replaced: ', this.nameMap);
				console.info('[' + pluginName + '] Saved: ' + this.savedChars + ' chars');
			} catch (error) {
				console.info('[' + pluginName + '] Replace error: ', error);
			}
		});
	}
}

module.exports = RenamerPlugin;


