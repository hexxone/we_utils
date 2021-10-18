/**
* @author alteredq / http://alteredqualia.com/
* @author davidedc / http://www.sketchpatch.net/
* @author hexxone  / https://hexx.one
*/

import {Vector2} from 'three';
import {BaseShader} from './BaseShader';

import vertex from './vertex/Basic.glsl';
import fragment from './fragment/FXAA.glsl';

/**
* NVIDIA FXAA by Timothy Lottes
* http://timothylottes.blogspot.com/2011/06/fxaa3-source-released.html
* - WebGL port by @supereggbert
* http://www.glge.org/demos/fxaa/
*
* @public
* @implements {BaseShader}
*/
export class FXAAShader implements BaseShader {
	defines = null;

	shaderID = 'fxaaShader';

	uniforms = {
		tDiffuse: {value: null},
		resolution: {value: new Vector2(1 / 1024, 1 / 512)},
	}

	vertexShader = vertex;

	fragmentShader = fragment;
}


