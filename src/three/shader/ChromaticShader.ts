/**
 * @author hexxone / https://hexx.one
 *
 * @license
 * Copyright (c) 2021 hexxone All rights reserved.
 * Licensed under the GNU GENERAL PUBLIC LICENSE.
 * See LICENSE file in the project root for full license information.
 */

import { BaseShader } from "./BaseShader";
import { Vector2 } from "three.ts/src/";

import vertex from "./vertex/Basic.glsl";
import fragment from "./fragment/Chromatic.glsl";

/**
 * Chromatic Abberation shader with alpha support
 * @public
 * @implements {BaseShader}
 */
export class ChromaticShader implements BaseShader {
	defines = null;

	shaderID = "chromaticShader";

	uniforms = {
		tDiffuse: { value: null },
		iResolution: { value: new Vector2(1, 1) },
		strength: { value: 10.0 },
	};

	vertexShader = vertex;

	fragmentShader = fragment;
}
