/* eslint-disable @typescript-eslint/consistent-type-definitions */

/* eslint-disable no-unused-vars */

// # General utilities

type EventHandlerNonNull = (event: Event) => void;

type EventHandler = EventHandlerNonNull | null | undefined;

// DOMString is not exactly a string (https://heycam.github.io/webidl/#idl-DOMString).

// (TODO)

type DOMString = string;

// # WebXR

export type XRSessionMode = "inline" | "immersive-vr" | "immersive-ar";

export type XRReferenceSpaceType =
	| "viewer"
	| "local"
	| "local-floor"
	| "bounded-floor"
	| "unbounded";

export type XRVisibilityState = "visible" | "visible-blurred" | "hidden";

export type XREye = "none" | "left" | "right";

export type XRHandedness = "none" | "left" | "right";

export type XRTargetRayMode = "gaze" | "tracked-pointer" | "screen";

export type XRWebGLRenderingContext =
	| WebGLRenderingContext
	| WebGL2RenderingContext;

export interface XRSessionInit {
	requiredFeatures?: XRReferenceSpaceType[]; // sequence<any> (TODO?)

	optionalFeatures?: XRReferenceSpaceType[]; // sequence<any> (TODO?)
}

declare global {
	export class XRRigidTransform {
		constructor(position?: DOMPointInit, orientation?: DOMPointInit);

		readonly position: DOMPointReadOnly;

		readonly orientation: DOMPointReadOnly;

		readonly matrix: Float32Array;

		readonly inverse: XRRigidTransform;
	}

	export interface XRViewport {
		readonly x: number;

		readonly y: number;

		readonly width: number;

		readonly height: number;
	}
}

// ## Events

export interface XRSessionEventInit extends EventInit {
	session: XRSession;
}

export interface XRInputSourceEventInit extends EventInit {
	frame: XRFrame;

	inputSource: XRInputSource;
}

export interface XRInputSourcesChangeEventInit extends EventInit {
	session: XRSession;

	added: XRInputSource[]; // FrozenArray (TODO?)

	removed: XRInputSource[]; // FrozenArray (TODO?)
}

export interface XRReferenceSpaceEventInit extends EventInit {
	referenceSpace: XRReferenceSpace;

	transform?: XRRigidTransform | null;
}

declare global {
	export class XRSessionEvent extends Event {
		constructor(type: DOMString, eventInitDict: XRSessionEventInit);

		readonly session: XRSession;
	}

	export class XRInputSourceEvent extends Event {
		constructor(type: DOMString, eventInitDict: XRInputSourceEventInit);

		readonly frame: XRFrame;

		readonly inputSource: XRInputSource;
	}

	export class XRInputSourcesChangeEvent extends Event {
		constructor(type: DOMString, eventInitDict: XRInputSourcesChangeEventInit);

		readonly session: XRSession;

		readonly added: XRInputSource[]; // FrozenArray (TODO?)

		readonly removed: XRInputSource[]; // FrozenArray (TODO?)
	}

	export class XRReferenceSpaceEvent extends Event {
		constructor(type: DOMString, eventInitDict: XRReferenceSpaceEventInit);

		readonly referenceSpace: XRReferenceSpace;

		readonly transform: XRRigidTransform | null;
	}
}

// ## Permissions

export interface XRPermissionDescriptor extends PermissionDescriptor {
	mode?: XRSessionMode;

	requiredFeatures?: XRReferenceSpaceType[]; // sequence<any> (TODO?)

	optionalFeatures?: XRReferenceSpaceType[]; // sequence<any> (TODO?)
}

