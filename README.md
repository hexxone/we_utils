# [we_utils](https://github.com/hexxone/we_utils) - OLD Version (JS)

## This is the "OLD" branch of the repo, only kept for maintenance & bugfixing purposes in audiorbits 2.3.x

You should generally *NOT* rely on this branch or propose any new features here.

Please target the "main" branch for these.

## A collection of utilities, mostly usefull when creating Wallpaper-Engine Web-Wallpapers with TypeScript & Webpack

I created this repository since I was previously copying back-and-forth lots of code between projects.
Keeping track of this stuff manually is annoying...

### Dependencies / Libraries

- [three.js](https://threejs.org/) & Examples for webgl rendering
- [jquery](https://jquery.com/) for the following utils: `ReloadHelper, WarnHelper, weas, weicue, wewwa` tested Version = `3.5.1`

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
