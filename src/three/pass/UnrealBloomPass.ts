/**
 * @author spidersharma / http://eduperiment.com/
 */

import { AdditiveBlending,
    LinearFilter,
    RGBAFormat } from 'three.ts/src/constants';
import { MeshBasicMaterial } from 'three.ts/src/materials/MeshBasicMaterial';
import { ShaderMaterial } from 'three.ts/src/materials/ShaderMaterial';
import { Color } from 'three.ts/src/math/Color';
import { Vector2 } from 'three.ts/src/math/Vector2';
import { Vector3 } from 'three.ts/src/math/Vector3';
import { UniformsUtils } from 'three.ts/src/renderers/shaders/UniformsUtils';
import { WebGLRenderer } from 'three.ts/src/renderers/WebGLRenderer';
import { WebGLRenderTarget } from 'three.ts/src/renderers/WebGLRenderTarget';
import { CopyShader } from '../shader/CopyShader';
import { LuminosityHighPassShader } from '../shader/LuminosityHighPassShader';

import { BasePass } from './BasePass';
import { FullScreenHelper } from './FullScreenHelper';

/**
 * Inspired from Unreal Engine
 * https://docs.unrealengine.com/latest/INT/Engine/Rendering/PostProcessEffects/Bloom/
 */
export class UnrealBloomPass implements BasePass {

    public name = 'UnrealBloom';
    public enabled = true;
    public needsSwap = false;
    public clear = true;

    public oldClearColor = new Color(0);
    public oldClearAlpha = 1;
    public clearColor = new Color(0);

    private resolution = null;
    private strength = null;
    private radius = null;
    private threshold = null;
    private renderTargetBright: WebGLRenderTarget;
    private highPassUniforms = null;

    // create color only once here, reuse it later inside the render function

    private renderTargetsHorizontal: WebGLRenderTarget[] = [];
    private renderTargetsVertical: WebGLRenderTarget[] = [];
    private nMips = 5;

    private separableBlurMaterials: ShaderMaterial[] = [];
    private materialHighPassFilter: ShaderMaterial = null;
    private compositeMaterial: ShaderMaterial = null;
    private materialCopy: ShaderMaterial = null;
    private bloomTintColors = null;
    private copyUniforms = null;

    private basic = new MeshBasicMaterial();
    private fsQuad = new FullScreenHelper(null);

    private blurDirX = new Vector2(1.0, 0.0);
    private blurDirY = new Vector2(0.0, 1.0);

