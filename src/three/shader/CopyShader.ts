/**
* @author alteredq / http://alteredqualia.com/
* @author hexxone / https://hexx.one
*
* @license
* Copyright (c) 2022 hexxone All rights reserved.
* Licensed under the GNU GENERAL PUBLIC LICENSE.
* See LICENSE file in the project root for full license information.
*/

import {BaseShader} from './BaseShader';

import vertex from './vertex/Basic.glsl';
import fragment from './fragment/Copy.glsl';

/**
* Siimple I/O shader
* @public
* @implements {BaseShader}
*/
export class CopyShader implements BaseShader {
	defines = null;

	shaderID = 'copyShader';

	uniforms = {
		"tDiffuse": {value: null},
		"opacity": {value: 1.0},
	};

	vertexShader = vertex;

	fragmentShader = fragment;
}
