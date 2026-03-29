/**
 * @author hexxone / https://hexx.one
 *
 * @license
 * Copyright (c) 2026 hexxone All rights reserved.
 * Licensed under the GNU GENERAL PUBLIC LICENSE.
 * See LICENSE file in the project root for full license information.
 */

import { LinearFilter, RGBAFormat } from 'three.ts/src/constants';
import { ShaderMaterial } from 'three.ts/src/materials/ShaderMaterial';
import { UniformsUtils } from 'three.ts/src/renderers/shaders/UniformsUtils';
import { WebGLRenderer } from 'three.ts/src/renderers/WebGLRenderer';
import { WebGLRenderTarget } from 'three.ts/src/renderers/WebGLRenderTarget';
import { CopyShader } from '../shader/CopyShader';
import { TAAShader } from '../shader/TAAShader';
import { BasePass } from './BasePass';
import { FullScreenHelper } from './FullScreenHelper';

/**
 * Small temporal antialiasing pass with an internal history target.
 * @public
 */
export class TAAPass implements BasePass {

    name = 'taaPass';
    enabled = true;
    needsSwap = true;
    clear = false;

    blendMaterial: ShaderMaterial;
    copyMaterial: ShaderMaterial;
    fsQuad: FullScreenHelper;
    historyTarget: WebGLRenderTarget;
    historyValid = false;

    constructor() {
        this.blendMaterial = new ShaderMaterial();
        this.blendMaterial.uniforms = UniformsUtils.clone(new TAAShader().uniforms);
        this.blendMaterial.vertexShader = new TAAShader().vertexShader;
        this.blendMaterial.fragmentShader = new TAAShader().fragmentShader;
        this.blendMaterial.transparent = true;

        this.copyMaterial = new ShaderMaterial();
        this.copyMaterial.uniforms = UniformsUtils.clone(new CopyShader().uniforms);
        this.copyMaterial.vertexShader = new CopyShader().vertexShader;
        this.copyMaterial.fragmentShader = new CopyShader().fragmentShader;
        this.copyMaterial.transparent = true;

        this.fsQuad = new FullScreenHelper(this.blendMaterial);
        this.historyTarget = new WebGLRenderTarget(1, 1, {
            minFilter: LinearFilter,
            magFilter: LinearFilter,
            format: RGBAFormat,
            stencilBuffer: false
        });
        this.historyTarget.texture.name = 'TAAPass.history';
    }

    prepare(renderer: WebGLRenderer): void {
        this.fsQuad.prepare(renderer);
    }

    dispose() {
        this.fsQuad.dispose();
        this.historyTarget.dispose();
    }

    setSize(width: number, height: number) {
        this.historyTarget.setSize(width, height);
        this.historyValid = false;
    }

    render(
        renderer: WebGLRenderer,
        writeBuffer: WebGLRenderTarget,
        readBuffer: WebGLRenderTarget,
        maskActive: boolean,
        renderToScreen: boolean
    ) {
        if (maskActive) {
            return;
        }

        this.blendMaterial.uniforms.tDiffuse.value = readBuffer.texture;
        this.blendMaterial.uniforms.tHistory.value = this.historyTarget.texture;
        this.blendMaterial.uniforms.historyValid.value = this.historyValid ? 1.0 : 0.0;

        this.fsQuad.setMaterial(this.blendMaterial);
        renderer.setRenderTarget(this.historyTarget);
        if (this.clear) {
            renderer.clear(
                renderer.autoClearColor,
                renderer.autoClearDepth,
                renderer.autoClearStencil
            );
        }
        this.fsQuad.render(renderer);

        this.copyMaterial.uniforms.tDiffuse.value = this.historyTarget.texture;
        this.copyMaterial.uniforms.opacity.value = 1.0;
        this.fsQuad.setMaterial(this.copyMaterial);

        if (renderToScreen) {
            renderer.setRenderTarget(null);
        } else {
            renderer.setRenderTarget(writeBuffer);
        }
        this.fsQuad.render(renderer);
        this.historyValid = true;
    }

}
