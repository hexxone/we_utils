/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable valid-jsdoc */
// eslint-disable-next-line no-undef
const { readFile } = require('fs');
// eslint-disable-next-line no-undef
const { dirname } = require('path');
const {
    minifyGLSL
    // eslint-disable-next-line no-undef
} = require('@yushijinhun/three-minifier-common/glsl-minifier');

/**
 * Webpack loader entrypoint
 * @param {any} loader  webpack loader
 * @param {any} source code file
 * @param {any} context compilation context
 * @param {function} cb callback
 * @returns {void}
 */
function parse(loader, source, context, cb) {
    const imports = [];
    const importPattern = /@import ([./\w_-]+);/gi;
    let match = importPattern.exec(source);

    while (match !== null) {
        imports.push({
            key: match[1],
            target: match[0],
            content: ''
        });
        match = importPattern.exec(source);
    }

    processImports(loader, source, context, imports, cb);
}

/**
 *
 * @param loader
 * @param source
 * @param context
 * @param imports
 * @param cb
 * @returns {void}
 */
function processImports(loader, source, context, imports, cb, lvl = 0) {
    // if no imports left, resolve
    if (lvl > 0) {
        console.log(`[GLSLoader] Walking on lvl: ${lvl}`);
    }
    if (imports.length === 0) {
        return cb(null, source);
    }

    const imp = imports.pop();

    loader.resolve(context, `${imp.key}.glsl`, (err, resolved) => {
        if (err) {
            return cb(err);
        }

        loader.addDependency(resolved);
        readFile(resolved, 'utf-8', (err, src) => {
            if (err) {
                return cb(err);
            }

            parse(loader, src, dirname(resolved), (err, bld) => {
                if (err) {
                    return cb(err);
                }

                const newSource = source.replace(imp.target, bld);

                // call all imports recursively
                processImports(loader, newSource, context, imports, cb, lvl++);
            });
        });
    });
}

/**
 * @param {string} src
 * @returns {string}
 */
function optimize(src) {
    return minifyGLSL(src);
}

// eslint-disable-next-line no-undef
exports.default = function(source) {
    this.cacheable();
    const cb = this.async();

    parse(this, source, this.context, (err, bld) => {
        if (err) {
            return cb(err);
        }

        // do minifying
        const repl = optimize(bld);

        console.log(
            `[GLSLoader] Shortened program by: ${
                bld.length - repl.length
            } chars`
        );

        cb(null, `export default ${JSON.stringify(repl)}`);
    });
};
