import {WebGLRenderer} from 'three';

/**
* @author alteredq / http://alteredqualia.com/
* @author hexxone / https://hexx.one
*
* Basic shader pass interface
* @public
*/
export interface BasePass {
	// child name
	name: string;

	// if set to true, the pass is rendered in the chain.
	// otherwise => ignored
	enabled: boolean; // = true;

	// if set to true, the pass indicates to swap read and write buffer after rendering
	needsSwap: boolean; // = true;

	// if set to true, the pass clears its buffer before rendering
	clear: boolean; // = false;

	prepare(renderer: WebGLRenderer);

	dispose();

	setSize(width: number, height: number);

	render(renderer: THREE.WebGLRenderer, writeBuffer: THREE.WebGLRenderTarget, readBuffer: THREE.WebGLRenderTarget, maskActive: boolean, renderToScreen: boolean);
}