    /**
     * Construct bloom shader
     * @param {Vector2} resolution size
     * @param {number} strength multiplier
     * @param {number} radius size
     * @param {number} threshold min val
     */
    constructor(
        resolution: Vector2,
        strength: number,
        radius: number,
        threshold: number
    ) {
        this.resolution = resolution ? resolution : new Vector2(256, 256);
        this.strength = strength !== undefined ? strength : 1;
        this.radius = radius;
        this.threshold = threshold;

        // render targets
        const pars = {
            minFilter: LinearFilter,
            magFilter: LinearFilter,
            format: RGBAFormat
        };
        let resx = Math.round(this.resolution.x / 2);
        let resy = Math.round(this.resolution.y / 2);

        this.renderTargetBright = new WebGLRenderTarget(resx, resy, pars);
        this.renderTargetBright.texture.name = 'UnrealBloomPass.bright';
        this.renderTargetBright.texture.generateMipmaps = false;

        for (let i = 0; i < this.nMips; i++) {
            const renderTargetHorizonal = new WebGLRenderTarget(
                resx,
                resy,
                pars
            );

            renderTargetHorizonal.texture.name = `UnrealBloomPass.h${i}`;
            renderTargetHorizonal.texture.generateMipmaps = false;
            this.renderTargetsHorizontal.push(renderTargetHorizonal);

            const renderTargetVertical = new WebGLRenderTarget(
                resx,
                resy,
                pars
            );

            renderTargetVertical.texture.name = `UnrealBloomPass.v${i}`;
            renderTargetVertical.texture.generateMipmaps = false;
            this.renderTargetsVertical.push(renderTargetVertical);

            resx = Math.round(resx / 2);
            resy = Math.round(resy / 2);
        }

        // luminosity high pass material

        const highPassShader = new LuminosityHighPassShader();

        this.highPassUniforms = UniformsUtils.clone(highPassShader.uniforms);
        this.highPassUniforms.luminosityThreshold.value = threshold;
        this.highPassUniforms.smoothWidth.value = 0.01;

        this.materialHighPassFilter = new ShaderMaterial();
        this.materialHighPassFilter.uniforms = this.highPassUniforms;
        this.materialHighPassFilter.vertexShader = highPassShader.vertexShader;
        this.materialHighPassFilter.fragmentShader
            = highPassShader.fragmentShader;
        this.materialHighPassFilter.defines = {};

        // Gaussian Blur Materials
        const kernelSizeArray = [3, 5, 7, 9, 11];

        resx = Math.round(this.resolution.x / 2);
        resy = Math.round(this.resolution.y / 2);

        for (let i = 0; i < this.nMips; i++) {
            this.separableBlurMaterials.push(
                this.getSeperableBlurMaterial(kernelSizeArray[i])
            );
            this.separableBlurMaterials[i].uniforms.texSize.value = new Vector2(
                resx,
                resy
            );

            resx = Math.round(resx / 2);
            resy = Math.round(resy / 2);
        }

        // Composite material
        this.compositeMaterial = this.getCompositeMaterial(this.nMips);
        this.compositeMaterial.uniforms.blurTexture1.value
            = this.renderTargetsVertical[0].texture;
        this.compositeMaterial.uniforms.blurTexture2.value
            = this.renderTargetsVertical[1].texture;
        this.compositeMaterial.uniforms.blurTexture3.value
            = this.renderTargetsVertical[2].texture;
        this.compositeMaterial.uniforms.blurTexture4.value
            = this.renderTargetsVertical[3].texture;
        this.compositeMaterial.uniforms.blurTexture5.value
            = this.renderTargetsVertical[4].texture;
        this.compositeMaterial.uniforms.bloomStrength.value = strength;
        this.compositeMaterial.uniforms.bloomRadius.value = 0.1;
        this.compositeMaterial.needsUpdate = true;

        const bloomFactors = [1.0, 0.8, 0.6, 0.4, 0.2];

        this.compositeMaterial.uniforms.bloomFactors.value = bloomFactors;
        this.bloomTintColors = [
            new Vector3(1, 1, 1),
            new Vector3(1, 1, 1),
            new Vector3(1, 1, 1),
            new Vector3(1, 1, 1),
            new Vector3(1, 1, 1)
        ];
        this.compositeMaterial.uniforms.bloomTintColors.value
            = this.bloomTintColors;

        // copy material

        const copyShader = new CopyShader();

        this.copyUniforms = UniformsUtils.clone(copyShader.uniforms);
        this.copyUniforms.opacity.value = 1.0;

        this.materialCopy = new ShaderMaterial();
        this.materialCopy.uniforms = this.copyUniforms;
        this.materialCopy.vertexShader = copyShader.vertexShader;
        this.materialCopy.fragmentShader = copyShader.fragmentShader;
        this.materialCopy.blending = AdditiveBlending;
        this.materialCopy.depthTest = false;
        this.materialCopy.depthWrite = false;
        this.materialCopy.transparent = true;
    }

    /**
     * precompile shader
     * @param {WebGLRenderer} renderer renderer
     * @returns {void}
     */
    prepare(renderer: WebGLRenderer) {
        this.fsQuad.prepare(renderer);
    }

    /**
     * Destroy shader
     * @returns {void}
     */
    dispose() {
        for (let i = 0; i < this.renderTargetsHorizontal.length; i++) {
            this.renderTargetsHorizontal[i].dispose();
        }
        for (let i = 0; i < this.renderTargetsVertical.length; i++) {
            this.renderTargetsVertical[i].dispose();
        }
        this.renderTargetBright.dispose();
        this.fsQuad.dispose();
    }

