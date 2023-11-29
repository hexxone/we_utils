/**
 * @author alteredq / http://alteredqualia.com/
 *
 * @author hexxone / https://hexx.one
 */

import { Camera } from "three.ts/src/cameras/Camera";
import { OrthographicCamera } from "three.ts/src/cameras/OrthographicCamera";
import { BufferGeometry } from "three.ts/src/core/BufferGeometry";
import { PlaneBufferGeometry } from "three.ts/src/geometries/PlaneGeometry";
import { Material } from "three.ts/src/materials/Material";
import { Mesh } from "three.ts/src/objects/Mesh";
import { WebGLRenderer } from "three.ts/src/renderers/WebGLRenderer";

/**
 * Helper for passes that need to fill the viewport with a single quad.
 * used to render on a PlaneGeometry ("texture")
 * @public
 */
export class FullScreenHelper {
	private readonly _mat: Material;

	public readonly camera: Camera;
	public readonly geometry: BufferGeometry;
	public readonly mesh: Mesh;

	/**
	 * instantiate
	 * @param {Material} material
	 */
	constructor(material: Material) {
		this._mat = material;
		this.camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
		this.geometry = new PlaneBufferGeometry(2, 2);
		this.mesh = new Mesh(this.geometry, material);
	}

	/**
	 * precompile shader
	 * @param {WebGLRenderer} renderer
	 */
	public prepare(renderer: WebGLRenderer) {
		renderer.compile(this.mesh as any, this.camera);
	}

	/**
	 * Change mesh material
	 * @param {Material} mat
	 */
	public setMaterial(mat: Material) {
		this.mesh.material = mat;
	}

	/**
	 * Render the 2D-environment
	 * @param {WebGLRenderer} renderer
	 */
	public render(renderer: WebGLRenderer) {
		renderer.render(this.mesh, this.camera);
	}

	/**
	 * Destroy 2D-environment
	 */
	public dispose() {
		this.camera.clear();
		this.mesh.clear();
		this.geometry.dispose();
	}
}
