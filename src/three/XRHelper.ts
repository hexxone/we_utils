/**
* @author hexxone / https://hexx.one
* @author mrdoob / http://mrdoob.com
* @author Mugen87 / https://github.com/Mugen87
*/

import {Navigator, XRSession} from 'three';
import {CComponent} from '../CComponent';
import {CSettings} from '../CSettings';

/**
 * XR Settings
 * @extends {CSettings}
 */
export class XRSettings extends CSettings {
	xr_mode: boolean = false;
}

/**
* XR / VR / AR Helper class.
* Provides availability information and starts/stops a three-js XR session
* @public
* @extends {CComponent}
*/
export class XRHelper extends CComponent {
	public settings: XRSettings = new XRSettings();

	private nav: Navigator;
	private button: HTMLButtonElement;
	private currentSession: XRSession;

	/**
	* Get typed navigator
	*/
	constructor() {
		super();
		this.nav = navigator as Navigator;
		this.createBtn();
	}

	/**
	* Create the "Exit" Button
	*/
	private createBtn() {
		const btn = this.button = document.createElement('button');
		btn.disabled = true;
		btn.style.display = 'none';
		btn.style.position = 'absolute';
		btn.style.bottom = '10px';
		btn.style.padding = '12px 6px';
		btn.style.border = '1px solid #fff';
		btn.style.borderRadius = '4px';
		btn.style.background = 'rgba(0,0,0,0.1)';
		btn.style.color = '#fff';
		btn.style.font = 'normal 13px sans-serif';
		btn.style.textAlign = 'center';
		btn.style.opacity = '0.5';
		btn.style.outline = 'none';
		btn.style.zIndex = '99999';

		btn.onmouseenter = () => {
			btn.style.opacity = '1.0';
		};
		btn.onmouseleave = () => {
			btn.style.opacity = '0.5';
		};

		document.body.append(btn);
	}

	/**
	* @return {boolean} whether XR is supported and available or not
	*/
	private async isSupported() {
		if ('xr' in this.nav) {
			return (await this.nav.xr.isSessionSupported('immersive-vr'));
		}
		return false;
	}

	/**
	 * Trys to start a Web-XR session.
	* if successfull, will provide functionality for leaving web-XR again.
	 * @param {function (params:XRSession): void} sessionCallback
	 * @return {Promise<boolean>}
	 */
	public async enableSession(sessionCallback: (xrs: XRSession) => void): Promise<boolean> {
		return new Promise(async (resolve) => {
			// check availability
			const avail = await this.isSupported();
			if (!avail) {
				if (window.isSecureContext === false && confirm('WebXR may need HTTPS to function. Redirect?')) {
					document.location.href = document.location.href.replace(/^http:/, 'https:');
				} else {
					this.button.textContent = 'VR not available!';
					this.button.style.display = 'block';
					console.error('[WEBXR] Not avaiable! More info: https://immersiveweb.dev/');
				}
				resolve(false);
				return;
			}

			this.button.textContent = 'Enter XR';
			this.button.style.display = 'block';
			this.button.disabled = false;

			// "Toggle" style event listener
			this.button.addEventListener('click', async () => {
				if (!avail) return;
				// end previous session
				if (this.currentSession) {
					await this.currentSession.end();
					return;
				}

				// WebXR's requestReferenceSpace only works if the corresponding feature
				// was requested at session creation time. For simplicity, just ask for
				// the interesting ones as optional features, but be aware that the
				// requestReferenceSpace call will fail if it turns out to be unavailable.
				// ('local' is always available for immersive sessions and doesn't need to
				// be requested separately.)
				const sessionInit = {optionalFeatures: ['local-floor']}; /* , 'bounded-floor'*/
				this.nav.xr.requestSession('immersive-vr', sessionInit).then((sess) => {
					this.currentSession = sess;

					const lstnr = (/* event*/) => {
						this.currentSession.removeEventListener('end', lstnr);
						this.currentSession = null;
						this.button.textContent = 'Enter VR';
						sessionCallback(null);
					};
					sess.addEventListener('end', lstnr);
					// show exit button
					this.button.textContent = 'Exit VR';
					sessionCallback(sess);
				},
				(reason) => {
					console.error('[WEBXR] RequestSession failed! Reason: ' + reason);
				});
			});

			// success
			resolve(true);
		});
	}
};
