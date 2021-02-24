/**
 * @author D.Thiele @https://hexx.one
 * 
 * @license
 * Copyright (c) 2020 D.Thiele All rights reserved.  
 * Licensed under the GNU GENERAL PUBLIC LICENSE.
 * See LICENSE file in the project root for full license information.  
 * 
 * @description
 * represents a Core Component for Wallpaper Engine Wallpaper
 * 
 */

import { CSettings } from "./CSettings";
import { Smallog } from "./Smallog";

export class CComponent {

    private needsUpdate = false;

    public settings: CSettings = null;

    // Important: Append your child objects, for settings to be applied correctly!
    public children: CComponent[] = [];


    // will recursively try to set a setting with type and return success.
    // will also flag the module as "needsUpdate"
    public ApplySetting(key: any, value: any): boolean {
        var found = this.settings.apply(key, value);
        if (found) {
            this.needsUpdate = true;
            Smallog.Debug(`ApplySetting: ${key}:${value}`);
        }
        this.children.forEach(ch => found ||= ch.ApplySetting(key, value));
        return found;
    }

    // will recursively update all needed modules afffter settings changes
    // DO NOT OVERWWRITE !!!
    public UpdateAll() {
        this.children.forEach(c => c.UpdateAll());
        if (this.needsUpdate) this.UpdateSettings();
        this.needsUpdate = false;
    }

    // NEEDS TO BE OVERWRITTEN FOR DOING ACTIONS ON SETTINGS CHANGE
    // should usually get called automatically when needed.. no need for extra calling
    public UpdateSettings(): Promise<void> {
        console.error(`ERROR_NO_IMPL at: CComponent.UpdateSettings!\r\nPlease override this method!`)
        return;
    }
}