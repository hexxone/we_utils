/**
 * @author D.Thiele @https://hexx.one
 * 
 * @description
 * represents a modular component for Wallpaper engine
 * 
 */

import { CSettings } from "./CSettings";

 export class CComponent {

    public settings: CSettings = null;

    // Important: Append your child objects, for settings to be applied correctly!
    public children: CComponent[] = [];
    
    public GetComponents() {
        var list: CComponent[] = [this];
        this.children.forEach((ch) => list.push(...ch.GetComponents()));
        return list;
    }

    public GetSettings() {
        var list: CSettings[] = [];
        this.GetComponents().forEach(co => list.push(co.settings));
        return list;
    }
 }