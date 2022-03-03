/* eslint-disable @typescript-eslint/consistent-type-definitions */
/* eslint-disable @typescript-eslint/no-empty-interface */
/* eslint-disable no-unused-vars */
/**
 * Interface for GL-ES3 Typization
 * (yet to be implemented in ts-spec)
 */

interface GLESObject {}

interface GLESActiveInfo {
	readonly name: string;
	readonly size: number;
	readonly type: number;
}

interface GLESBuffer extends GLESObject {}

interface GLESFramebuffer extends GLESObject {}

interface GLESProgram extends GLESObject {}

interface GLESRenderbuffer extends GLESObject {}

interface GLESShader extends GLESObject {}

interface GLESShaderPrecisionFormat {
	readonly precision: number;
	readonly rangeMax: number;
	readonly rangeMin: number;
}

interface GLESTexture extends GLESObject {}

interface GLESUniformLocation {}

declare interface GLESRenderingContext extends WebGL2RenderingContext {
	activeTexture(texture: number): void;
	attachShader(program: GLESProgram | null, shader: GLESShader | null): void;
	bindAttribLocation(
		program: GLESProgram | null,
		index: number,
		name: string
	): void;
	bindBuffer(target: number, buffer: GLESBuffer | null): void;
	bindFramebuffer(target: number, framebuffer: GLESFramebuffer | null): void;
	bindRenderbuffer(target: number, renderbuffer: GLESRenderbuffer | null): void;
	bindTexture(target: number, texture: GLESTexture | null): void;
	blendColor(red: number, green: number, blue: number, alpha: number): void;
	blendEquation(mode: number): void;
	blendEquationSeparate(modeRGB: number, modeAlpha: number): void;
	blendFunc(sfactor: number, dfactor: number): void;
	blendFuncSeparate(
		srcRGB: number,
		dstRGB: number,
		srcAlpha: number,
		dstAlpha: number
	): void;
	bufferData(
		target: number,
		size: number | ArrayBufferView | ArrayBuffer,
		usage: number
	): void;
	bufferSubData(
		target: number,
		offset: number,
		data: ArrayBufferView | ArrayBuffer
	): void;
	checkFramebufferStatus(target: number): number;
	clear(mask: number): void;
	clearColor(red: number, green: number, blue: number, alpha: number): void;
	clearDepthf(depth: number): void;
	clearStencil(s: number): void;
	colorMask(red: boolean, green: boolean, blue: boolean, alpha: boolean): void;
	compileShader(shader: GLESShader | null): void;
	// compressedTexImage2D(target: number, level: number, internalformat: number, width: number, height: number, border: number, data: ArrayBufferView | ArrayBuffer): void;
	// compressedTexSubImage2D(target: number, level: number, xoffset: number, yoffset: number, width: number, height: number, format: number, data: ArrayBufferView | ArrayBuffer): void;
	copyTexImage2D(
		target: number,
		level: number,
		internalformat: number,
		x: number,
		y: number,
		width: number,
		height: number,
		border: number
	): void;
	copyTexSubImage2D(
		target: number,
		level: number,
		xoffset: number,
		yoffset: number,
		x: number,
		y: number,
		width: number,
		height: number
	): void;
	createBuffer(): GLESBuffer | null;
	createFramebuffer(): GLESFramebuffer | null;
	createProgram(): GLESProgram | null;
	createRenderbuffer(): GLESRenderbuffer | null;
	createShader(type: number): GLESShader | null;
	createTexture(): GLESTexture | null;
	cullFace(mode: number): void;
	deleteBuffer(buffer: GLESBuffer | null): void;
	deleteFramebuffer(framebuffer: GLESFramebuffer | null): void;
	deleteProgram(program: GLESProgram | null): void;
	deleteRenderbuffer(renderbuffer: GLESRenderbuffer | null): void;
	deleteShader(shader: GLESShader | null): void;
	deleteTexture(texture: GLESTexture | null): void;
	depthFunc(func: number): void;
	depthMask(flag: boolean): void;
	depthRangef(zNear: number, zFar: number): void;
	detachShader(program: GLESProgram | null, shader: GLESShader | null): void;
	disable(cap: number): void;
	disableVertexAttribArray(index: number): void;
	drawArrays(mode: number, first: number, count: number): void;
	drawElements(mode: number, count: number, type: number, offset: number): void;
	enable(cap: number): void;
	enableVertexAttribArray(index: number): void;
	finish(): void;
	flush(): void;
	framebufferRenderbuffer(
		target: number,
		attachment: number,
		renderbuffertarget: number,
		renderbuffer: GLESRenderbuffer | null
	): void;
	framebufferTexture2D(
		target: number,
		attachment: number,
		textarget: number,
		texture: GLESTexture | null,
		level: number
	): void;
	frontFace(mode: number): void;
	generateMipmap(target: number): void;
	getActiveAttrib(
		program: GLESProgram | null,
		index: number
	): GLESActiveInfo | null;
	getActiveUniform(
		program: GLESProgram | null,
		index: number
	): GLESActiveInfo | null;
	getAttachedShaders(program: GLESProgram | null): GLESShader[] | null;
	getAttribLocation(program: GLESProgram | null, name: string): number;
	getBooleanv(pname: number): boolean;
	getBufferParameteriv(target: number, pname: number): number;
	getError(): number;
	getFloatv(pname: number): number;
	getFramebufferAttachmentParameteriv(
		target: number,
		attachment: number,
		pname: number
	): number;
	getIntegerv(pname: number): number;
	getProgramiv(program: GLESProgram, pname: number): number;
	getProgramInfoLog(program: GLESProgram | null): string | null;
	getRenderbufferParameteriv(
		program: GLESProgram | null,
		pname: number
	): number;
	getShaderiv(shader: GLESShader, pname: number): number;
	getShaderInfoLog(shader: GLESShader | null): string | null;
	getShaderPrecisionFormat(
		shadertype: number,
		precisiontype: number
	): GLESShaderPrecisionFormat | null;
	getShaderSource(shader: GLESShader | null): string | null;
	getString(name: number): string;
	getTexParameterfv(target: number, pname: number): number;
	getTexParameteriv(target: number, pname: number): number;
	getUniformfv(
		program: GLESProgram | null,
		location: GLESUniformLocation | null
	): number;
	getUniformiv(
		program: GLESProgram | null,
		location: GLESUniformLocation | null
	): number;
	getUniformLocation(
		program: GLESProgram | null,
		name: string
	): GLESUniformLocation | null;
	getVertexAttribfv(index: number, pname: number): number;
	getVertexAttribiv(index: number, pname: number): number;
	getVertexAttribPointerv(index: number, pname: number): number;
	hint(target: number, mode: number): void;
	isBuffer(buffer: GLESBuffer | null): boolean;
	isEnabled(cap: number): boolean;
	isFramebuffer(framebuffer: GLESFramebuffer | null): boolean;
	isProgram(program: GLESProgram | null): boolean;
	isRenderbuffer(renderbuffer: GLESRenderbuffer | null): boolean;
	isShader(shader: GLESShader | null): boolean;
	isTexture(texture: GLESTexture | null): boolean;
	lineWidth(width: number): void;
	linkProgram(program: GLESProgram | null): void;
	pixelStorei(pname: number, param: number | boolean): void;
	polygonOffset(factor: number, units: number): void;
	// readPixels(x: number, y: number, width: number, height: number, format: number, type: number, pixels: ArrayBufferView | null): void;
	releaseShaderCompiler(): void;
	renderbufferStorage(
		target: number,
		internalformat: number,
		width: number,
		height: number
	): void;
	sampleCoverage(value: number, invert: boolean): void;
	scissor(x: number, y: number, width: number, height: number): void;
	shaderBinary(
		shader: GLESShader,
		binaryformat: number,
		bin: ArrayBuffer | ArrayBufferView
	): void;
	shaderSource(shader: GLESShader | null, source: string): void;
	stencilFunc(func: number, ref: number, mask: number): void;
	stencilFuncSeparate(
		face: number,
		func: number,
		ref: number,
		mask: number
	): void;
	stencilMask(mask: number): void;
	stencilMaskSeparate(face: number, mask: number): void;
	stencilOp(fail: number, zfail: number, zpass: number): void;
	stencilOpSeparate(
		face: number,
		fail: number,
		zfail: number,
		zpass: number
	): void;
	// texImage2D(target: number, level: number, internalformat: number, width: number, height: number, border: number, format: number, type: number, pixels: ArrayBufferView | null): void;
	texParameterf(target: number, pname: number, param: number): void;
	texParameterfv(target: number, pname: number, params: Float32Array): void;
	texParameteri(target: number, pname: number, param: number): void;
	texParameteriv(target: number, pname: number, params: Int32Array): void;
	// texSubImage2D(target: number, level: number, xoffset: number, yoffset: number, width: number, height: number, format: number, type: number, pixels: ArrayBufferView | null): void;
	uniform1f(location: GLESUniformLocation | null, x: number): void;
	uniform1fv(location: GLESUniformLocation, v: Float32Array): void;
	uniform1i(location: GLESUniformLocation | null, x: number): void;
	uniform1iv(location: GLESUniformLocation, v: Int32Array): void;
	uniform2f(location: GLESUniformLocation | null, x: number, y: number): void;
	uniform2fv(location: GLESUniformLocation, v: Float32Array): void;
	uniform2i(location: GLESUniformLocation | null, x: number, y: number): void;
	uniform2iv(location: GLESUniformLocation, v: Int32Array): void;
	uniform3f(
		location: GLESUniformLocation | null,
		x: number,
		y: number,
		z: number
	): void;
	uniform3fv(location: GLESUniformLocation, v: Float32Array): void;
	uniform3i(
		location: GLESUniformLocation | null,
		x: number,
		y: number,
		z: number
	): void;
	uniform3iv(location: GLESUniformLocation, v: Int32Array): void;
	uniform4f(
		location: GLESUniformLocation | null,
		x: number,
		y: number,
		z: number,
		w: number
	): void;
	uniform4fv(location: GLESUniformLocation, v: Float32Array): void;
	uniform4i(
		location: GLESUniformLocation | null,
		x: number,
		y: number,
		z: number,
		w: number
	): void;
	uniform4iv(location: GLESUniformLocation, v: Int32Array): void;
	uniformMatrix2fv(
		location: GLESUniformLocation,
		transpose: boolean,
		value: Float32Array
	): void;
	uniformMatrix3fv(
		location: GLESUniformLocation,
		transpose: boolean,
		value: Float32Array
	): void;
	uniformMatrix4fv(
		location: GLESUniformLocation,
		transpose: boolean,
		value: Float32Array
	): void;
	useProgram(program: GLESProgram | null): void;
	validateProgram(program: GLESProgram | null): void;
	vertexAttrib1f(indx: number, x: number): void;
	vertexAttrib1fv(indx: number, values: Float32Array): void;
	vertexAttrib2f(indx: number, x: number, y: number): void;
	vertexAttrib2fv(indx: number, values: Float32Array): void;
	vertexAttrib3f(indx: number, x: number, y: number, z: number): void;
	vertexAttrib3fv(indx: number, values: Float32Array): void;
	vertexAttrib4f(
		indx: number,
		x: number,
		y: number,
		z: number,
		w: number
	): void;
	vertexAttrib4fv(indx: number, values: Float32Array): void;
	vertexAttribPointer(
		indx: number,
		size: number,
		type: number,
		normalized: boolean,
		stride: number,
		offset: number
	): void;
	viewport(x: number, y: number, width: number, height: number): void;