    /**
     * Updated screen size
     * @param {number} width X
     * @param {number} height Y
     * @returns {void}
     */
    setSize(width: number, height: number) {
        let resx = Math.round(width / 2);
        let resy = Math.round(height / 2);

        this.renderTargetBright.setSize(resx, resy);

        for (let i = 0; i < this.nMips; i++) {
            this.renderTargetsHorizontal[i].setSize(resx, resy);
            this.renderTargetsVertical[i].setSize(resx, resy);

            this.separableBlurMaterials[i].uniforms.texSize.value = new Vector2(
                resx,
                resy
            );

            resx = Math.round(resx / 2);
            resy = Math.round(resy / 2);
        }
    }

    /**
     * Render Frame
     * @param {WebGLRenderer} renderer Context
     * @param {WebGLRenderTarget} writeBuffer Output
     * @param {WebGLRenderTarget} readBuffer Input
     * @param {boolean} maskActive filter
     * @param {boolean} renderToScreen render to canvas OR buffer
     * @returns {void}
     */
    render(
        renderer: WebGLRenderer,
        writeBuffer: WebGLRenderTarget,
        readBuffer: WebGLRenderTarget,
        maskActive: boolean,
        renderToScreen: boolean
    ) {
        renderer.getClearColor(this.oldClearColor);
        this.oldClearAlpha = renderer.getClearAlpha();
        const oldAutoClear = renderer.autoClear;

        renderer.autoClear = false;

        renderer.setClearColor(this.clearColor, 0);

        if (maskActive) {
            renderer.context.disable(renderer.context.STENCIL_TEST);
        }

        // Render input to screen
        if (renderToScreen) {
            this.fsQuad.setMaterial(this.basic);
            this.basic.map = readBuffer.texture;
            renderer.setRenderTarget(null);
            renderer.clear();
            this.fsQuad.render(renderer);
        }

        // 1. Extract Bright Areas

        this.highPassUniforms.tDiffuse.value = readBuffer.texture;
        this.highPassUniforms.luminosityThreshold.value = this.threshold;
        this.fsQuad.setMaterial(this.materialHighPassFilter);

        renderer.setRenderTarget(this.renderTargetBright);
        renderer.clear();
        this.fsQuad.render(renderer);

        // 2. Blur All the mips progressively

        let inputRenderTarget = this.renderTargetBright;

        for (let i = 0; i < this.nMips; i++) {
            this.fsQuad.setMaterial(this.separableBlurMaterials[i]);

            this.separableBlurMaterials[i].uniforms.colorTexture.value
                = inputRenderTarget.texture;
            this.separableBlurMaterials[i].uniforms.direction.value
                = this.blurDirX;
            renderer.setRenderTarget(this.renderTargetsHorizontal[i]);
            renderer.clear();
            this.fsQuad.render(renderer);

            this.separableBlurMaterials[i].uniforms.colorTexture.value
                = this.renderTargetsHorizontal[i].texture;
            this.separableBlurMaterials[i].uniforms.direction.value
                = this.blurDirY;
            renderer.setRenderTarget(this.renderTargetsVertical[i]);
            renderer.clear();
            this.fsQuad.render(renderer);

            inputRenderTarget = this.renderTargetsVertical[i];
        }

        // Composite All the mips

        this.fsQuad.setMaterial(this.compositeMaterial);
        this.compositeMaterial.uniforms.bloomStrength.value = this.strength;
        this.compositeMaterial.uniforms.bloomRadius.value = this.radius;
        this.compositeMaterial.uniforms.bloomTintColors.value
            = this.bloomTintColors;

        renderer.setRenderTarget(this.renderTargetsHorizontal[0]);
        renderer.clear();
        this.fsQuad.render(renderer);

        // Blend it additively over the input texture

        this.fsQuad.setMaterial(this.materialCopy);
        this.copyUniforms.tDiffuse.value
            = this.renderTargetsHorizontal[0].texture;

        if (maskActive) {
            renderer.context.enable(renderer.context.STENCIL_TEST);
        }

        renderer.setRenderTarget(renderToScreen ? null : readBuffer);
        this.fsQuad.render(renderer);

        // Restore renderer settings
        renderer.setClearColor(this.oldClearColor, this.oldClearAlpha);
        renderer.autoClear = oldAutoClear;
    }

