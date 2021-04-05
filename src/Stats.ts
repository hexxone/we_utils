/**
* @author hexxone / https://hexx.one
*
* @license
* Copyright (c) 2021 hexxone All rights reserved.
* Licensed under the GNU GENERAL PUBLIC LICENSE.
* See LICENSE file in the project root for full license information.
*
* TypeScript Wrapper for mrdoob Stats.js
* Still requires Stats.js to be included!
* @ignore
*/

declare interface Stats {
	REVISION: number;
	dom: HTMLDivElement;
	addPanel(panel: Stats.Panel): Stats.Panel;
	showPanel(id: number): void;
	begin(): void;
	end(): void;
	update(): void;
	domElement: HTMLDivElement;
	setMode(id: number): void;
}

declare function Stats(): Stats;

declare namespace Stats {
	interface Panel {
		dom: HTMLCanvasElement;
		update(value: number, maxValue: number): void;
	}

	// eslint-disable-next-line no-unused-vars
	function Panel(name?: string, fg?: string, bg?: string): Panel;
}

export default Stats;
