/**
 * @author 'Andrew' / https://github.com/profezzional
 *
 * Types for Wallpaper Engine integation for CUE SDK 3.0.+
 *
 * @see https://wallpaper-engine.fandom.com/wiki/Web_Wallpaper_iCUE_Reference for reference
 * @see http://forum.corsair.com/v3/showthread.php?t=179027 for the latest SDK version
 * @see https://github.com/profezzional/iCUE-wallpaper-engine for orginal source
 */

/**
 * Contains information about SDK and CUE versions.
 */
type ProtocolDetails = {
	/**
	 * Boolean value that specifies if there were breaking changes between version of protocol implemented by server and client.
	 */
	breakingChanges: boolean;

	/**
	 * Integer number that specifies version of protocol that is implemented by current SDK.
	 * Numbering starts from 1. Always contains valid value even if there was no CUE found.
	 */
	sdkProtocolVersion: number;

	/**
	 * String containing version of SDK (like "1.0.0.1"). Always contains valid value even if there was no CUE found.
	 */
	sdkVersion: string;

	/**
	 * Integer number that specifies version of protocol that is implemented by CUE.
	 * Numbering starts from 1. If CUE was not found then this value will be 0.
	 */
	serverProtocolVersion: number;

	/**
	 * String containing version of CUE (like "1.0.0.1") or NULL if CUE was not found.
	 */
	serverVersion: number;
};

/**
 * Contains list of available device types
 */
type DeviceType =
	| "CDT_Keyboard"
	| "CDT_Mouse"
	| "CDT_Headset"
	| "CDT_Mousemat"
	| "CDT_HeadsetStand"
	| "CDT_CommanderPro"
	| "CDT_LightingNodePro";

/**
 * Valid values for keyboard physical layouts.
 */
type KeyboardPhysicalLayout =
	| "CPL_US"
	| "CPL_UK"
	| "CPL_JP"
	| "CPL_KR"
	| "CPL_BR";

/**
 * Valid values for mouse physical layouts, number represents configurable mouse LEDs.
 */
type MousePhysicalLayout =
	| "CPL_Zones1"
	| "CPL_Zones2"
	| "CPL_Zones3"
	| "CPL_Zones4";

/**
 * Contains list of available physical layouts for keyboards and mice.
 */
type PhysicalLayout =
	| KeyboardPhysicalLayout
	| MousePhysicalLayout
	| "CPL_Invalid";

/**
 * Contains list of available logical layouts for keyboards.
 */
type KeyboardLogicalLayout =
	| "CLL_US_Int"
	| "CLL_NA"
	| "CLL_EU"
	| "CLL_UK"
	| "CLL_BE"
	| "CLL_BR"
	| "CLL_CH"
	| "CLL_CN"
	| "CLL_DE"
	| "CLL_ES"
	| "CLL_FR"
	| "CLL_IT"
	| "CLL_ND"
	| "CLL_RU4"
	| "CLL_JP"
	| "CLL_KR"
	| "CLL_TW"
	| "CLL_MEX";

/**
 * Contains list of available logical layouts for keyboards.
 */
type LogicalLayout = KeyboardLogicalLayout | "CLL_Invalid";

/**
 * Contains information about device.
 */
type DeviceInfo = {
	/**
	 * ICUE Device ID (not set by default)
	 */
	id: number;

	/**
	 * Enum describing device type.
	 */
	type: DeviceType;

	/**
	 * Device model (like "K95RGB").
	 */
	model: string;

	/**
	 * Enum describing physical layout of the keyboard or mouse.
	 * If device is neither keyboard nor mouse then value is "CPL_Invalid".
	 */
	physicalLayout: PhysicalLayout;

	/**
	 * Enum describing logical layout of the keyboard as set in CUE settings.
	 * If device is not keyboard then value is "CLL_Invalid".
	 */
	logicalLayout: LogicalLayout;

	/**
	 * Number of controllable LEDs on the device.
	 */
	ledCount: number;

	/**
	 * Led positions on the device (not set by default)
	 */
	leds: LedPosition[];

	/**
	 * Contains list of device capabilities.
	 * First version of SDK only supports lighting, but future versions may also support other capabilities.
	 */
	capsMask: { CDC_Lighting: boolean } | { CDC_None: boolean };
};