    /**
     * Make seperable material
     * @param {number} kernelRadius size
     * @returns {ShaderMaterial} material
     */
    private getSeperableBlurMaterial(kernelRadius) {
        const sm = new ShaderMaterial();

        sm.defines = {
            KERNEL_RADIUS: kernelRadius,
            SIGMA: kernelRadius
        };

        sm.uniforms = {
            colorTexture: {
                value: null
            },
            texSize: {
                value: new Vector2(0.5, 0.5)
            },
            direction: {
                value: new Vector2(0.5, 0.5)
            }
        };

        sm.vertexShader = `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
            }`;

        sm.fragmentShader = `#include <common>

            varying vec2 vUv;
            uniform sampler2D colorTexture;
            uniform vec2 texSize;
            uniform vec2 direction;

            float gaussianPdf(in float x, in float sigma) {
                return 0.39894 * exp( -0.5 * x * x/( sigma * sigma))/sigma;
            }
            void main() {
                vec2 invSize = 1.0 / texSize;
                float fSigma = float(SIGMA);
                float weightSum = gaussianPdf(0.0, fSigma);
                float alphaSum = 0.0;
                vec3 diffuseSum = texture2D( colorTexture, vUv).rgb * weightSum;
                for( int i = 1; i < KERNEL_RADIUS; i ++ ) {
                    float x = float(i);
                    float w = gaussianPdf(x, fSigma);
                    vec2 uvOffset = direction * invSize * x;
                    vec4 sample1 = texture2D( colorTexture, vUv + uvOffset);
                    vec4 sample2 = texture2D( colorTexture, vUv - uvOffset);
                    diffuseSum += (sample1.rgb + sample2.rgb) * w;
                    alphaSum += (sample1.a + sample2.a) * w;
                    weightSum += 2.0 * w;
                }
                gl_FragColor = vec4(diffuseSum/weightSum, alphaSum/weightSum);
            }`;

        return sm;
    }

    /**
     * Make helper material
     * @param {number} nMips MipMaps
     * @returns {ShaderMaterial} material
     */
    private getCompositeMaterial(nMips) {
        const sm = new ShaderMaterial();

        sm.defines = {
            NUM_MIPS: nMips
        };

        sm.uniforms = {
            blurTexture1: {
                value: null
            },
            blurTexture2: {
                value: null
            },
            blurTexture3: {
                value: null
            },
            blurTexture4: {
                value: null
            },
            blurTexture5: {
                value: null
            },
            dirtTexture: {
                value: null
            },
            bloomStrength: {
                value: 1.0
            },
            bloomFactors: {
                value: null
            },
            bloomTintColors: {
                value: null
            },
            bloomRadius: {
                value: 0.0
            }
        };

        sm.vertexShader = `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`;

        sm.fragmentShader = `
varying vec2 vUv;

uniform sampler2D blurTexture1;
uniform sampler2D blurTexture2;
uniform sampler2D blurTexture3;
uniform sampler2D blurTexture4;
uniform sampler2D blurTexture5;
uniform sampler2D dirtTexture;
uniform float bloomStrength;
uniform float bloomRadius;
uniform float bloomFactors[NUM_MIPS];
uniform vec3 bloomTintColors[NUM_MIPS];

float lerpBloomFactor(const in float factor) {
    float mirrorFactor = 1.2 - factor;
    return mix(factor, mirrorFactor, bloomRadius);
}

void main() {
    gl_FragColor = bloomStrength * ( lerpBloomFactor(bloomFactors[0]) * vec4(bloomTintColors[0], 1.0) * texture2D(blurTexture1, vUv) +
    lerpBloomFactor(bloomFactors[1]) * vec4(bloomTintColors[1], 1.0) * texture2D(blurTexture2, vUv) +
    lerpBloomFactor(bloomFactors[2]) * vec4(bloomTintColors[2], 1.0) * texture2D(blurTexture3, vUv) +
    lerpBloomFactor(bloomFactors[3]) * vec4(bloomTintColors[3], 1.0) * texture2D(blurTexture4, vUv) +
    lerpBloomFactor(bloomFactors[4]) * vec4(bloomTintColors[4], 1.0) * texture2D(blurTexture5, vUv) );
}`;

        return sm;
    }

}
