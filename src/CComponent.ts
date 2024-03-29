/**
 * @author hexxone / https://hexx.one
 *
 * @license
 * Copyright (c) 2024 hexxone All rights reserved.
 * Licensed under the GNU GENERAL PUBLIC LICENSE.
 * See LICENSE file in the project root for full license information.
 */

import { CSettings } from './CSettings';
import { Smallog } from './Smallog';

/**
 * Base-Component for a TypeScript Web Wallpaper
 */
export class CComponent {

    private needsUpdate = false;

    /**
     * Important: Append your child objects, for settings to be applied correctly!
     */
    children: CComponent[] = [];

    /**
     *  main Settings, need to be overwritten with Specific settings
     * @public
     */
    public settings: CSettings = undefined;

    /**
     * will recursively try to set a setting with type and return success
     * <br/>
     * will also flag the module as needs-Update.
     *
     * @public
     * @param {Object} key key
     * @param {Object} value value
     * @returns {boolean} found
     */
    public applySetting(key: string, value: any): boolean {
        let found = this.settings.apply(key, value);

        if (found) {
            this.needsUpdate = true;
            Smallog.debug(`ApplySetting: ${key}:${value}`);
        }
        this.children.forEach((ch) => {
            return (found = ch.applySetting(key, value) || found);
        });

        return found;
    }

    /**
     * DO NOT OVERWWRITE !!!
     * <br/>
     * will recursively update all needed modules after settings changes
     *
     * @public
     * @returns {void}
     */
    public updateAll(): void {
        this.children.forEach((c) => {
            return c.updateAll();
        });
        if (this.needsUpdate) {
            this.updateSettings();
        }
        this.needsUpdate = false;
    }

    /**
     * NEEDS TO BE OVERWRITTEN FOR DOING ACTIONS ON SETTINGS CHANGE.
     * <br/>
     * should usually get called automatically when needed.. no need for extra calling
     *
     * @public
     * @returns {Promise} async commpletion event
     */
    public updateSettings(): Promise<void> {
        console.error(
            `ERROR_NO_IMPL at: CComponent.UpdateSettings!\r\nPlease override this method!`
        );

        return Promise.resolve();
    }

}