/**
 * Contains led id and position of led rectangle. Most of the keys are rectangular.
 * In case if key is not rectangular (like Enter in ISO/UK layout) it returns the smallest rectangle that fully contains the key.
 */
type LedPosition = {
	/**
	 * For keyboards, mousemats and headset stands, height in mm;
	 * for DIY-devices, height in logical units.
	 */
	height: number;

	/**
	 * For keyboards, mousemats and headset stands, width in mm;
	 * for DIY-devices, width in logical units.
	 */
	width: number;

	/**
	 * For keyboards, mousemats and headset stands, top offset in mm;
	 * for DIY-devices, top offset in logical units.
	 */
	top: number;

	/**
	 * For keyboards, mousemats and headset stands, left offset in mm;
	 * for DIY-devices, left offset in logical units.
	 */
	left: number;

	/**
	 * Identifier of led.
	 */
	ledId: number;

	/**
	 * Identifier of led.
	 */
	ledIdName: string;
};

/** Contains information about led and its color. */
type LedColor = {
	/**
	 * Identifier of LED to set.
	 */
	ledId: number;

	/**
	 * Red brightness [0..255].
	 */
	r: number;

	/**
	 * Green brightness [0..255].
	 */
	g: number;

	/**
	 * Blue brightness [0..255].
	 */
	b: number;
};

/** Main Interface */
export type ICUE = {
	/**
	 * Returns current status and version of iCUE SDK.
	 * @param callback A callback into which the protocol details are passed.
	 */
	getProtocolDetails(
		callback: (protocolDetails: ProtocolDetails) => void
	): void;

	/**
	 * Returns the number of recognized iCUE compatible devices on the system.
	 * @param callback A callback into which the device count is passed.
	 */
	getDeviceCount(callback: (count: number) => void): void;

	/**
	 * Returns all information specific to a single device.
	 * @param deviceIndex The index of the device about which to get info.
	 * @param callback A callback into which the device info is passed.
	 */
	getDeviceInfo(
		deviceIndex: number,
		callback: (deviceInfo: DeviceInfo) => void
	): void;

	/**
	 *  Provides list of keyboard, mousemat, headset stand and DIY-devices LEDs with their physical (keyboard, mousemat and headset stand) or logical (DIY-devices) positions.
	 * @param deviceIndex The index of the device whose LED position to get.
	 * @param callback A callback into which the LED positions are passed.
	 */
	getLedPositionsByDeviceIndex(
		deviceIndex: number,
		callback: (leds: LedPosition[]) => void
	): void;

	/**
	 * Set specified leds to some colors.
	 * The color is retained until changed by successive calls.
	 * This function does not take logical layout into account, and returns control to the caller immediately.
	 * @param leds Array containing colors for each LED.
	 */
	setLedsColorsAsync(leds: LedColor[]): void;

	/**
	 * Updates all LEDs for given devices to one specific color.
	 * @param deviceIndexOrArray Index or indices of the device(s) whose LEDs to set to the specified color.
	 * @param ledColor The color to which to change the LEDs of the specified device(s).
	 */
	setAllLedsColorsAsync(
		deviceIndexOrArray: number | number[],
		ledColor: LedColor
	): void;

	/**
	 * Updates all LEDs for given devices to one specific color.
	 * @param deviceIndexOrArray Index or indices of the device(s) whose LEDs to set to the specified color.
	 * @param ledColor The color to which to change the LEDs of the specified device(s).
	 */
	setLedColorsByImageData(
		deviceIndexOrArray: number | number[],
		encodedImageData,
		width: number,
		height: number
	): void;
};
