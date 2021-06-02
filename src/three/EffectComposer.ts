/**
* @author alteredq / http://alteredqualia.com/
*
* @author hexxone / https://hexx.one
*/

import {LinearFilter, PerspectiveCamera, Quaternion, RGBAFormat, Scene, Vector2, WebGLRenderer, WebGLRenderTarget, XRFrame} from 'three';
import {BasePass} from './pass/BasePass';
import {RenderPass} from './pass/RenderPass';
import {ShaderPass} from './pass/ShaderPass';

const defaultParams = {
	minFilter: LinearFilter,
	magFilter: LinearFilter,
	format: RGBAFormat,
	stencilBuffer: false,
};

/**
* render shader chain
* @public
*/
export class EffectComposer {
	private scene: Scene;
	private camera: PerspectiveCamera;
	private renderer: WebGLRenderer;

	private varCam = new PerspectiveCamera();

	private viewSize: Vector2;

	private globalPrecision: string;

	private _previousFrameTime = Date.now();

	private defaultTarget: WebGLRenderTarget;

	private renderWrite: WebGLRenderTarget;
	private writeBuffer: WebGLRenderTarget;

	private renderRead: WebGLRenderTarget;
	private readBuffer: WebGLRenderTarget;

	private normPass: RenderPass;
	private xrPass: RenderPass;

	// render by default
	public enabled: boolean = true;
	public passes: BasePass[] = [];


	/**
	* Instantiate
	* @param {Scene} scene
	* @param {PerspectiveCamera} camera
	* @param {WebGLRenderer} renderer
	* @param {string} globalPrec
	* @param {WebGLRenderTarget} renderTarget
	*/
	constructor(scene: Scene, camera: PerspectiveCamera, renderer: WebGLRenderer, globalPrec: string = 'mediump', renderTarget?: WebGLRenderTarget) {
		this.scene = scene;
		this.camera = camera;
		this.renderer = renderer;
		this.viewSize = renderer.getSize(new Vector2());

		this.varCam = new PerspectiveCamera(camera.fov, camera.aspect, camera.near, camera.far);

		// use a new default render target if none is given
		this.defaultTarget = new WebGLRenderTarget(this.viewSize.width, this.viewSize.height, defaultParams);
		this.defaultTarget.texture.name = 'EffectComposer.dt';

		if (renderTarget === undefined) {
			renderTarget = this.defaultTarget.clone();
			renderTarget.texture.name = 'EffectComposer.wt';
		}

		// set write buffer for shader pass rendering
		this.renderWrite = renderTarget;
		this.writeBuffer = this.renderWrite;

		// set input buffer for shader pass rendering
		this.renderRead = renderTarget.clone();
		this.renderRead.texture.name = 'EffectComposer.rt';
		this.readBuffer = this.renderRead;

		this.passes = [];
		this._previousFrameTime = Date.now();
		this.globalPrecision = globalPrec;

		this.normPass = new RenderPass(scene, camera, null, 0x000000, 1);
		this.xrPass = new RenderPass(scene, this.varCam, null, 0x000000, 1);
	}

	/**
	* Append a shader to the chain
	* @public
	* @param {BasePass} pass Shader to add
	*/
	public addPass(pass: BasePass) {
		const p = this.wrapPrecision(pass);
		p.setSize(this.viewSize.width, this.viewSize.height);
		this.passes.push(p);
	}

	/**
	* Insert a shader in the chain
	* @public
	* @param {BasePass} pass Shader to add
	* @param {number} index position
	*/
	public insertPass(pass: BasePass, index: number) {
		const p = this.wrapPrecision(pass);
		p.setSize(this.viewSize.width, this.viewSize.height);
		this.passes.splice(index, 0, p);
	}

