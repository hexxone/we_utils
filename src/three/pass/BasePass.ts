/**
 * @author alteredq / http://alteredqualia.com/
 * @author hexxone / https://hexx.one
 *
 * Basic shader pass interface
 */

import type { Vector2 } from 'three.ts/src/math/Vector2';
import { WebGLRenderer } from 'three.ts/src/renderers/WebGLRenderer';
import { WebGLRenderTarget } from 'three.ts/src/renderers/WebGLRenderTarget';

export type BasePass = {
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

    /** Passes with size-only setup expose the viewport they are already configured for. */
    readonly viewportSize?: Readonly<Vector2>;

    setSize(width: number, height: number);

    render(
        renderer: WebGLRenderer,
        writeBuffer: WebGLRenderTarget,
        readBuffer: WebGLRenderTarget,
        maskActive: boolean,
        renderToScreen: boolean
    );
};
