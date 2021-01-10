/*
 *  This is a definition wrapper, connecting the "compiled" workers to the actual worker loader.
 */

declare module 'worker-loader!*' {
  // You need to change `Worker`, if you specified a different value for the `workerType` option
  class WebpackWorker extends Worker {
    constructor(options?: any);
  }

  // Uncomment this if you set the `esModule` option to `false`
  //export = WebpackWorker;
  export default WebpackWorker;
}