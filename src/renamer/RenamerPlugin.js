/**
 * @author hexxone / https://hexx.one
 *
 * @license
 * Copyright (c) 2024 hexxone All rights reserved.
 * Licensed under the GNU GENERAL PUBLIC LICENSE.
 * See LICENSE file in the project root for full license information.
 *
 * @todo
 * - export normal strings?
 *
 * @ignore
 */
/* eslint-env browser */
/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-var-requires */

const lib = require('./jsfuck.js');

const { RawSource } = require('webpack-sources');

const validate = require('schema-utils');
const pluginName = '[RenamerPlugin]';

/**
 * schema for options object
 * @see {RenamerPlugin}
 */
const offlineSchema = {
    type: 'object',
    properties: {
        regex: {
            type: 'object'
        }
    }
};

/**
 * Bruh
 */
class RenamerPlugin {

    options = {};

    // mapped name list: {key=value}
    nameMap = {};

    /**
     * Intializes the plugin in the webpack build process
     * @param {offlineSchema} options - plugin options
     */
    constructor(options = {}) {
        validate.validate(offlineSchema, options);
        this.options = options;
    }

    /**
     * Get a random variable name, which does not exist in src and mappings
     * @param {string} src - source code
     * @returns {string} random variable name
     */
    getRandomName(src) {
        const gen = `$x${Math.random()
            .toString(20)
            .substr(2, 2 + Math.random() * 4)}`;

        const existInSource = (src || '').indexOf(gen) >= 0;

        const mapContainsString = Object.entries(this.nameMap).some(([key, value]) => {
            return key.includes(gen) || value.includes(gen);
        });

        return (existInSource || mapContainsString) ? this.getRandomName() : gen;
    }

    /**
     * Regex replace "match" function
     * @param {string} source - source code
     * @param {string} match - regex match
     * @returns {string} replaced string
     */
    replaceMatch(source, match) {
        // check if this exact name is already mapped
        if (this.nameMap[match] !== undefined) {
            return this.nameMap[match];
        }
        // get & map a new random variable name
        const fnd = this.getRandomName(source);

        this.nameMap[match] = fnd;

        return fnd;
    }

    /**
     * randomize array
     * @param {Array} array - array to randomize
     * @returns {Array} randomized array
     */
    shuffle(array) {
        let currentIndex = array.length;
        let randomIndex;

        // While there remain elements to shuffle...
        while (currentIndex !== 0) {
            // Pick a remaining element...
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex--;
            // And swap it with the current element.
            [array[currentIndex], array[randomIndex]] = [
                array[randomIndex],
                array[currentIndex]
            ];
        }

        return array;
    }

    /**
     * Illegal JS accessor shortening
     * @param {string} pd src
     * @returns {string} res
     */
    shortenAccessors(pd) {
        if (typeof pd !== 'string') {
            console.error(`Data is not string: '${typeof pd}'`);

            return pd;
        }

        // 杀 屠 大 门 安 天
        const candids = this.shuffle(
            '職 識 辦 辯 色 特 持 谁 准 彩 就 是 空 虚 纸 张 图 片 末 未 已 己 土 士 干 千 人 入'.split(
                ' '
            )
        );
        let globalPre = candids[0];
        let candI = 1;

        // @todo from settings
        const blackList = [
            '.arguments',
            '.update',
            '.outputData',
            '.audioProps',
            '.inputData',
            '.levelSettings',
            '.exports',
            '.build',
            '.forEach',
            '.buffer',
            '.__getFloat64ArrayView',
            '.__getInt32Array',
            '.__getFloat32ArrayView'
        ];

        // used runtime string delimiter
        const delim = '.';

        // count all accessor usages, which could gain an advantage by shortening
        const processed = {};

        pd.match(/\.+[a-zA-Z0-9_]{6,}/g).forEach((element) => {
            const match = element;

            if (match.indexOf('.') !== 0) {
                return;
            } // only dot at start allowed
            if (match.indexOf('..') === 0) {
                return;
            } // skip spread operator
            if (blackList.includes(match)) {
                return;
            }

            if (processed[match]) {
                processed[match]++;
            } else {
                processed[match] = 1;
            }
        });

        // queue to replace "" strings
        // queue to replace '' strings
        const strPatt = /('(?:\\.|[^'])*')|("(?:\\.|[^"])*")/gim;

        pd.match(strPatt).forEach((element) => {
            const match = element;

            if (match.indexOf('.') >= 0) {
                return;
            } // no dots allowed
            if (match.indexOf(delim) >= 0) {
                return;
            } // skip delim operator
            if (blackList.includes(match)) {
                return;
            }

            if (processed[match]) {
                processed[match]++;
            } else {
                processed[match] = 1;
            }
        });

        // convert & calculate the actual 'char' savings
        const converted = Object.keys(processed).map((key) => {
            const val = processed[key];
            const saving = val * key.length - (key.length + 3);

            return {
                k: key,
                v: val,
                w: saving
            };
        });

