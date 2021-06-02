/**
* @author hexxone / https://hexx.one
*
* @license
* Copyright (c) 2021 hexxone All rights reserved.
* Licensed under the GNU GENERAL PUBLIC LICENSE.
* See LICENSE file in the project root for full license information.
*/

import {LUTShader} from './LUTShader';

/**
* LookUpTable shader without filtering
*
* @public
* @extends {LUTShader}
*/
export class LUTShaderNearest extends LUTShader {
	shaderID = 'LUTShaderNearest';

	fragmentShader = new LUTShader().fragmentShader.replace('#define FILTER_LUT', '//');
}
