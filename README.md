# [we_utils](https://github.com/hexxone/we_utils)

## A collection of utilities, mostly usefull when creating Wallpaper-Engine Web-Wallpapers with TypeScript & Webpack

I created this repository since I was previously copying back-and-forth lots of code between projects.
Keeping track of this stuff manually is annoying...

## [Documentation](https://hexxone.github.io/we_utils)

## TODO

- fix RenamerPlugin in Prod (Terser Compression)

### Dependencies / Libraries

- [TypeScript](https://www.typescriptlang.org/) for typization
- [three.js](https://threejs.org/) & Examples for webgl rendering
- [WebAssembly](https://webassembly.org/) for more efficient processing
- [AssemblyScript](https://www.assemblyscript.org/) for compiling "ASC" -> "WASM"
- [wasc-worker](https://github.com/hexxone/wasc-worker) for ez AssemblyScript workers
- [cookieconsent](https://github.com/osano/cookieconsent) thanks to EU laws

### Features / Contents

- OfflineWorker
- AssemblyScript Webpack Builder
- AssemblyScript WebAssembly Module Loader
- CComponent & CSettings Helpers
- Wallpaper Engine Audio Supplier (WEAS)
- "document.ready" shorthand
- ReloadHelper for displaying a loading bar
- Smallog Logging & Filtering
- WarnHelper for Seizure warnings
- Wallpaper Engine iCUE Library (WEICUE)
- Wallpaper Engine Web Adapter (WEWA)
- Stats.js definition file

### Used by

- [AudiOrbits](https://github.com/hexxone/audiorbits)
- [ReactiveInk](https://github.com/hexxone/ReactiveInk)
