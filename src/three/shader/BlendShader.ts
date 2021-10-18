/**
* @author hexxone / https://hexx.one
*
* @license
* Copyright (c) 2021 hexxone All rights reserved.
* Licensed under the GNU GENERAL PUBLIC LICENSE.
* See LICENSE file in the project root for full license information.
*/

import {BaseShader} from './BaseShader';

import vertex from './vertex/Basic.glsl';
import fragment from './fragment/Blend.glsl';

/**
* Blend another texture in and out
* @public
* @implements {BaseShader}
*/
export class BlendShader implements BaseShader {
	defines = null;

	shaderID = 'blendShader';

	uniforms = {
		tDiffuse: {value: null},
		overlayBuffer: {value: null},
		mixValue: {value: 1},
	};

	vertexShader = vertex;

	fragmentShader = fragment;
}