declare global {
	export interface XRPermissionStatus extends PermissionStatus {
		granted: []; // FrozenArray (TODO?) ; (TODO) Also is this really `any`?
	}

	// ## Input sources

	export interface XRInputSource {
		readonly handedness: XRHandedness;

		readonly targetRayMode: XRTargetRayMode;

		readonly targetRaySpace: XRSpace;

		readonly gripSpace: XRSpace | null;

		readonly profiles: DOMString[]; // FrozenArray in the doc (TODO?)
	}

	// This is actually a novel data structure which emulates a JS array (e.g. getter + `.length`)

	// but it is not an array (TODO)

	export type XRInputSourceArray = XRInputSource[];

	// ## View

	export interface XRView {
		readonly eye: XREye;

		readonly projectionMatrix: Float32Array;

		readonly transform: XRRigidTransform;
	}

	// ## Spaces

	// eslint-disable-next-line @typescript-eslint/no-empty-interface
	export interface XRSpace extends EventTarget {}

	export interface XRReferenceSpace extends XRSpace {
		getOffsetReferenceSpace(originOffset: XRRigidTransform): XRReferenceSpace;

		onreset: EventHandler;
	}

	export interface XRBoundedReferenceSpace extends XRReferenceSpace {
		readonly boundsGeometry: DOMPointReadOnly[]; // FrozenArray (TODO?)
	}

	// ## Poses

	export interface XRPose {
		readonly transform: XRRigidTransform;

		readonly emulatedPosition: boolean;
	}

	export interface XRViewerPose extends XRPose {
		readonly views: XRView[]; // FrozenArray in the docs (TODO?)
	}

	// ## Frames

	export interface XRFrame {
		readonly session: XRSession;

		getViewerPose(referenceSpace: XRReferenceSpace): XRViewerPose | null;

		getPose(space: XRSpace, baseSpace: XRSpace): XRPose | null;
	}
}

export type XRFrameRequestCallback = (
	time: DOMHighResTimeStamp,

	frame: XRFrame
) => void;

// ## WebGL interop

export interface XRWebGLLayerInit {
	antialias?: boolean;

	depth?: boolean;

	stencil?: boolean;

	alpha?: boolean;

	ignoreDepthValues?: boolean;

	framebufferScaleFactor?: number;
}

declare global {
	export class XRWebGLLayer {
		constructor(
			session: XRSession,

			context: XRWebGLRenderingContext,

			layerInit?: XRWebGLLayerInit
		);

		readonly antialias: boolean;

		readonly ignoreDepthValues: boolean;

		readonly framebuffer?: WebGLFramebuffer;

		readonly framebufferWidth: number;

		readonly framebufferHeight: number;

		getViewport(view: XRView): XRViewport | null;

		static getNativeFramebufferScaleFactor(session: XRSession): number;
	}
}

// ## Session

export interface XRRenderStateInit {
	depthNear?: number;

	depthFar?: number;

	inlineVerticalFieldOfView?: number;

	baseLayer?: XRWebGLLayer | null;
}

declare global {
	export interface XRRenderState {
		readonly depthNear: number;

		readonly depthFar: number;

		readonly inlineVerticalFieldOfView?: number;

		readonly baseLayer?: XRWebGLLayer;
	}

	export interface XRSession extends EventTarget {
		readonly visibilityState: XRVisibilityState;

		readonly renderState: XRRenderState;

		readonly inputSources: XRInputSourceArray;

		// Methods

		updateRenderState(state?: XRRenderStateInit): void;

		requestReferenceSpace(
			type: XRReferenceSpaceType
		): Promise<XRReferenceSpace>;

		requestAnimationFrame(callback: XRFrameRequestCallback): number;

		cancelAnimationFrame(handle: number): void;

		end(): Promise<void>;

		environmentBlendMode: string;

		// Events

		onend: EventHandler;

		oninputsourceschange: EventHandler;

		onselect: EventHandler;

		onselectstart: EventHandler;

		onselectend: EventHandler;

		onsqueeze: EventHandler;

		onsqueezestart: EventHandler;

		onsqueezeend: EventHandler;

		onvisibilitychange: EventHandler;
	}

	// ## System

	export interface XRSystem extends EventTarget {
		isSessionSupported(mode: XRSessionMode): Promise<boolean>;

		requestSession(
			mode: XRSessionMode,

			options?: XRSessionInit
		): Promise<XRSession>;

		ondevicechange: EventHandler;

		addEventListener(
			type: "devicechange",

			listener: EventListenerOrEventListenerObject,

			options?: boolean | AddEventListenerOptions
		): void;
	}

	// ## Updates to existing objects

	interface Navigator {
		/**

		 * Optional because WebXR support is limited across browsers

		 */

		xr?: XRSystem;
	}

	interface GLESRenderingContext {
		/**

		 * Optional because WebXR support is limited across browsers

		 */

		makeXRCompatible?(): Promise<void>;
	}

	interface Window {
		XRRigidTransform?: typeof XRRigidTransform;

		XRWebGLLayer?: typeof XRWebGLLayer;

		XRSessionEvent?: typeof XRSessionEvent;

		XRInputSourceEvent?: typeof XRInputSourceEvent;

		XRInputSourcesChangeEvent?: typeof XRInputSourcesChangeEvent;

		XRReferenceSpaceEvent?: typeof XRReferenceSpaceEvent;
	}
}
