/**
 * @author hexxone / https://hexx.one
 *
 * @license
 * Copyright (c) 2021 hexxone All rights reserved.
 * Licensed under the GNU GENERAL PUBLIC LICENSE.
 * See LICENSE file in the project root for full license information.
 *
 * @description
 */

import { Vector2 } from "three.ts/src/";

import { BaseShader } from "./BaseShader";

import vertex from "./vertex/Basic.glsl";
import fragment from "./fragment/FractalMirror.glsl";

/**
 * Customized Kaleidoscope shader
 * Inspired by ackleyrc: https://www.shadertoy.com/view/llXcRl
 *
 * @public
 * @implements {BaseShader}
 */
export class FractalMirrorShader implements BaseShader {
	defines = null;

	shaderID = "fractalMirror";

	uniforms = {
		tDiffuse: { value: null },
		iResolution: { value: new Vector2(16, 9) },
		numSides: { value: 2.0 }, // minimum value
		invert: { value: false },
	};

	vertexShader = vertex;

	fragmentShader = fragment;
}
