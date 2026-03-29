/**
 * @author hexxone / https://hexx.one
 *
 * @license
 * Copyright (c) 2026 hexxone All rights reserved.
 * Licensed under the GNU GENERAL PUBLIC LICENSE.
 * See LICENSE file in the project root for full license information.
 */

import { BaseShader } from './BaseShader';

import vertex from './vertex/Basic.glsl';

const fragment = `
varying vec2 vUv;

uniform sampler2D tDiffuse;
uniform sampler2D tHistory;
uniform float feedback;
uniform float historyValid;

void main() {
    vec4 currentColor = texture2D(tDiffuse, vUv);

    if (historyValid < 0.5) {
        gl_FragColor = currentColor;
        return;
    }

    vec4 previousColor = texture2D(tHistory, vUv);
    gl_FragColor = mix(currentColor, previousColor, feedback);
}`;

/**
 * Temporal accumulation shader
 * @public
 * @implements {BaseShader}
 */
export class TAAShader implements BaseShader {

    defines = null;

    shaderID = 'taaShader';

    uniforms = {
        tDiffuse: {
            value: null
        },
        tHistory: {
            value: null
        },
        feedback: {
            value: 0.9
        },
        historyValid: {
            value: 0.0
        }
    };

    vertexShader = vertex;

    fragmentShader = fragment;

}
