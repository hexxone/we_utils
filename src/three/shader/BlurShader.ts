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
* Blur shader with Alpha support
* @public
* @implements {BaseShader}
*/
export class BlurShader implements BaseShader {
	defines = null;

	shaderID = 'blurShader';

	uniforms = {
		tDiffuse: {value: null},
		iResolution: {value: new Vector2(1, 1)},
		u_sigma: {value: 0.5},
		u_dir: {value: new Vector2(0.1, 0.1)},
	};

	vertexShader = `
	varying vec2 vUv;
	
	void main() {
		vUv = uv;
		gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
	}
	`;

	fragmentShader = `
	varying vec2 vUv;
	
	uniform sampler2D tDiffuse;
	uniform vec2 iResolution;
	uniform float u_sigma;
	uniform vec2 u_dir;
	
	float CalcGauss(float x, float sigma) {
		if ( sigma <= 0.0 ) return 0.0;
		return exp( -(x*x) / (2.0 * sigma) ) / (2.0 * 3.14157 * sigma);
	}
	
	void main() {
		vec2 texC = vUv;
		vec4 texCol = texture2D( tDiffuse, texC );
		vec4 gaussCol = vec4( texCol.rgb, 1.0 );
		float alphaV = texCol.a;
		vec2 step = u_dir / iResolution;
		for (int i = 1; i <= 32; ++ i)
		{
			float weight = CalcGauss(float(i) / 32.0, u_sigma * 0.5);
			if (weight < 1.0/255.0) break;
			texCol = texture2D(tDiffuse, texC + step * float(i));
			gaussCol += vec4(texCol.rgb * weight, weight);
			alphaV += texCol.a * weight;
			texCol = texture2D(tDiffuse, texC - step * float(i));
			gaussCol += vec4(texCol.rgb * weight, weight);
			alphaV += texCol.a * weight;
		}
		alphaV = clamp(alphaV / gaussCol.w, 0.0, 1.0);
		gaussCol.rgb = clamp(gaussCol.rgb / gaussCol.w, 0.0, 1.0);
		gl_FragColor = vec4(gaussCol.rgb, alphaV);
	}
	`;
}
