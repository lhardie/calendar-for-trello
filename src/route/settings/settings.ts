'use strict';
import {appModule} from '../../app';

class Setting {
    constructor(public id: string,
                public name: string,
                public icon: string,
                public enabled: boolean,
                public disabled: boolean) {

    }

}

class SettingsCtrl {

    public settings: Array<any> = [];

    constructor(private localStorageService, private initService) {
        'ngInject';

        this.settings.push(new Setting('refresh', 'auto refresh', 'sync', localStorageService.get('refresh') === true, false));
        this.settings.push(new Setting('boardColors', 'colorize cards', 'color_lens',
            localStorageService.get('boardColors') === true || localStorageService.get('boardColors') === null, false));
        this.settings.push(new Setting('observerMode', 'observer mode (show cards of all members)', 'group',
            localStorageService.get('observerMode') === true || localStorageService.get('observerMode') === null, false));

    }

    public change = function (id, opt) {

        this.localStorageService.set(id, opt);
        if (id === 'boardColors' || id === 'observerMode') {
            //$window.location.reload();
            this.initService.refresh();
        }
    };
}

appModule.controller('settingsCtrl', SettingsCtrl);