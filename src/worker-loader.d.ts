/**
* @author hexxone / https://hexx.one
*
* @license
* Copyright (c) 2021 hexxone All rights reserved.
* Licensed under the GNU GENERAL PUBLIC LICENSE.
* See LICENSE file in the project root for full license information.
*/

/**
* This is just a definition wrapper.
*
* @see https://github.com/webpack-contrib/worker-loader
*/
declare module 'worker-loader!*' {

	/**
	* You need to change `Worker`, if:
	* you specified a different value for the `workerType` option
	*/
	class WebpackWorker extends Worker {
		constructor(options?: any);
	}

	/**
	* Change this if you set the `esModule` option to `false`
	* // export = WebpackWorker;
	*/
	export default WebpackWorker;
}
