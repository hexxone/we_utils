/**
 * @author alteredq / http://alteredqualia.com/
 *
 * @author hexxone / https://hexx.one
 */

import { Camera } from "three.ts/src/cameras/Camera";
import { Material } from "three.ts/src/materials/Material";
import { Color } from "three.ts/src/math/Color";
import { WebGLRenderer } from "three.ts/src/renderers/WebGLRenderer";
import { WebGLRenderTarget } from "three.ts/src/renderers/WebGLRenderTarget";
import { Scene } from "three.ts/src/scenes/Scene";
import { BasePass } from "./BasePass";

/**
 * Shader Render Helper
 */
export class RenderPass implements BasePass {
	private readonly scene: Scene;
	private readonly camera: Camera;
	private readonly overMat?: Material;

	public clearColor: Color = undefined;
	public clearAlpha: number = undefined;

	public name = "RenderPass";
	public enabled = true;
	public needsSwap = true;

	public clear = true;
	public clearDepth = false;

	/**
	 * Construct helper
	 * @param {Scene} scene Scene
	 * @param {Camera} camera Camera
	 * @param {Material} overMat optional Override material
	 * @param {Color} clearColor Clear color
	 * @param {number} clearAlpha Clear alpha
	 */
	constructor(
		scene: Scene,
		camera: Camera,
		overMat?: Material,
		clearColor?: Color,
		clearAlpha?: number
	) {
		this.scene = scene;
		this.camera = camera;
		this.overMat = overMat;

		this.clearColor = clearColor;
		this.clearAlpha = clearAlpha !== undefined ? clearAlpha : 0;
	}

	/**
	 * precompile shader
	 * @param {WebGLRenderer} renderer Context
	 */
	public prepare(renderer: WebGLRenderer) {
		renderer.compile(this.scene, this.camera);
	}

	/**
	 * Destroy shader
	 */
	public dispose() {
		throw new Error("Method not implemented.");
	}

	/**
	 * Updated screen size
	 * @param {number} width X
	 * @param {number} height Y
	 */
	public setSize(width: number, height: number) {
		return;
	}

	/**
	 * Render Frame
	 * @param {WebGLRenderer} renderer Context
	 * @param {WebGLRenderTarget} writeBuffer Output
	 * @param {WebGLRenderTarget} readBuffer Input
	 * @param {boolean} maskActive filter
	 * @param {boolean} renderToScreen render to canvas OR buffer
	 * @param {Camera} camera (optional)
	 * @public
	 */
	public render(
		renderer: WebGLRenderer,
		writeBuffer: WebGLRenderTarget,
		readBuffer: WebGLRenderTarget,
		maskActive: boolean,
		renderToScreen: boolean
	) {
		const oldAutoClear = renderer.autoClear;
		renderer.autoClear = false;

		this.scene.overrideMaterial = this.overMat;

		let oldClearColor: Color;
		let oldClearAlpha: number;

		if (this.clearColor) {
			renderer.getClearColor(oldClearColor);
			oldClearAlpha = renderer.getClearAlpha();
			renderer.setClearColor(this.clearColor, this.clearAlpha);
		}

		if (this.clearDepth) {
			renderer.clearDepth();
		}

		renderer.setRenderTarget(renderToScreen ? null : writeBuffer);

		// TODO: Avoid using autoClear properties, see https://github.com/mrdoob/three.js/pull/15571#issuecomment-465669600
		if (this.clear)
			renderer.clear(
				renderer.autoClearColor,
				renderer.autoClearDepth,
				renderer.autoClearStencil
			);

		renderer.render(this.scene, this.camera);

		if (this.clearColor) renderer.setClearColor(oldClearColor, oldClearAlpha);

		this.scene.overrideMaterial = null;
		renderer.autoClear = oldAutoClear;
	}
}