        converted.sort((b, a) => {
            return a.w > b.w ? 1 : b.w > a.w ? -1 : 0;
        });

        // filter positive savings only
        const globalMap = {};

        globalMap[globalPre] = [];

        const filtered = [];
        let realI = 0;
        let canCount = 0;
        const minSum = globalPre.length + 8; // 'var =[];'
        let sum = -minSum;

        for (let i = 0; i < converted.length; i++) {
            const element = converted[i];

            if (canCount > 9) {
                globalPre = candids[candI++ % candids.length];
                if (!globalMap[globalPre]) {
                    globalMap[globalPre] = [];
                }
                realI = globalMap[globalPre].length;
                canCount = 0;
                sum -= minSum;
            }

            const replacement = `[${globalPre}[${realI}]]`;
            const newLen = element.v * replacement.length;
            const newWeight = element.w - newLen;

            // if the advantage exceeds the own weight, process it
            if (newWeight > element.k.length) {
                globalMap[globalPre][realI++] = element.k.substring(1);
                canCount++;
                filtered.push({
                    k: element.k,
                    v: element.v,
                    w: newWeight,
                    r: replacement
                });
                sum += newWeight;
            }
        }

        // !! important to replace the longest words first, so we dont have partial replacements !!
        filtered.sort((b, a) => {
            return a.k.length > b.k.length
                ? 1
                : b.k.length > a.k.length
                    ? -1
                    : 0;
        });

        // console.info(JSON.stringify(filtered, null, '\t'));
        console.info(`${pluginName} Potentially saving: ${sum} chars. Processing...`);

        const oldPd = pd;
        let skipped = 0;

