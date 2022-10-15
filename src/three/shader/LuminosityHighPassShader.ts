/**
 * @author bhouston / http://clara.io/
 * @author hexxone / https://hexx.one
 *
 * @license
 * Copyright (c) 2022 hexxone All rights reserved.
 * Licensed under the GNU GENERAL PUBLIC LICENSE.
 * See LICENSE file in the project root for full license information.
 */

import { BaseShader } from "./BaseShader";

import vertex from "./vertex/Basic.glsl";
import fragment from "./fragment/Luminosity.glsl";
import { Color } from "three.ts/src/math/Color";

/**
 * Luminosity
 * http://en.wikipedia.org/wiki/Luminosity
 *
 * @public
 * @implements {BaseShader}
 */
export class LuminosityHighPassShader implements BaseShader {
	defines = null;

	shaderID = "luminosityHighPass";

	uniforms = {
		tDiffuse: { value: null },
		luminosityThreshold: { value: 1.0 },
		smoothWidth: { value: 1.0 },
		defaultColor: { value: new Color(0x000000) }, // @TODO might need to set to BG color?
		defaultOpacity: { value: 0.0 },
	};

	vertexShader = vertex;

	fragmentShader = fragment;
}