	/**
	* Checks if the given shader should be rendererd to screen
	* @param {number} passIndex position
	* @return {boolean}
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
	*/
	public render(deltaTime?: number, frame?: XRFrame) {
		// deltaTime value is in seconds
		const dn = performance.now();
		if (deltaTime === undefined) {
			deltaTime = (dn - this._previousFrameTime) * 0.001;
		}
		this._previousFrameTime = dn;
		const size = new Vector2();
		this.renderer.getSize( size );
		const currentRenderTarget = this.renderer.getRenderTarget();
		// has enabled passes?
		const hasTargets = this.passes.filter((p) => p.enabled).length > 0;

		// clear surface ?
		if ( this.renderer.autoClear ) this.renderer.clear();

		// do spilt rendering
		if (this.renderer.xr.isPresenting && frame !== null) {
			this.scene.updateMatrixWorld();
			if ( this.camera.parent === null ) this.camera.updateMatrixWorld();

			// update cameras
			const pose = frame.getViewerPose(this.renderer.xr.getReferenceSpace());
			const views = pose.views;
			const viewSize = size.width / views.length;

			// base position
			const camPos = this.camera.position.clone();

			// dont use native XR features now
			this.renderer.xr.enabled = false;
			this.renderer.setScissorTest( true );

			// render
			for (let i = 0; i < views.length; i++) {
				const view = views[i];

				// position
				const varPos = view.transform.position;
				this.varCam.position.set(camPos.x + varPos.x,
					camPos.y + (varPos.y - 1.6),
					camPos.z + varPos.z);

				// orientation
				const vo = view.transform.orientation;
				this.varCam.setRotationFromQuaternion(new Quaternion(vo.x, vo.y, vo.z, vo.w));

				// matrix
				this.varCam.projectionMatrix.fromArray(view.projectionMatrix);
				this.varCam.near = this.camera.near;

				// render
				const offX = viewSize * i;
				this.renderer.setScissor( offX, 0, viewSize, size.height );
				this.renderer.setViewport( offX, 0, viewSize, size.height );

				// pass buffers flipped to avoid swap
				this.xrPass.render(this.renderer, this.readBuffer, this.writeBuffer, false, !hasTargets);
				this.passes.forEach((pass, i) => {
					if (!pass.enabled) return;
					pass.setSize(viewSize, size.height);
					pass.render(this.renderer, this.writeBuffer, this.readBuffer, false, this.isLastEnabledPass(i));
					if (pass.needsSwap) this.swapBuffers();
				});
			}

			// reset features
			this.renderer.setScissorTest( false );
			this.renderer.xr.enabled = true;
		} else {
			// render default
			this.camera.rotation.set(0, 0, 0);
			this.renderer.setScissor( 0, 0, size.width, size.height );
			this.renderer.setViewport( 0, 0, size.width, size.height );
			// pass buffers flipped to avoid swap
			this.normPass.render(this.renderer, this.readBuffer, this.writeBuffer, false, !hasTargets);
			this.passes.forEach((pass, i) => {
				if (!pass.enabled) return;
				pass.setSize(size.width, size.height);
				pass.render(this.renderer, this.writeBuffer, this.readBuffer, false, this.isLastEnabledPass(i));
				if (pass.needsSwap) this.swapBuffers();
			});
		}

		this.renderer.setRenderTarget(currentRenderTarget);
	}

	/**
	* Destroy the current shader-chain
	* @public
	* @param {WebGLRenderTarget} renderTarget target to Reset (optional)
	*/
	public reset(renderTarget?: WebGLRenderTarget) {
		if (renderTarget === undefined) {
			renderTarget = this.defaultTarget.clone();
			renderTarget.texture.name = 'EffectComposer.wt';
		}

		this.renderWrite.dispose();
		this.renderRead.dispose();

		this.renderWrite = renderTarget;
		this.writeBuffer = this.renderWrite;

		this.renderRead = renderTarget.clone();
		this.renderRead.texture.name = 'EffectComposer.rt';
		this.readBuffer = this.renderRead;

		this.passes = [];

		this.setSize(this.viewSize.width, this.viewSize.height);
	}

	/**
	* Updated buffer size
	* @public
	* @param {number} width X
	* @param {number} height Y
	*/
	public setSize(width: number, height: number) {
		this.renderWrite.setSize(width, height);
		this.renderRead.setSize(width, height);
		this.passes.forEach((pass) => pass.setSize(width, height));
		this.viewSize.set(width, height);
	}

	/* UTILS */

	/**
	* Prefixes custom WebGL-precision to shaders
	*
	* @param {BasePass} pass Shader to Wrap
	* @return {BasePass}
	* @ignore
	*/
	private wrapPrecision(pass: BasePass): BasePass {
		if (pass instanceof ShaderPass) {
			const copy = pass as ShaderPass;
			// get prefix
			let pre = 'precision ' + this.globalPrecision + ' float;\r\n    ' +
			'precision ' + this.globalPrecision + ' int;\r\n    ';
			// "medium" sampler precision should always be available for "high" float precision.
			if (this.globalPrecision == 'highp') {
				pre += 'precision mediump sampler2D;\r\n    ' +
				'precision mediump samplerCube;\r\n    ';
			}
			// apply it
			if (copy.material.vertexShader) {
				copy.material.vertexShader = pre + copy.material.vertexShader;
			}
			if (copy.material.fragmentShader) {
				copy.material.fragmentShader = pre + copy.material.fragmentShader;
			}
		}
		return pass;
	}

	/**
	* Some shaders write to Input rather than Output...
	*
	* This is a workaround to pass their data further down the render-chain
	* @ignore
	*/
	private swapBuffers() {
		const tmp = this.readBuffer;
		this.readBuffer = this.writeBuffer;
		this.writeBuffer = tmp;
	}
}