        // replace all occurences
        for (let index = 0; index < filtered.length; index++) {
            const element = filtered[index];
            // console.debug(
            //     "Replacing " +
            //         element.k +
            //         " => " +
            //         element.r +
            //         "  (" +
            //         element.v +
            //         " usages)"
            // );

            let newPd = pd;

            // check & queue every potential replacement one-by-one
            const operations = [];
            const rgx = new RegExp(`\\${element.k}`, 'g');
            let rm;

            while ((rm = rgx.exec(newPd)) !== null) {
                const rIdx = rm.index;

                // match is invalid if it is followed by a alphanumeric char or _
                const followChar = newPd[rgx.lastIndex];
                let isInvalid = followChar.match(/[a-zA-Z0-9_]/) !== null;

                // check if replacement is in "" string
                // check if replacement is in '' string
                // check if replacement is in `` string
                const patt
                    = /'((?:\\.|[^'])*)'|"((?:\\.|[^"])*)"|`((?:\\.|[^`])*)`/gim;
                let match;

                while ((match = patt.exec(newPd)) !== null && !isInvalid) {
                    // console.info(match.index + ' ' + patt.lastIndex);
                    if (rIdx >= match.index && rIdx <= patt.lastIndex) {
                        isInvalid = true;
                        // console.info(`'${element.k}' Is in String between [${pIdx}:${pIdx + pLen}] at [${rIdx}:${rIdx + rLen}] ==> ${newPd.substring(rIdx - rLen -5, rIdx + 5)}`);
                    }
                    // else console.info(`${element.k} not in ${match[0]}`);
                }

                if (!isInvalid) {
                    operations.push({
                        start: rIdx,
                        end: rgx.lastIndex,
                        repl: element.r
                    });
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

                // console.info(`Replace '${newPd.substring(from, to)}' at ${from} with '${re}'  ==>  ${newPd.substring(from -5, to + 5)}`);
                newPd = newPd.substring(0, from) + re + newPd.substring(to);

                // calculate new offset for following pending operations
                const off = to - from - re.length;

                for (let idx = index + 1; idx < operations.length; idx++) {
                    const op = operations[idx];

                    if (op.start > to - off) {
                        op.start -= off;
                    }
                    if (op.end > to - off) {
                        op.end -= off;
                    }
                }
            }

            // sanity check
            // @todo bruh
            if (newPd.match(/\]\][a-zA-Z0-9_]{1,}/)) {
                console.error(
                    `${pluginName} Error double bracket, missing delimiter? `
                );
                console.error(element);
            } else {
                pd = newPd;
            }
        }

        if (skipped > 0) {
            console.info(
                `${pluginName} Skipped ${skipped} invalid replacements.`
            );
        }

        // prepend all global Maps
        const splFunc = '大';
        const rndOff = Math.round(2 + Math.random() * 14);

        // eslint-disable-next-line require-jsdoc
        function caesarCipher(s) {
            let r = '';

            for (let i = 0; i < s.length; i++) {
                r += String.fromCharCode(s[i].charCodeAt() + rndOff);
            }

            return r;
        }

        function mayEncode(str) {
            const forced = true; // TODO

            if (Math.random() > 0.5 || forced) {
                return lib.JSFuck.encode(str);
            }

            return `'${str}'`;
        }

        let newStrict = '';
        const keys = Object.keys(globalMap);

        if (keys.length > 4) {
            // do some small scr1pt-k1ddy pr0tect1on :)
            const fk1 = lib.JSFuck.encode(rndOff.toString());
            const fk2 = mayEncode('split');
            const fk3 = lib.JSFuck.encode(delim);
            const fk4 = mayEncode('length');
            const fk6 = lib.JSFuck.encode('atob');
            const fk7 = mayEncode('String');
            const fk8 = `${lib.JSFuck.encode('har')}+Δ+${lib.JSFuck.encode('ode')}`;
            const fk9 = lib.JSFuck.encode('from');
            const fk10 = lib.JSFuck.encode('At');
            const fk11 = lib.JSFuck.encode('C');

            const tmp1 = `\`\${${fk9}}\${Δ}\${Σ}\``;
            const tmp2 = `\`c\${Σ}\${${fk10}}\``;
            const func = `Ⅾ=>{var Δ=${fk11},Ή=window,Σ=${fk8},Ⅹ=${fk4},χ=Ή,one='6765742072336b74206b6964646f',Ή=[]+[],α=Ή;for(var Ἰ=0,Ⅾ=χ[${fk6}](Ⅾ);Ἰ<Ⅾ[Ⅹ];Ή+=χ[${fk7}][${tmp1}]((Ⅾ[Ἰ++][${tmp2}]())-(${fk1}))){}return Ή[${fk2}](${fk3})}`;

            newStrict += `var ${splFunc}=${func},`;
        }

        keys.forEach((k) => {
            let val = globalMap[k];

            if (val.length > 4) {
                if (keys.length > 4) {
                    val = `${splFunc}('${btoa(caesarCipher(val.join(delim)))}')`;
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
                newStrict += 'var ';
            }
            newStrict += `${k}=${val}`;
        });

        console.info(`${pluginName} Processed header length: ${newStrict.length}`);

        pd = `${newStrict};${pd}`;

        const lengDiff = oldPd.length - pd.length;
        const expDiff = lengDiff - sum;

        let m = `Actually saved: ${lengDiff} chars. `;

        if (expDiff > 0) {
            m += ` (${expDiff} more than expected)`;
        }
        if (expDiff < 0) {
            m += ` (${Math.abs(expDiff)} less than expected)`;
        }
        console.info(`${pluginName} Replacement complete! -> ${m}`);

        if (lengDiff < 0) {
            console.info(
                `${pluginName} Did not save any chars (${lengDiff})! Reverting changes...`
            );
            pd = oldPd;
        }

        return pd;
    }

    /**
     * process via regex
     * @param {string} source - source code
     * @returns {string} processed source
     */
    processString(source) {
        if (typeof source !== 'string') {
            console.error(`${pluginName} Source no string: `, source);

            return source;
        }

        const pd = source.replace(this.options.regex, (match) => {
            return this.replaceMatch(source, match);
        }); // .replaceAll('const ', 'var ');

        const sa = this.shortenAccessors(pd);

        return sa;
    }

    /**
     * Process given source file object
     * @param {Webpack.Compilation} compilation - webpack compilation
     * @param {string} name - source file name
     * @param {any} child - source file object
     * @returns {void}
     */
    processSource(compilation, name, child) {
        if (child._valueIsBuffer || !child.source) {
            console.error(`${pluginName} Value is Buffer!`);

            return;
        }
        const source = child.source._value;
        const processed = this.processString(source);

        // if anything changed, update the processed asset
        if (typeof processed === 'string' && source !== processed) {
            compilation.updateAsset(name, new RawSource(processed));
        }
    }

    /**
     * Hook into the compilation process,
     * Replace regex matches with random strings
     * @param {Webpack.compiler} compiler object from webpack
     * @returns {void}
     */
    apply(compiler) {
        compiler.hooks.emit.tap(pluginName, (compilation) => {
            try {
                console.info(
                    `${pluginName} Using Regex: ${this.options.regex}`
                );

                // process all compiled .js files
                for (const assetFile in compilation.assets) {
                    if (!assetFile || !assetFile.endsWith('.js')) {
                        continue;
                    }
                    console.info(`${pluginName} Processing file: ${assetFile}`);

                    // get the processed asset object / source
                    const asset = compilation.getAsset(assetFile);

                    if (asset.source._children) {
                        asset.source._children.forEach((child) => {
                            this.processSource(compilation, assetFile, child);
                        });
                    } else {
                        this.processSource(compilation, assetFile, asset);
                    }
                }

                // finish up
                console.info(`${pluginName} Replaced: ${JSON.stringify(this.nameMap)}`);
            } catch (error) {
                console.info(`${pluginName} Replace error: `, error);
            }
        });
    }

}

module.exports = RenamerPlugin;
