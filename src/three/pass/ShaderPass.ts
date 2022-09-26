/**
 * @author alteredq / http://alteredqualia.com/
 *
 * @author hexxone / https://hexx.one
 */

import {
	ShaderMaterial,
	UniformsUtils,
	Vector2,
	WebGLRenderer,
	WebGLRenderTarget,
} from "three.ts/src/";

import { BaseShader } from "../shader/BaseShader";

import { BasePass } from "./BasePass";
import { FullScreenHelper } from "./FullScreenHelper";

/**
 * ThreeJS Pass for easy full screen shaders
 */
export class ShaderPass implements BasePass {
	name: string;
	enabled = true;
	needsSwap = true;
	clear = false;
	material: ShaderMaterial;
	textureID: string;
	uniforms: any;
	fsQuad: FullScreenHelper;
	iRes: Vector2;

	/**
	 * Make Pass
	 * default Material will enable transparency!
	 * @param {BaseShader} shader Create From
	 * @param {string} textureID Input Uniform Texture name
	 */
	constructor(shader: BaseShader, textureID = "tDiffuse") {
		this.textureID = textureID;

		this.name = shader.shaderID;

		this.uniforms = UniformsUtils.clone(shader.uniforms);

		this.material = new ShaderMaterial();
		this.material.defines = Object.assign({}, shader.defines);
		this.material.uniforms = this.uniforms;
		this.material.vertexShader = shader.vertexShader;
		this.material.fragmentShader = shader.fragmentShader;
		this.material.transparent = true;

		this.fsQuad = new FullScreenHelper(this.material);
	}

	/**
	 * precompile shader
	 * @param {WebGLRenderer} renderer renderer
	 * @returns {void}
	 */
	prepare(renderer: WebGLRenderer): void {
		this.fsQuad.prepare(renderer);
	}

	/**
	 * Destroy Pass
	 * @public
	 * @returns {void}
	 */
	dispose() {
		this.fsQuad.dispose();
	}

	/**
	 * Canvas size update
	 * @param {number} width X
	 * @param {number} height Y
	 * @returns {void}
	 */
	setSize(width: number, height: number) {
		this.iRes = new Vector2(width, height);
	}

	/**
	 * Render frame with chaining-support
	 * @param {WebGLRenderer} renderer renderer
	 * @param {WebGLRenderTarget} writeBuffer wB
	 * @param {WebGLRenderTarget} readBuffer rB
	 * @param {boolean} maskActive mA
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
		if (this.uniforms[this.textureID]) {
			this.uniforms[this.textureID].value = readBuffer.texture;
		}

		if (this.uniforms.iResolution) {
			this.uniforms.iResolution.value = this.iRes;
		}

		this.fsQuad.setMaterial(this.material);

		if (renderToScreen) {
			renderer.setRenderTarget(null);
		} else {
			renderer.setRenderTarget(writeBuffer);
			// TODO: Avoid using autoClear properties, see https://github.com/mrdoob/js/pull/15571#issuecomment-465669600
			if (this.clear)
				renderer.clear(
					renderer.autoClearColor,
					renderer.autoClearDepth,
					renderer.autoClearStencil
				);
		}
		this.fsQuad.render(renderer);
	}
}
