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

import {Vector2} from 'three';
import {BaseShader} from './BaseShader';

/**
* Customized Kaleidoscope shader
* Inspired by ackleyrc: https://www.shadertoy.com/view/llXcRl
*
* @public
* @implements {BaseShader}
*/
export class FractalMirrorShader implements BaseShader {
	defines = null;

	shaderID = 'fractalMirror';

	uniforms = {
		tDiffuse: {value: null},
		iResolution: {value: new Vector2(16, 9)},
		numSides: {value: 2.0}, // minimum value
		invert: {value: false},
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
	uniform float numSides;
	uniform bool invert;
	
	varying vec2 vUv;
	
	const float PI = 3.14159265358979323846;
	
	void main() {
		vec2 center = vec2(0.5, 0.5);
		float zoom = iResolution.x / iResolution.y;
		vec2 uv = center - vUv;
		if(zoom > 1.0) uv.y /= zoom;
		else uv.x *= zoom;
		
		float KA = PI / numSides;
		float angle = abs(mod(atan(uv.y, uv.x), 2.0 * KA) - KA);
		if(zoom > 1.0) angle -= 45.0;
		vec2 transformed = length(uv) * vec2(sin(angle), cos(angle));
		if(!invert) transformed += center;
		else {
			if(transformed.x < 0.0) transformed.x += 1.0;
			if(transformed.y < 0.0) transformed.y += 1.0;
		}
		gl_FragColor = texture2D(tDiffuse, transformed);
	}
	`;
}
