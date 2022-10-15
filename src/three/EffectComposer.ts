/**
 * @author alteredq / http://alteredqualia.com/
 *
 * @author hexxone / https://hexx.one
 */

import { PerspectiveCamera } from "../three.ts/src/cameras/PerspectiveCamera";
import { LinearFilter, RGBAFormat } from "../three.ts/src/constants";
import { Quaternion } from "../three.ts/src/math/Quaternion";
import { Vector2 } from "../three.ts/src/math/Vector2";
import { WebGLRenderer } from "../three.ts/src/renderers/WebGLRenderer";
import { WebGLRenderTarget } from "../three.ts/src/renderers/WebGLRenderTarget";
import { Scene } from "../three.ts/src/scenes/Scene";
import { BasePass } from "./pass/BasePass";
import { RenderPass } from "./pass/RenderPass";

/**
 * render shader chain
 * @public
 */
export class EffectComposer {
	// given on construct
	private scene: Scene;
	private camera: PerspectiveCamera;
	private renderer: WebGLRenderer;
	private globalPrecision: string;

	// runtime
	private viewSize: Vector2;
	private previousFrame = Date.now();

	// target & origin buffers
	private defaultTarget: WebGLRenderTarget;

	private renderWrite: WebGLRenderTarget;
	private writeBuffer: WebGLRenderTarget;

	private renderRead: WebGLRenderTarget;
	private readBuffer: WebGLRenderTarget;

	// render passes
	private normPass: RenderPass;
	private xrPass: RenderPass;
	private xrCam = new PerspectiveCamera();

	// public
	public passes: BasePass[] = [];

	/**
	 * Instantiate
	 * @param {Scene} scene Scene
	 * @param {PerspectiveCamera} camera camera
	 * @param {WebGLRenderer} renderer renderer
	 * @param {string} globalPrec global precision
	 * @param {Color} clearCol Color
	 * @param {WebGLRenderTarget} renderTarget target to Reset (optional)
	 */
	constructor(
		scene: Scene,
		camera: PerspectiveCamera,
		renderer: WebGLRenderer,
		globalPrec = "mediump",
		clearCol?: any,
		renderTarget?: WebGLRenderTarget
	) {
		this.scene = scene;
		this.camera = camera;
		this.renderer = renderer;
		this.viewSize = renderer.getSize(new Vector2());

		this.xrCam = new PerspectiveCamera(
			camera.fov,
			camera.aspect,
			camera.near,
			camera.far
		);

		// use a new default render target if none is given
		this.defaultTarget = new WebGLRenderTarget(
			this.viewSize.width,
			this.viewSize.height,
			{
				minFilter: LinearFilter,
				magFilter: LinearFilter,
				format: RGBAFormat,
				stencilBuffer: false,
			}
		);

		this.defaultTarget.texture.name = "EffectComposer.dt";

		if (renderTarget === undefined) {
			renderTarget = this.defaultTarget.clone();
			renderTarget.texture.name = "EffectComposer.rt";
		}

		// set write buffer for shader pass rendering
		this.renderWrite = renderTarget;
		this.writeBuffer = this.renderWrite;

		// set input buffer for shader pass rendering
		this.renderRead = renderTarget.clone();
		this.renderRead.texture.name = "EffectComposer.rr";
		this.readBuffer = this.renderRead;

		this.passes = [];
		this.previousFrame = Date.now();
		this.globalPrecision = globalPrec;

		this.normPass = new RenderPass(scene, camera, null, clearCol);
		this.xrPass = new RenderPass(scene, this.xrCam, null, clearCol); // @TODO == 1
	}

	/**
	 * Precompile all shaders...
	 * @returns {void}
	 */
	public precompile(): void {
		this.renderer.compile(this.scene, this.camera);
		this.passes.forEach((pass) => pass.prepare(this.renderer));
	}

	/**
	 * Append a shader to the chain
	 * @public
	 * @param {BasePass} p Shader to add
	 * @returns {void}
	 */
	public addPass(p: BasePass) {
		p.setSize(this.viewSize.width, this.viewSize.height);
		this.passes.push(p);
	}

	/**
	 * Insert a shader in the chain
	 * @public
	 * @param {BasePass} p Shader to add
	 * @param {number} index position
	 * @returns {void}
	 */
	public insertPass(p: BasePass, index: number) {
		p.setSize(this.viewSize.width, this.viewSize.height);
		this.passes.splice(index, 0, p);
	}

	/**
	 * Update clear color
	 * @param {any} clearCol Color
	 * @returns {void}
	 */
	public setClearColor(clearCol: any) {
		this.normPass.clearColor = clearCol;
		this.xrPass.clearColor = clearCol;
	}

	/**
	 * Checks if the given shader should be rendererd to screen
	 * @param {number} passIndex position
	 * @return {boolean}
	 * @returns {void}
	 */
	private isLastEnabledPass(passIndex: number) {
		for (let i = passIndex + 1; i < this.passes.length; i++) {
			if (this.passes[i].enabled) return false;
		}
		return true;
	}

