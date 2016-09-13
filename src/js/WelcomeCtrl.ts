'use strict';
import moment from 'moment';

import {appModule} from '../app';
import {CalService} from '../services/CalService';
import IDialogService = angular.material.IDialogService;
import {CalDate} from '../route/month/month';


class WelcomeCtrl {
    // private today;
    private weekdays;
    private days;
    private status;
    private date;
    private today;

    constructor(private CalService: CalService, private $mdDialog: IDialogService) {
        'ngInject';

        let newDate = new Date();
        this.date = new CalDate(newDate.getFullYear(), newDate.getMonth());
        this.today = new CalDate(newDate.getFullYear(), newDate.getMonth());

        /**top legende**/
        this.weekdays = [];
        for (var i = 0; i <= 6; i++) {
            var long = moment().weekday(i).format('dddd');
            var short = moment().weekday(i).format('dd');
            this.weekdays[i] = [short, long];
        }


        this.days = CalService.build(this.today).days;
        this.showAdvanced();
    }


    public showAdvanced() {
        var useFullScreen = false;

        this.$mdDialog.show({
            templateUrl: 'dialog1.tmpl.html',
            parent: angular.element(document.body),
            clickOutsideToClose: false,
            escapeToClose: false,
            fullscreen: useFullScreen

        }).then((answer) => {
            this.status = 'You said the information was ' + answer + '.';
        }, () => {
            this.status = 'You cancelled the dialog.';
        });


    }


}
appModule.controller('welcomeCtrl', WelcomeCtrl);