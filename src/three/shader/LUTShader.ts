/**
* @author hexxone / https://hexx.one
*
* @license
* Copyright (c) 2023 hexxone All rights reserved.
* Licensed under the GNU GENERAL PUBLIC LICENSE.
* See LICENSE file in the project root for full license information.
*/

import {BaseShader} from './BaseShader';

import vertex from './vertex/Basic.glsl';
import fragment from './fragment/LUT.glsl';

/**
* LookUpTable shader
* taken from ThreeJS examples and converted to TS
*
* @public
* @implements {BaseShader}
*/
export class LUTShader implements BaseShader {
	defines = null;

	shaderID = 'LUTShader';

	uniforms = {
		"tDiffuse": {value: null},
		"lutMap": {value: null},
		"lutMapSize": {value: 1},
	};

	vertexShader = vertex;

	fragmentShader = fragment;
}