	readonly DEPTH_BUFFER_BIT: number;
	readonly STENCIL_BUFFER_BIT: number;
	readonly COLOR_BUFFER_BIT: number;
	readonly FALSE: number;
	readonly TRUE: number;
	readonly POINTS: number;
	readonly LINES: number;
	readonly LINE_LOOP: number;
	readonly LINE_STRIP: number;
	readonly TRIANGLES: number;
	readonly TRIANGLE_STRIP: number;
	readonly TRIANGLE_FAN: number;
	readonly ZERO: number;
	readonly ONE: number;
	readonly SRC_COLOR: number;
	readonly ONE_MINUS_SRC_COLOR: number;
	readonly SRC_ALPHA: number;
	readonly ONE_MINUS_SRC_ALPHA: number;
	readonly DST_ALPHA: number;
	readonly ONE_MINUS_DST_ALPHA: number;
	readonly DST_COLOR: number;
	readonly ONE_MINUS_DST_COLOR: number;
	readonly SRC_ALPHA_SATURATE: number;
	readonly FUNC_ADD: number;
	readonly BLEND_EQUATION: number;
	readonly BLEND_EQUATION_RGB: number;
	readonly BLEND_EQUATION_ALPHA: number;
	readonly FUNC_SUBTRACT: number;
	readonly FUNC_REVERSE_SUBTRACT: number;
	readonly BLEND_DST_RGB: number;
	readonly BLEND_SRC_RGB: number;
	readonly BLEND_DST_ALPHA: number;
	readonly BLEND_SRC_ALPHA: number;
	readonly CONSTANT_COLOR: number;
	readonly ONE_MINUS_CONSTANT_COLOR: number;
	readonly CONSTANT_ALPHA: number;
	readonly ONE_MINUS_CONSTANT_ALPHA: number;
	readonly BLEND_COLOR: number;
	readonly ARRAY_BUFFER: number;
	readonly ELEMENT_ARRAY_BUFFER: number;
	readonly ARRAY_BUFFER_BINDING: number;
	readonly ELEMENT_ARRAY_BUFFER_BINDING: number;
	readonly STREAM_DRAW: number;
	readonly STATIC_DRAW: number;
	readonly DYNAMIC_DRAW: number;
	readonly BUFFER_SIZE: number;
	readonly BUFFER_USAGE: number;
	readonly CURRENT_VERTEX_ATTRIB: number;
	readonly FRONT: number;
	readonly BACK: number;
	readonly FRONT_AND_BACK: number;
	readonly TEXTURE_2D: number;
	readonly CULL_FACE: number;
	readonly BLEND: number;
	readonly DITHER: number;
	readonly STENCIL_TEST: number;
	readonly DEPTH_TEST: number;
	readonly SCISSOR_TEST: number;
	readonly POLYGON_OFFSET_FILL: number;
	readonly SAMPLE_ALPHA_TO_COVERAGE: number;
	readonly SAMPLE_COVERAGE: number;
	readonly NO_ERROR: number;
	readonly INVALID_ENUM: number;
	readonly INVALID_VALUE: number;
	readonly INVALID_OPERATION: number;
	readonly OUT_OF_MEMORY: number;
	readonly CW: number;
	readonly CCW: number;
	readonly LINE_WIDTH: number;
	readonly ALIASED_POINT_SIZE_RANGE: number;
	readonly ALIASED_LINE_WIDTH_RANGE: number;
	readonly CULL_FACE_MODE: number;
	readonly FRONT_FACE: number;
	readonly DEPTH_RANGE: number;
	readonly DEPTH_WRITEMASK: number;
	readonly DEPTH_CLEAR_VALUE: number;
	readonly DEPTH_FUNC: number;
	readonly STENCIL_CLEAR_VALUE: number;
	readonly STENCIL_FUNC: number;
	readonly STENCIL_FAIL: number;
	readonly STENCIL_PASS_DEPTH_FAIL: number;
	readonly STENCIL_PASS_DEPTH_PASS: number;
	readonly STENCIL_REF: number;
	readonly STENCIL_VALUE_MASK: number;
	readonly STENCIL_WRITEMASK: number;
	readonly STENCIL_BACK_FUNC: number;
	readonly STENCIL_BACK_FAIL: number;
	readonly STENCIL_BACK_PASS_DEPTH_FAIL: number;
	readonly STENCIL_BACK_PASS_DEPTH_PASS: number;
	readonly STENCIL_BACK_REF: number;
	readonly STENCIL_BACK_VALUE_MASK: number;
	readonly STENCIL_BACK_WRITEMASK: number;
	readonly VIEWPORT: number;
	readonly SCISSOR_BOX: number;
	readonly COLOR_CLEAR_VALUE: number;
	readonly COLOR_WRITEMASK: number;
	readonly UNPACK_ALIGNMENT: number;
	readonly PACK_ALIGNMENT: number;
	readonly MAX_TEXTURE_SIZE: number;
	readonly MAX_VIEWPORT_DIMS: number;
	readonly SUBPIXEL_BITS: number;
	readonly RED_BITS: number;
	readonly GREEN_BITS: number;
	readonly BLUE_BITS: number;
	readonly ALPHA_BITS: number;
	readonly DEPTH_BITS: number;
	readonly STENCIL_BITS: number;
	readonly POLYGON_OFFSET_UNITS: number;
	readonly POLYGON_OFFSET_FACTOR: number;
	readonly TEXTURE_BINDING_2D: number;
	readonly SAMPLE_BUFFERS: number;
	readonly SAMPLES: number;
	readonly SAMPLE_COVERAGE_VALUE: number;
	readonly SAMPLE_COVERAGE_INVERT: number;
	readonly NUM_COMPRESSED_TEXTURE_FORMATS: number;
	readonly COMPRESSED_TEXTURE_FORMATS: number;
	readonly DONT_CARE: number;
	readonly FASTEST: number;
	readonly NICEST: number;
	readonly GENERATE_MIPMAP_HINT: number;
	readonly BYTE: number;
	readonly UNSIGNED_BYTE: number;
	readonly SHORT: number;
	readonly UNSIGNED_SHORT: number;
	readonly INT: number;
	readonly UNSIGNED_INT: number;
	readonly FLOAT: number;
	readonly FIXED: number;
	readonly DEPTH_COMPONENT: number;
	readonly ALPHA: number;
	readonly RGB: number;
	readonly RGBA: number;
	readonly LUMINANCE: number;
	readonly LUMINANCE_ALPHA: number;
	readonly UNSIGNED_SHORT_4_4_4_4: number;
	readonly UNSIGNED_SHORT_5_5_5_1: number;
	readonly UNSIGNED_SHORT_5_6_5: number;
	readonly FRAGMENT_SHADER: number;
	readonly VERTEX_SHADER: number;
	readonly MAX_VERTEX_ATTRIBS: number;
	readonly MAX_VERTEX_UNIFORM_VECTORS: number;
	readonly MAX_VARYING_VECTORS: number;
	readonly MAX_COMBINED_TEXTURE_IMAGE_UNITS: number;
	readonly MAX_VERTEX_TEXTURE_IMAGE_UNITS: number;
	readonly MAX_TEXTURE_IMAGE_UNITS: number;
	readonly MAX_FRAGMENT_UNIFORM_VECTORS: number;
	readonly SHADER_TYPE: number;
	readonly DELETE_STATUS: number;
	readonly LINK_STATUS: number;
	readonly VALIDATE_STATUS: number;
	readonly ATTACHED_SHADERS: number;
	readonly ACTIVE_UNIFORMS: number;
	readonly ACTIVE_UNIFORM_MAX_LENGTH: number;
	readonly ACTIVE_ATTRIBUTES: number;
	readonly ACTIVE_ATTRIBUTE_MAX_LENGTH: number;
	readonly SHADING_LANGUAGE_VERSION: number;
	readonly CURRENT_PROGRAM: number;
	readonly NEVER: number;
	readonly LESS: number;
	readonly EQUAL: number;
	readonly LEQUAL: number;
	readonly GREATER: number;
	readonly NOTEQUAL: number;
	readonly GEQUAL: number;
	readonly ALWAYS: number;
	readonly KEEP: number;
	readonly REPLACE: number;
	readonly INCR: number;
	readonly DECR: number;
	readonly INVERT: number;
	readonly INCR_WRAP: number;
	readonly DECR_WRAP: number;
	readonly VENDOR: number;
	readonly RENDERER: number;
	readonly VERSION: number;
	readonly EXTENSIONS: number;
	readonly NEAREST: number;
	readonly LINEAR: number;
	readonly NEAREST_MIPMAP_NEAREST: number;
	readonly LINEAR_MIPMAP_NEAREST: number;
	readonly NEAREST_MIPMAP_LINEAR: number;
	readonly LINEAR_MIPMAP_LINEAR: number;
	readonly TEXTURE_MAG_FILTER: number;
	readonly TEXTURE_MIN_FILTER: number;
	readonly TEXTURE_WRAP_S: number;
	readonly TEXTURE_WRAP_T: number;
	readonly TEXTURE: number;
	readonly TEXTURE_CUBE_MAP: number;
	readonly TEXTURE_BINDING_CUBE_MAP: number;
	readonly TEXTURE_CUBE_MAP_POSITIVE_X: number;
	readonly TEXTURE_CUBE_MAP_NEGATIVE_X: number;
	readonly TEXTURE_CUBE_MAP_POSITIVE_Y: number;
	readonly TEXTURE_CUBE_MAP_NEGATIVE_Y: number;
	readonly TEXTURE_CUBE_MAP_POSITIVE_Z: number;
	readonly TEXTURE_CUBE_MAP_NEGATIVE_Z: number;
	readonly MAX_CUBE_MAP_TEXTURE_SIZE: number;
	readonly TEXTURE0: number;
	readonly TEXTURE1: number;
	readonly TEXTURE2: number;
	readonly TEXTURE3: number;
	readonly TEXTURE4: number;
	readonly TEXTURE5: number;
	readonly TEXTURE6: number;
	readonly TEXTURE7: number;
	readonly TEXTURE8: number;
	readonly TEXTURE9: number;
	readonly TEXTURE10: number;
	readonly TEXTURE11: number;
	readonly TEXTURE12: number;
	readonly TEXTURE13: number;
	readonly TEXTURE14: number;
	readonly TEXTURE15: number;
	readonly TEXTURE16: number;
	readonly TEXTURE17: number;
	readonly TEXTURE18: number;
	readonly TEXTURE19: number;
	readonly TEXTURE20: number;
	readonly TEXTURE21: number;
	readonly TEXTURE22: number;
	readonly TEXTURE23: number;
	readonly TEXTURE24: number;
	readonly TEXTURE25: number;
	readonly TEXTURE26: number;
	readonly TEXTURE27: number;
	readonly TEXTURE28: number;
	readonly TEXTURE29: number;
	readonly TEXTURE30: number;
	readonly TEXTURE31: number;
	readonly ACTIVE_TEXTURE: number;
	readonly REPEAT: number;
	readonly CLAMP_TO_EDGE: number;
	readonly MIRRORED_REPEAT: number;
	readonly FLOAT_VEC2: number;
	readonly FLOAT_VEC3: number;
	readonly FLOAT_VEC4: number;
	readonly INT_VEC2: number;
	readonly INT_VEC3: number;
	readonly INT_VEC4: number;
	readonly BOOL: number;
	readonly BOOL_VEC2: number;
	readonly BOOL_VEC3: number;
	readonly BOOL_VEC4: number;
	readonly FLOAT_MAT2: number;
	readonly FLOAT_MAT3: number;
	readonly FLOAT_MAT4: number;
	readonly SAMPLER_2D: number;
	readonly SAMPLER_CUBE: number;
	readonly VERTEX_ATTRIB_ARRAY_ENABLED: number;
	readonly VERTEX_ATTRIB_ARRAY_SIZE: number;
	readonly VERTEX_ATTRIB_ARRAY_STRIDE: number;
	readonly VERTEX_ATTRIB_ARRAY_TYPE: number;
	readonly VERTEX_ATTRIB_ARRAY_NORMALIZED: number;
	readonly VERTEX_ATTRIB_ARRAY_POINTER: number;
	readonly VERTEX_ATTRIB_ARRAY_BUFFER_BINDING: number;
	readonly IMPLEMENTATION_COLOR_READ_TYPE: number;
	readonly IMPLEMENTATION_COLOR_READ_FORMAT: number;
	readonly COMPILE_STATUS: number;
	readonly INFO_LOG_LENGTH: number;
	readonly SHADER_SOURCE_LENGTH: number;
	readonly SHADER_COMPILER: number;
	readonly SHADER_BINARY_FORMATS: number;
	readonly NUM_SHADER_BINARY_FORMATS: number;
	readonly LOW_FLOAT: number;
	readonly MEDIUM_FLOAT: number;
	readonly HIGH_FLOAT: number;
	readonly LOW_INT: number;
	readonly MEDIUM_INT: number;
	readonly HIGH_INT: number;
	readonly FRAMEBUFFER: number;
	readonly RENDERBUFFER: number;
	readonly RGBA4: number;
	readonly RGB5_A1: number;
	readonly RGB565: number;
	readonly DEPTH_COMPONENT16: number;
	readonly STENCIL_INDEX8: number;
	readonly RENDERBUFFER_WIDTH: number;
	readonly RENDERBUFFER_HEIGHT: number;
	readonly RENDERBUFFER_INTERNAL_FORMAT: number;
	readonly RENDERBUFFER_RED_SIZE: number;
	readonly RENDERBUFFER_GREEN_SIZE: number;
	readonly RENDERBUFFER_BLUE_SIZE: number;
	readonly RENDERBUFFER_ALPHA_SIZE: number;
	readonly RENDERBUFFER_DEPTH_SIZE: number;
	readonly RENDERBUFFER_STENCIL_SIZE: number;
	readonly FRAMEBUFFER_ATTACHMENT_OBJECT_TYPE: number;
	readonly FRAMEBUFFER_ATTACHMENT_OBJECT_NAME: number;
	readonly FRAMEBUFFER_ATTACHMENT_TEXTURE_LEVEL: number;
	readonly FRAMEBUFFER_ATTACHMENT_TEXTURE_CUBE_MAP_FACE: number;
	readonly COLOR_ATTACHMENT0: number;
	readonly DEPTH_ATTACHMENT: number;
	readonly STENCIL_ATTACHMENT: number;
	readonly NONE: number;
	readonly FRAMEBUFFER_COMPLETE: number;
	readonly FRAMEBUFFER_INCOMPLETE_ATTACHMENT: number;
	readonly FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT: number;
	readonly FRAMEBUFFER_INCOMPLETE_DIMENSIONS: number;
	readonly FRAMEBUFFER_UNSUPPORTED: number;
	readonly FRAMEBUFFER_BINDING: number;
	readonly RENDERBUFFER_BINDING: number;
	readonly MAX_RENDERBUFFER_SIZE: number;
	readonly INVALID_FRAMEBUFFER_OPERATION: number;
	readonly READ_BUFFER: number;
	readonly UNPACK_ROW_LENGTH: number;
	readonly UNPACK_SKIP_ROWS: number;
	readonly UNPACK_SKIP_PIXELS: number;
	readonly PACK_ROW_LENGTH: number;
	readonly PACK_SKIP_ROWS: number;
	readonly PACK_SKIP_PIXELS: number;
	readonly COLOR: number;
	readonly DEPTH: number;
	readonly STENCIL: number;
	readonly RED: number;
	readonly RGB8: number;
	readonly RGBA8: number;
	readonly RGB10_A2: number;
	readonly TEXTURE_BINDING_3D: number;
	readonly UNPACK_SKIP_IMAGES: number;
	readonly UNPACK_IMAGE_HEIGHT: number;
	readonly TEXTURE_3D: number;
	readonly TEXTURE_WRAP_R: number;
	readonly MAX_3D_TEXTURE_SIZE: number;
	readonly UNSIGNED_INT_2_10_10_10_REV: number;
	readonly MAX_ELEMENTS_VERTICES: number;
	readonly MAX_ELEMENTS_INDICES: number;
	readonly TEXTURE_MIN_LOD: number;
	readonly TEXTURE_MAX_LOD: number;
	readonly TEXTURE_BASE_LEVEL: number;
	readonly TEXTURE_MAX_LEVEL: number;
	readonly MIN: number;
	readonly MAX: number;
	readonly DEPTH_COMPONENT24: number;
	readonly MAX_TEXTURE_LOD_BIAS: number;
	readonly TEXTURE_COMPARE_MODE: number;
	readonly TEXTURE_COMPARE_FUNC: number;
	readonly CURRENT_QUERY: number;
	readonly QUERY_RESULT: number;
	readonly QUERY_RESULT_AVAILABLE: number;
	readonly BUFFER_MAPPED: number;
	readonly BUFFER_MAP_POINTER: number;
	readonly STREAM_READ: number;
	readonly STREAM_COPY: number;
	readonly STATIC_READ: number;
	readonly STATIC_COPY: number;
	readonly DYNAMIC_READ: number;
	readonly DYNAMIC_COPY: number;
	readonly MAX_DRAW_BUFFERS: number;
	readonly DRAW_BUFFER0: number;
	readonly DRAW_BUFFER1: number;
	readonly DRAW_BUFFER2: number;
	readonly DRAW_BUFFER3: number;
	readonly DRAW_BUFFER4: number;
	readonly DRAW_BUFFER5: number;
	readonly DRAW_BUFFER6: number;
	readonly DRAW_BUFFER7: number;
	readonly DRAW_BUFFER8: number;
	readonly DRAW_BUFFER9: number;
	readonly DRAW_BUFFER10: number;
	readonly DRAW_BUFFER11: number;
	readonly DRAW_BUFFER12: number;
	readonly DRAW_BUFFER13: number;
	readonly DRAW_BUFFER14: number;
	readonly DRAW_BUFFER15: number;
	readonly MAX_FRAGMENT_UNIFORM_COMPONENTS: number;
	readonly MAX_VERTEX_UNIFORM_COMPONENTS: number;
	readonly SAMPLER_3D: number;
	readonly SAMPLER_2D_SHADOW: number;
	readonly FRAGMENT_SHADER_DERIVATIVE_HINT: number;
	readonly PIXEL_PACK_BUFFER: number;
	readonly PIXEL_UNPACK_BUFFER: number;
	readonly PIXEL_PACK_BUFFER_BINDING: number;
	readonly PIXEL_UNPACK_BUFFER_BINDING: number;
	readonly FLOAT_MAT2x3: number;
	readonly FLOAT_MAT2x4: number;
	readonly FLOAT_MAT3x2: number;
	readonly FLOAT_MAT3x4: number;
	readonly FLOAT_MAT4x2: number;
	readonly FLOAT_MAT4x3: number;
	readonly SRGB: number;
	readonly SRGB8: number;
	readonly SRGB8_ALPHA8: number;
	readonly COMPARE_REF_TO_TEXTURE: number;
	readonly MAJOR_VERSION: number;
	readonly MINOR_VERSION: number;
	readonly NUM_EXTENSIONS: number;
	readonly RGBA32F: number;
	readonly RGB32F: number;
	readonly RGBA16F: number;
	readonly RGB16F: number;
	readonly VERTEX_ATTRIB_ARRAY_INTEGER: number;
	readonly MAX_ARRAY_TEXTURE_LAYERS: number;
	readonly MIN_PROGRAM_TEXEL_OFFSET: number;
	readonly MAX_PROGRAM_TEXEL_OFFSET: number;
	readonly MAX_VARYING_COMPONENTS: number;
	readonly TEXTURE_2D_ARRAY: number;
	readonly TEXTURE_BINDING_2D_ARRAY: number;
	readonly R11F_G11F_B10F: number;
	readonly UNSIGNED_INT_10F_11F_11F_REV: number;
	readonly RGB9_E5: number;
	readonly UNSIGNED_INT_5_9_9_9_REV: number;
	readonly TRANSFORM_FEEDBACK_VARYING_MAX_LENGTH: number;
	readonly TRANSFORM_FEEDBACK_BUFFER_MODE: number;
	readonly MAX_TRANSFORM_FEEDBACK_SEPARATE_COMPONENTS: number;
	readonly TRANSFORM_FEEDBACK_VARYINGS: number;
	readonly TRANSFORM_FEEDBACK_BUFFER_START: number;
	readonly TRANSFORM_FEEDBACK_BUFFER_SIZE: number;
	readonly TRANSFORM_FEEDBACK_PRIMITIVES_WRITTEN: number;
	readonly RASTERIZER_DISCARD: number;
	readonly MAX_TRANSFORM_FEEDBACK_INTERLEAVED_COMPONENTS: number;
	readonly MAX_TRANSFORM_FEEDBACK_SEPARATE_ATTRIBS: number;
	readonly INTERLEAVED_ATTRIBS: number;
	readonly SEPARATE_ATTRIBS: number;
	readonly TRANSFORM_FEEDBACK_BUFFER: number;
	readonly TRANSFORM_FEEDBACK_BUFFER_BINDING: number;
	readonly RGBA32UI: number;
	readonly RGB32UI: number;
	readonly RGBA16UI: number;
	readonly RGB16UI: number;
	readonly RGBA8UI: number;
	readonly RGB8UI: number;
	readonly RGBA32I: number;
	readonly RGB32I: number;
	readonly RGBA16I: number;
	readonly RGB16I: number;
	readonly RGBA8I: number;
	readonly RGB8I: number;
	readonly RED_INTEGER: number;
	readonly RGB_INTEGER: number;
	readonly RGBA_INTEGER: number;
	readonly SAMPLER_2D_ARRAY: number;
	readonly SAMPLER_2D_ARRAY_SHADOW: number;
	readonly SAMPLER_CUBE_SHADOW: number;
	readonly UNSIGNED_INT_VEC2: number;
	readonly UNSIGNED_INT_VEC3: number;
	readonly UNSIGNED_INT_VEC4: number;
	readonly INT_SAMPLER_2D: number;
	readonly INT_SAMPLER_3D: number;
	readonly INT_SAMPLER_CUBE: number;
	readonly INT_SAMPLER_2D_ARRAY: number;
	readonly UNSIGNED_INT_SAMPLER_2D: number;
	readonly UNSIGNED_INT_SAMPLER_3D: number;
	readonly UNSIGNED_INT_SAMPLER_CUBE: number;
	readonly UNSIGNED_INT_SAMPLER_2D_ARRAY: number;
	readonly BUFFER_ACCESS_FLAGS: number;
	readonly BUFFER_MAP_LENGTH: number;
	readonly BUFFER_MAP_OFFSET: number;
	readonly DEPTH_COMPONENT32F: number;
	readonly DEPTH32F_STENCIL8: number;
	readonly FLOAT_32_UNSIGNED_INT_24_8_REV: number;
	readonly FRAMEBUFFER_ATTACHMENT_COLOR_ENCODING: number;
	readonly FRAMEBUFFER_ATTACHMENT_COMPONENT_TYPE: number;
	readonly FRAMEBUFFER_ATTACHMENT_RED_SIZE: number;
	readonly FRAMEBUFFER_ATTACHMENT_GREEN_SIZE: number;
	readonly FRAMEBUFFER_ATTACHMENT_BLUE_SIZE: number;
	readonly FRAMEBUFFER_ATTACHMENT_ALPHA_SIZE: number;
	readonly FRAMEBUFFER_ATTACHMENT_DEPTH_SIZE: number;
	readonly FRAMEBUFFER_ATTACHMENT_STENCIL_SIZE: number;
	readonly FRAMEBUFFER_DEFAULT: number;
	readonly FRAMEBUFFER_UNDEFINED: number;
	readonly DEPTH_STENCIL_ATTACHMENT: number;
	readonly DEPTH_STENCIL: number;
	readonly UNSIGNED_INT_24_8: number;
	readonly DEPTH24_STENCIL8: number;
	readonly UNSIGNED_NORMALIZED: number;
	readonly DRAW_FRAMEBUFFER_BINDING: number;
	readonly READ_FRAMEBUFFER: number;
	readonly DRAW_FRAMEBUFFER: number;
	readonly READ_FRAMEBUFFER_BINDING: number;
	readonly RENDERBUFFER_SAMPLES: number;
	readonly FRAMEBUFFER_ATTACHMENT_TEXTURE_LAYER: number;
	readonly MAX_COLOR_ATTACHMENTS: number;
	readonly COLOR_ATTACHMENT1: number;
	readonly COLOR_ATTACHMENT2: number;
	readonly COLOR_ATTACHMENT3: number;
	readonly COLOR_ATTACHMENT4: number;
	readonly COLOR_ATTACHMENT5: number;
	readonly COLOR_ATTACHMENT6: number;
	readonly COLOR_ATTACHMENT7: number;
	readonly COLOR_ATTACHMENT8: number;
	readonly COLOR_ATTACHMENT9: number;
	readonly COLOR_ATTACHMENT10: number;
	readonly COLOR_ATTACHMENT11: number;
	readonly COLOR_ATTACHMENT12: number;
	readonly COLOR_ATTACHMENT13: number;
	readonly COLOR_ATTACHMENT14: number;
	readonly COLOR_ATTACHMENT15: number;
	readonly COLOR_ATTACHMENT16: number;
	readonly COLOR_ATTACHMENT17: number;
	readonly COLOR_ATTACHMENT18: number;
	readonly COLOR_ATTACHMENT19: number;
	readonly COLOR_ATTACHMENT20: number;
	readonly COLOR_ATTACHMENT21: number;
	readonly COLOR_ATTACHMENT22: number;
	readonly COLOR_ATTACHMENT23: number;
	readonly COLOR_ATTACHMENT24: number;
	readonly COLOR_ATTACHMENT25: number;
	readonly COLOR_ATTACHMENT26: number;
	readonly COLOR_ATTACHMENT27: number;
	readonly COLOR_ATTACHMENT28: number;
	readonly COLOR_ATTACHMENT29: number;
	readonly COLOR_ATTACHMENT30: number;
	readonly COLOR_ATTACHMENT31: number;
	readonly FRAMEBUFFER_INCOMPLETE_MULTISAMPLE: number;
	readonly MAX_SAMPLES: number;
	readonly HALF_FLOAT: number;
	readonly MAP_READ_BIT: number;
	readonly MAP_WRITE_BIT: number;
	readonly MAP_INVALIDATE_RANGE_BIT: number;
	readonly MAP_INVALIDATE_BUFFER_BIT: number;
	readonly MAP_FLUSH_EXPLICIT_BIT: number;
	readonly MAP_UNSYNCHRONIZED_BIT: number;
	readonly RG: number;
	readonly RG_INTEGER: number;
	readonly R8: number;
	readonly RG8: number;
	readonly R16F: number;
	readonly R32F: number;
	readonly RG16F: number;
	readonly RG32F: number;
	readonly R8I: number;
	readonly R8UI: number;
	readonly R16I: number;
	readonly R16UI: number;
	readonly R32I: number;
	readonly R32UI: number;
	readonly RG8I: number;
	readonly RG8UI: number;
	readonly RG16I: number;
	readonly RG16UI: number;
	readonly RG32I: number;
	readonly RG32UI: number;
	readonly VERTEX_ARRAY_BINDING: number;
	readonly R8_SNORM: number;
	readonly RG8_SNORM: number;
	readonly RGB8_SNORM: number;
	readonly RGBA8_SNORM: number;
	readonly SIGNED_NORMALIZED: number;
	readonly PRIMITIVE_RESTART_FIXED_INDEX: number;
	readonly COPY_READ_BUFFER: number;
	readonly COPY_WRITE_BUFFER: number;
	readonly COPY_READ_BUFFER_BINDING: number;
	readonly COPY_WRITE_BUFFER_BINDING: number;
	readonly UNIFORM_BUFFER: number;
	readonly UNIFORM_BUFFER_BINDING: number;
	readonly UNIFORM_BUFFER_START: number;
	readonly UNIFORM_BUFFER_SIZE: number;
	readonly MAX_VERTEX_UNIFORM_BLOCKS: number;
	readonly MAX_FRAGMENT_UNIFORM_BLOCKS: number;
	readonly MAX_COMBINED_UNIFORM_BLOCKS: number;
	readonly MAX_UNIFORM_BUFFER_BINDINGS: number;
	readonly MAX_UNIFORM_BLOCK_SIZE: number;
	readonly MAX_COMBINED_VERTEX_UNIFORM_COMPONENTS: number;
	readonly MAX_COMBINED_FRAGMENT_UNIFORM_COMPONENTS: number;
	readonly UNIFORM_BUFFER_OFFSET_ALIGNMENT: number;
	readonly ACTIVE_UNIFORM_BLOCK_MAX_NAME_LENGTH: number;
	readonly ACTIVE_UNIFORM_BLOCKS: number;
	readonly UNIFORM_TYPE: number;
	readonly UNIFORM_SIZE: number;
	readonly UNIFORM_NAME_LENGTH: number;
	readonly UNIFORM_BLOCK_INDEX: number;
	readonly UNIFORM_OFFSET: number;
	readonly UNIFORM_ARRAY_STRIDE: number;
	readonly UNIFORM_MATRIX_STRIDE: number;
	readonly UNIFORM_IS_ROW_MAJOR: number;
	readonly UNIFORM_BLOCK_BINDING: number;
	readonly UNIFORM_BLOCK_DATA_SIZE: number;
	readonly UNIFORM_BLOCK_NAME_LENGTH: number;
	readonly UNIFORM_BLOCK_ACTIVE_UNIFORMS: number;
	readonly UNIFORM_BLOCK_ACTIVE_UNIFORM_INDICES: number;
	readonly UNIFORM_BLOCK_REFERENCED_BY_VERTEX_SHADER: number;
	readonly UNIFORM_BLOCK_REFERENCED_BY_FRAGMENT_SHADER: number;
	readonly INVALID_INDEX: number;
	readonly MAX_VERTEX_OUTPUT_COMPONENTS: number;
	readonly MAX_FRAGMENT_INPUT_COMPONENTS: number;
	readonly MAX_SERVER_WAIT_TIMEOUT: number;
	readonly OBJECT_TYPE: number;
	readonly SYNC_CONDITION: number;
	readonly SYNC_STATUS: number;
	readonly SYNC_FLAGS: number;
	readonly SYNC_FENCE: number;
	readonly SYNC_GPU_COMMANDS_COMPLETE: number;
	readonly UNSIGNALED: number;
	readonly SIGNALED: number;
	readonly ALREADY_SIGNALED: number;
	readonly TIMEOUT_EXPIRED: number;
	readonly CONDITION_SATISFIED: number;
	readonly WAIT_FAILED: number;
	readonly SYNC_FLUSH_COMMANDS_BIT: number;
	readonly TIMEOUT_IGNORED: number;
	readonly VERTEX_ATTRIB_ARRAY_DIVISOR: number;
	readonly ANY_SAMPLES_PASSED: number;
	readonly ANY_SAMPLES_PASSED_CONSERVATIVE: number;
	readonly SAMPLER_BINDING: number;
	readonly RGB10_A2UI: number;
	readonly TEXTURE_SWIZZLE_R: number;
	readonly TEXTURE_SWIZZLE_G: number;
	readonly TEXTURE_SWIZZLE_B: number;
	readonly TEXTURE_SWIZZLE_A: number;
	readonly GREEN: number;
	readonly BLUE: number;
	readonly INT_2_10_10_10_REV: number;
	readonly TRANSFORM_FEEDBACK: number;
	readonly TRANSFORM_FEEDBACK_PAUSED: number;
	readonly TRANSFORM_FEEDBACK_ACTIVE: number;
	readonly TRANSFORM_FEEDBACK_BINDING: number;
	readonly PROGRAM_BINARY_RETRIEVABLE_HINT: number;
	readonly PROGRAM_BINARY_LENGTH: number;
	readonly NUM_PROGRAM_BINARY_FORMATS: number;
	readonly PROGRAM_BINARY_FORMATS: number;
	readonly COMPRESSED_R11_EAC: number;
	readonly COMPRESSED_SIGNED_R11_EAC: number;
	readonly COMPRESSED_RG11_EAC: number;
	readonly COMPRESSED_SIGNED_RG11_EAC: number;
	readonly COMPRESSED_RGB8_ETC2: number;
	readonly COMPRESSED_SRGB8_ETC2: number;
	readonly COMPRESSED_RGB8_PUNCHTHROUGH_ALPHA1_ETC2: number;
	readonly COMPRESSED_SRGB8_PUNCHTHROUGH_ALPHA1_ETC2: number;
	readonly COMPRESSED_RGBA8_ETC2_EAC: number;
	readonly COMPRESSED_SRGB8_ALPHA8_ETC2_EAC: number;
	readonly TEXTURE_IMMUTABLE_FORMAT: number;
	readonly MAX_ELEMENT_INDEX: number;
	readonly NUM_SAMPLE_COUNTS: number;
	readonly TEXTURE_IMMUTABLE_LEVELS: number;
	readonly ES_VERSION_2_0: number;
}
