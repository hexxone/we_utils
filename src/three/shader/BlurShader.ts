/**
 * @author hexxone / https://hexx.one
 *
 * @license
 * Copyright (c) 2021 hexxone All rights reserved.
 * Licensed under the GNU GENERAL PUBLIC LICENSE.
 * See LICENSE file in the project root for full license information.
 */

import { Vector2 } from "three.ts/src/";

import { BaseShader } from "./BaseShader";

import vertex from "./vertex/Basic.glsl";
import fragment from "./fragment/Blur.glsl";

/**
 * Blur shader with Alpha support
 * @public
 * @implements {BaseShader}
 */
export class BlurShader implements BaseShader {
	defines = null;

	shaderID = "blurShader";

	uniforms = {
		tDiffuse: { value: null },
		iResolution: { value: new Vector2(1, 1) },
		u_sigma: { value: 0.5 },
		u_dir: { value: new Vector2(0.1, 0.1) },
	};

	vertexShader = vertex;

	fragmentShader = fragment;
}
