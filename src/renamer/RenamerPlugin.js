/**
* @author hexxone / https://hexx.one
*
* @license
* Copyright (c) 2021 hexxone All rights reserved.
* Licensed under the GNU GENERAL PUBLIC LICENSE.
* See LICENSE file in the project root for full license information.
* @ignore
*/

const lib = require('./jsfuck.js');

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
	 * randomize array
	 * @param {Array} array
	 * @return {Array}
	 */
	shuffle(array) {
		let currentIndex = array.length; let randomIndex;
		// While there remain elements to shuffle...
		while (currentIndex != 0) {
			// Pick a remaining element...
			randomIndex = Math.floor(Math.random() * currentIndex);
			currentIndex--;
			// And swap it with the current element.
			[array[currentIndex], array[randomIndex]] = [
				array[randomIndex], array[currentIndex]];
		}
		return array;
	}

	/**
	 * Illegal JS accessor shortening
	 * @param {string} pd src
	 * @return {string} res
	 */
	shortenAccessors(pd) {
		// 杀 屠 大 门 安 天
		const candids = this.shuffle('職 識 辦 辯 色 特 持 谁 准 彩 就 是 空 虚 纸 张 图 片 末 未 已 己 土 士 干 千 人 入'.split(' '));
		let globalPre = candids[0];
		let candI = 1;

		// @todo from settings
		const blackList = ['.arguments', '.update', '.outputData', '.audioProps', '.inputData', '.levelSettings',
			'.exports', '.build', '.forEach', '.buffer',
			'.__getFloat64ArrayView', '.__getInt32Array', '.__getFloat32ArrayView'];

		// count all accessor usages, which could gain an advantage by shortening
		const processed = {};
		pd.match(/\.+[a-zA-Z0-9_]{5,}/g).forEach((element) => {
			const match = element;
			if (match.indexOf('.') != 0) return; // only dot at start allowed
			if (match.indexOf('..') == 0) return; // skip spread operator
			if (blackList.includes(match)) return;

			if (processed[match]) processed[match]++;
			else processed[match] = 1;
		});

		// convert & calculate the actual 'char' savings
		const converted = Object.keys(processed).map((key) => {
			const val = processed[key];
			const saving = val * (key.length) - (key.length + 3);
			return {k: key, v: val, w: saving};
		});
		converted.sort((b, a) => (a.w > b.w) ? 1 : ((b.w > a.w) ? -1 : 0));

		// filter positive savings only
		const globalMap = {};
		globalMap[globalPre] = [];

		const filtered = [];
		let realI = 0;
		let canCount = 0;
		const minSum = (globalPre.length + 8); // 'var =[];'
		let sum = - minSum;
		for (let i = 0; i < converted.length; i++) {
			const element = converted[i];

			if (canCount > 9) {
				globalPre = candids[candI++ % candids.length];
				if (!globalMap[globalPre]) globalMap[globalPre] = [];
				realI = globalMap[globalPre].length;
				canCount = 0;
				sum -= minSum;
			}

			const replacement = '[' + globalPre + '[' + realI + ']]';
			const newLen = element.v * replacement.length;
			const newWeight = element.w - newLen;
			// if the advantage exceeds the own weight, process it
			if (newWeight > element.k.length) {
				globalMap[globalPre][realI++] = element.k.substring(1);
				canCount++;
				filtered.push({k: element.k, v: element.v, w: newWeight, r: replacement});
				sum += newWeight;
			}
		}

		// !! important to replace the longest words first, so we dont have partial replacements !!
		filtered.sort((b, a) => (a.k.length > b.k.length) ? 1 : ((b.k.length > a.k.length) ? -1 : 0));

		// console.log(JSON.stringify(filtered, null, '\t'));
		console.log('Potentially saving: ' + sum + ' chars.');

		const oldPd = pd;
		const oldStrict ='"use strict";';


		// replace all occurences
		for (let index = 0; index < filtered.length; index++) {
			const element = filtered[index];
			console.log('Replacing ' + element.k + ' => ' + element.r + '  (' + element.v + ' usages)');

			let skipped = 0;
			let newPd = pd;

			// check & queue every potential replacement one-by-one
			const operations = [];
			const rgx = new RegExp('\\' + element.k, 'g');
			let rm;
			while (( rm = rgx.exec(newPd)) != null) {
				const rIdx = rm.index;

				// match is invalid if it is followed by a alphanumeric char or _
				const followChar = newPd[rgx.lastIndex];
				let isInvalid = (followChar.match(/[a-zA-Z0-9_]/) != null);

				// check if replacement is in "" string
				// check if replacement is in '' string
				// check if replacement is in `` string
				const patt = /'((?:\\.|[^'])*)'|"((?:\\.|[^"])*)"|`((?:\\.|[^`])*)`/igm;
				let match;
				while ((match = patt.exec(newPd)) != null && !isInvalid) {
					// console.log(match.index + ' ' + patt.lastIndex);
					if (rIdx >= match.index && rIdx <= patt.lastIndex) {
						isInvalid = true;
						// console.log(`'${element.k}' Is in String between [${pIdx}:${pIdx + pLen}] at [${rIdx}:${rIdx + rLen}] ==> ${newPd.substring(rIdx - rLen -5, rIdx + 5)}`);
					}
					// else console.log(`${element.k} not in ${match[0]}`);
				}

				if (!isInvalid) {
					operations.push({start: rIdx, end: rgx.lastIndex, repl: element.r});
				} else {
					skipped++;
				}
			}

			// execute pending operations
			for (let index = 0; index < operations.length; index++) {
				const operation = operations[index];
				const from = operation.start;
				const to = operation.end;
				const re = operation.repl;

				// console.log(`Replace '${newPd.substring(from, to)}' at ${from} with '${re}'  ==>  ${newPd.substring(from -5, to + 5)}`);
				newPd = newPd.substring(0, from) + re + newPd.substring(to);

				// calculate new offset for following pending operations
				const off = (to - from) - re.length;
				for (let idx = index +1; idx < operations.length; idx++) {
					const op = operations[idx];
					if (op.start > to - off) op.start -= off;
					if (op.end > to - off) op.end -= off;
				}
			}

			// sanity check
			// @todo bruh
			if (newPd.match(/\]\][a-zA-Z0-9_]{1,}/)) {
				console.log('Error double bracket, missing delimiter? ');
				console.log(element);
			} else {
				if (skipped > 0) console.log(`Skipped ${skipped} invalid replacements.`);
				pd = newPd;
			}
		}


		// prepend all global Maps
		const delim = '.';
		const splFunc = '大';
		const rndOff = Math.round(2 + Math.random() * 14);

		// eslint-disable-next-line require-jsdoc
		function caesarCipher(s) {
			let r = '';
			for (let i = 0; i < s.length; i++) {
				r += String.fromCharCode((s[i].charCodeAt()) + rndOff);
			}
			return r;
		}


		let newStrict = oldStrict;
		const keys = Object.keys(globalMap);
		if (keys.length > 4) {
			const fk1 = lib.JSFuck.encode(rndOff.toString());
			const fk2 = lib.JSFuck.encode('split');
			const fk3 = lib.JSFuck.encode(delim);
			const func = `(s)=>{var r='';for(var i=0;i<s.length;r+=String.fromCharCode((s[i++].charCodeAt())-(${fk1}))){}return r[${fk2}](${fk3})}`;
			newStrict +=`var ${splFunc}=${func},`;
		}

		keys.forEach((k) => {
			let val = globalMap[k];
			if (val.length > 4) {
				if (keys.length > 4) {
					val = `${splFunc}(${JSON.stringify(caesarCipher(val.join(delim)))})`;
				} else {
					val = `"${val.join(delim)}".split('${delim}')`;
				}
			} else {
				val = JSON.stringify(val);
			}
			if (newStrict.endsWith(')' || newStrict.endsWith('}'))) {
				newStrict += ',';
			}
			if (newStrict.endsWith(';')) {
				newStrict +='var ';
			}
			newStrict += `${k}=${val}`;
		});

		console.log(newStrict);

		pd = pd.replace(oldStrict, newStrict + ';');

		const lengDiff = oldPd.length - pd.length;
		const expDiff = lengDiff - sum;

		console.log('Replacement complete!');
		let m = 'Actually saved: ' + lengDiff + ' chars. ';
		if (expDiff > 0) m+= ' (' + expDiff + ' more than expected)';
		if (expDiff < 0) m+= ' (' + Math.abs(expDiff) + ' less than expected)';
		console.log(m);
		if (lengDiff < 0) {
			console.log('Did not save any chars! rolling back...');
			pd = oldPd;
		}

		return pd;
	}

	/**
	 * process via regex
	 * @param {string} source
	 * @return {string}
	 */
	processString(source) {
		const pd = source.replace(this.options.regex, (match) => this.replaceMatch(source, match)); // .replaceAll('const ', 'var ');

		const sa = this.shortenAccessors(pd);

		return sa;
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


