const fs = require("fs");
const path = require("path");

const glslMin = require("@yushijinhun/three-minifier-common/glsl-minifier");

/**
 *
 * @param loader
 * @param source
 * @param context
 * @param cb
 */
function parse(loader, source, context, cb) {
	const imports = [];
	const importPattern = /@import ([.\/\w_-]+);/gi;
	let match = importPattern.exec(source);

	while (match != null) {
		imports.push({
			key: match[1],
			target: match[0],
			content: "",
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
 * @returns
 */
function processImports(loader, source, context, imports, cb, lvl = 0) {
	// if no imports left, resolve
	console.log("[GLSLoader] Walking on lvl: " + lvl);
	if (imports.length === 0) {
		return cb(null, source);
	}

	const imp = imports.pop();

	loader.resolve(context, `${imp.key}.glsl`, (err, resolved) => {
		if (err) {
			return cb(err);
		}

		loader.addDependency(resolved);
		fs.readFile(resolved, "utf-8", (err, src) => {
			if (err) {
				return cb(err);
			}

			parse(loader, src, path.dirname(resolved), (err, bld) => {
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
 * @return {string}
 */
function optimize(src) {
	/*
	// src = src.replaceAll(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '$1');
	const customs = ['+', '-', '/', '*', '=', `==`, '!=', '>=', '<=', '===', '>', '<', ',', '+=', '-=', '*=', '/=', '(', ')', '{', '}'];
	let spc = src.replaceAll('  ', ' ');
	for (let i = 0; i < customs.length; i++) {
		const ci = customs[i];
		// @todo improve
		// ugly special case for #incude <module> stuffs
		if (ci.length == 1) spc = spc.replaceAll(' ' + ci + ' ', ci);
		else spc = spc.replaceAll(' ' + ci, ci).replaceAll(ci + ' ', ci);
	}
	// @todo macke this better
	// all (new)lines starting with '#' and the following ones need to stay!
	if (spc.indexOf('#') < 0) {
		spc = spc.replaceAll(/[\r\n]/, '');
	}
	return spc.replaceAll(/[\t]/, '');
	*/
	return glslMin.minifyGLSL(src);
}

/**
 * @param {string} source file
 */
exports.default = function (source) {
	this.cacheable();
	const cb = this.async();

	parse(this, source, this.context, (err, bld) => {
		if (err) return cb(err);

		// do minifying
		const repl = optimize(bld);
		console.log(
			"[GLSLoader] Shortened program by: " +
				(bld.length - repl.length) +
				" chars"
		);

		cb(null, `export default ${JSON.stringify(repl)}`);

		delete repl; // "gc"
	});
};
