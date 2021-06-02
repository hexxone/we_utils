/**
* @author hexxone / https://hexx.one
*
* @license
* Copyright (c) 2021 hexxone All rights reserved.
* Licensed under the GNU GENERAL PUBLIC LICENSE.
* See LICENSE file in the project root for full license information.
*/

import {Vector2} from 'three';
import {BaseShader} from './BaseShader';

/**
* Chromatic Abberation shader with alpha support
* @public
* @implements {BaseShader}
*/
export class ChromaticShader implements BaseShader {
	defines = null;

	shaderID = 'chromaticShader';

	uniforms = {
		tDiffuse: {value: null},
		iResolution: {value: new Vector2(1, 1)},
		strength: {value: 10.0},
	};

	vertexShader = `
	varying vec2 vUv;
	
	void main() {
		vUv = uv;
		gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
	}
	`;

	fragmentShader = `
	uniform sampler2D tDiffuse;
	uniform vec2 iResolution;
	uniform float strength;
	
	varying vec2 vUv;
	
	vec4 ca(sampler2D image, vec2 uv, vec2 resolution, vec2 direction) {
		vec4 col = vec4(0.0);
		vec2 off = vec2(1.33333333333333) * direction;
		col.ra = texture2D(image, uv).ra;
		col.g = texture2D(image, uv - (off / resolution)).g;
		col.b = texture2D(image, uv - 2. * (off / resolution)).b;
		return col;
	}
	
	void main() {
		vec2 uv = gl_FragCoord.xy / iResolution;
		vec2 direction = (uv - .5) * strength;
		gl_FragColor = ca(tDiffuse, uv, iResolution.xy, direction);
	}
	`;
};
