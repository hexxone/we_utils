/**
* @author hexxone / https://hexx.one
*
* @license
* Copyright (c) 2023 hexxone All rights reserved.
* Licensed under the GNU GENERAL PUBLIC LICENSE.
* See LICENSE file in the project root for full license information.
*/

/**
* This is a basic shared interface for shaders.
* @public
*/
export interface BaseShader {

	/**
	* short name description for the shader
	* @public
	*/
	shaderID: string;

	/**
	* glsl vertex shader coder
	* @public
	*/
	vertexShader: string;

	/**
	* glsl fragment shader coder
	* @public
	*/
	fragmentShader: string;

	/**
	* glsl shared uniforms
	* @public
	*/
	uniforms: any;

	/**
	* glsl defines
	* @public
	*/
	defines: any;
}