	/**
	 * Render the shader-chain for 1 frame
	 * @public
	 * @param {number} deltaTime if not given, will calculate its own
	 * @param {XRFrame} frame Currently rendering XR frame?
	 * @returns {void}
	 */
	public render(deltaTime?: number, frame?: XRFrame) {
		// deltaTime value is in seconds
		const dn = performance.now();
		if (deltaTime === undefined) {
			deltaTime = (dn - this.previousFrame) * 0.001;
		}
		this.previousFrame = dn;

		const size = new Vector2();
		this.renderer.getSize(size);
		const currentRenderTarget = this.renderer.getRenderTarget();

		// has enabled passes?
		const hasTargets = this.passes.filter((p) => p.enabled).length > 0;

		// clear surface ?
		if (this.renderer.autoClear) this.renderer.clear();

		// do spilt rendering
		if (this.renderer.xr.isPresenting && frame !== null) {
			this.scene.updateMatrixWorld();
			if (this.camera.parent === null) this.camera.updateMatrixWorld();

			// update cameras
			const pose = frame.getViewerPose(this.renderer.xr.getReferenceSpace());
			const views = pose.views;
			const viewSize = size.width / views.length;

			// base position
			const camPos = this.camera.position.clone();

			// dont use native XR features now
			this.renderer.xr.enabled = false;
			this.renderer.setScissorTest(true);

			// render
			for (let i = 0; i < views.length; i++) {
				const view = views[i];

				// position
				const varPos = view.transform.position;
				this.xrCam.position.set(
					camPos.x + varPos.x,
					camPos.y + (varPos.y - 1.6),
					camPos.z + varPos.z
				);

				// orientation
				const vo = view.transform.orientation;
				this.xrCam.setRotationFromQuaternion(
					new Quaternion(vo.x, vo.y, vo.z, vo.w)
				);

				// matrix
				this.xrCam.projectionMatrix.fromArray(view.projectionMatrix);
				this.xrCam.near = this.camera.near;
				this.xrCam.far = this.camera.far;
				this.xrCam.updateProjectionMatrix();

				// render
				const offX = viewSize * i;
				this.renderer.setScissor(offX, 0, viewSize, size.height);
				this.renderer.setViewport(offX, 0, viewSize, size.height);

				// pass buffers flipped to avoid swap
				this.xrPass.render(
					this.renderer,
					this.readBuffer,
					this.writeBuffer,
					false,
					!hasTargets
				);
				this.passes.forEach((pass, i) => {
					if (!pass.enabled) return;
					pass.setSize(viewSize, size.height);
					pass.render(
						this.renderer,
						this.writeBuffer,
						this.readBuffer,
						false,
						this.isLastEnabledPass(i)
					);
					if (pass.needsSwap) this.swapBuffers();
				});
			}

			// reset features
			this.renderer.setScissorTest(false);
			this.renderer.xr.enabled = true;
		} else {
			// render default

			// TODO really needed?
			// this.camera.rotation.set(0, 0, 0);

			this.renderer.setScissor(0, 0, size.width, size.height);
			this.renderer.setViewport(0, 0, size.width, size.height);
			// pass buffers flipped to avoid swap
			this.normPass.render(
				this.renderer,
				this.readBuffer,
				this.writeBuffer,
				false,
				!hasTargets
			);
			this.passes.forEach((pass, i) => {
				if (!pass.enabled) return;
				pass.setSize(size.width, size.height);
				pass.render(
					this.renderer,
					this.writeBuffer,
					this.readBuffer,
					false,
					this.isLastEnabledPass(i)
				);
				if (pass.needsSwap) this.swapBuffers();
			});
		}

		this.renderer.setRenderTarget(currentRenderTarget);
	}

	/**
	 * Destroy the current shader-chain
	 * @public
	 * @param {WebGLRenderTarget} renderTarget target to Reset (optional)
	 * @returns {void}
	 */
	public reset(renderTarget?: WebGLRenderTarget) {
		if (renderTarget === undefined) {
			renderTarget = this.defaultTarget.clone();
			renderTarget.texture.name = "EffectComposer.wt";
		}

		this.renderWrite.dispose();
		this.renderRead.dispose();

		this.renderWrite = renderTarget;
		this.writeBuffer = this.renderWrite;

		this.renderRead = renderTarget.clone();
		this.renderRead.texture.name = "EffectComposer.rt";
		this.readBuffer = this.renderRead;

		this.passes = [];

		this.setSize(this.viewSize.width, this.viewSize.height);
	}

	/**
	 * Updated buffer size
	 * @public
	 * @param {number} width X
	 * @param {number} height Y
	 * @returns {void}
	 */
	public setSize(width: number, height: number) {
		this.renderWrite.setSize(width, height);
		this.renderRead.setSize(width, height);
		this.passes.forEach((pass) => pass.setSize(width, height));
		this.viewSize.set(width, height);
	}

	/* UTILS */

	/**
	 * Some shaders write to Input rather than Output...
	 *
	 * This is a workaround to pass their data further down the render-chain
	 * @ignore
	 * @returns {void}
	 */
	private swapBuffers() {
		const tmp = this.readBuffer;
		this.readBuffer = this.writeBuffer;
		this.writeBuffer = tmp;
	}
}
