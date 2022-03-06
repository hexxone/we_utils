/**
 * @author alteredq / http://alteredqualia.com/
 *
 * @author hexxone / https://hexx.one
 */

import { BasePass } from "../..";

import {
	Camera,
	Color,
	Material,
	Scene,
	WebGLRenderer,
	WebGLRenderTarget,
} from "../../three.ts/src";

/**
 * Shader Render Helper
 */
export class RenderPass implements BasePass {
	name = "RenderPass";
	enabled = true;
	needsSwap = true;

	clear = true;

	clearColor: Color = null;

	clearAlpha: number = null;
	clearDepth = false;

	scene: Scene = null;
	camera: Camera = null;
	overMat: Material = null;

	/**
	 * Construct helper
	 * @param {Scene} scene Scene
	 * @param {Camera} camera Camera
	 * @param {Material} overMat Override material
	 * @param {Color} clearColor Clear color
	 * @param {number} clearAlpha Clear alpha
	 */
	constructor(
		scene: Scene,
		camera: Camera,
		overMat: Material,
		clearColor?,
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
