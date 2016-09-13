'use strict';
import * as _ from 'lodash';
import {appModule} from "../app";
import {WebStorageAdapter} from "../services/WebStorageAdapter";
import {ChangeDateService} from "../services/changeDate";
import IBottomSheetService = angular.material.IBottomSheetService;
import ISidenavService = angular.material.ISidenavService;
import IDialogService = angular.material.IDialogService;

export class HeaderCtrl {
    private overduedHeader;
    private overduedIcon;
    private overduedTitle;
    private overduedContent;
    private nodueHeader;
    private nodueIcon;
    private nodueTitle;
    private nodueContent;
    private cards;
    private name;
    private id;
    private actions;
    private more;
    private syncicon;
    private login;
    private keepOpen: boolean;
    private checkClosingForm: Function;

    constructor(private WebStorageAdapter: WebStorageAdapter, private ngProgress,
                private changeDate: ChangeDateService, private $mdDialog: IDialogService,
                private $mdSidenav: ISidenavService, private initService, private $window: ng.IWindowService,
                private $location: ng.ILocationService,
                private $mdBottomSheet: IBottomSheetService, private $rootScope: ng.IRootScopeService) {
        "ngInject";

        this.keepOpen = false;

        this.cards = [];
        if (this.WebStorageAdapter.getStorage().me.autorefresh) {
            if (this.WebStorageAdapter.getStorage().me.autorefresh === true) {
                this.syncicon = 'sync';
            }
            else {
                this.syncicon = 'sync_disabled';
            }
        }
        else {
            this.syncicon = 'sync_disabled';
        }


        var tempcards = [];
        for (var x in this.WebStorageAdapter.getStorage().cards.my) {
            tempcards.push(this.WebStorageAdapter.getStorage().cards.my[x]);
        }
        this.cards = tempcards;

        $rootScope.$on('rebuild', () => {
            var tempcards = [];
            for (var x in this.WebStorageAdapter.getStorage().cards.my) {
                tempcards.push(this.WebStorageAdapter.getStorage().cards.my[x]);
            }
            this.cards = tempcards;
        });


        /**Menu in Header**/
        this.actions = [
            {name: 'Auto-Refresh', icon: this.syncicon, identifier: 'refresh'},
            {name: 'Logout', icon: 'clear', identifier: 'logout'}
        ];
        this.more = [
            {name: 'Submit Feature Request', icon: 'wb_incandescent', identifier: 'feature'},
            {name: 'Report a Problem', icon: 'report_problem', identifier: 'bug'},
            {name: 'Delete all Settings', icon: 'delete', identifier: 'reset'}
        ];


        /**welcome Text**/
        if (this.WebStorageAdapter.getStorage().me) {
            this.name = this.WebStorageAdapter.getStorage().me.fullName;
            this.id = this.WebStorageAdapter.getStorage().me.id;
        } else {
            this.name = 'please login';
        }

        this.checkClosingForm = () => {
            if (true) {
                this.toggleRight();
            }
        };
    }


    /**filter for Overviews**/
   public cardSelected = (card) =>{
        let boards = this.WebStorageAdapter.getStorage().boards;
        if (_.find(boards, {'id': card.idBoard})) {
            return _.find(this.WebStorageAdapter.getStorage().boards, {'id': card.idBoard}).enabled;
        }
        return false;
    };

    public isOverdue(card) {
        if (card.due !== null && new Date(card.due) < new Date()) {
            return true;
        }
        return false;
    };

    public isNoduedate(card) {
        if (!card.due) {
            //toDo add idMembers to card
            //for (var i = 0; i <= card.idMembers.length; i++) {
            //    if (card.idMembers[i] === this.id) {
            //        return true;
            //    }
            //}
            return true;
        }
        return false;
    };

    public click(shortUrl) {
        this.$window.open(shortUrl);
    };


    public listItemClick(identifier) {
        var url = 'https://github.com/w11k/trello-calendar';
        switch (identifier) {
            case 'logout':
                this.logout();
                break;
            case 'refresh':
                var storage = this.WebStorageAdapter.getStorage();
                storage.me.autorefresh = !storage.me.autorefresh;
                this.WebStorageAdapter.setStorage(storage);
                if (storage.me.autorefresh === true) {
                    this.syncicon = 'sync';
                }
                else {
                    this.syncicon = 'sync_disabled';
                }
                this.actions = [
                    {name: 'Auto-Refresh', icon: this.syncicon, identifier: 'refresh'},
                    {name: 'Logout', icon: 'clear', identifier: 'logout'}
                ];
                break;
            case 'feature':
                window.open(url, '_blank');
                break;
            case 'bug':
                window.open(url, '_blank');
                break;
            case 'reset':
                this.WebStorageAdapter.removeStorage();
                this.$window.location.reload();
                break;
        }
        this.$mdBottomSheet.hide(identifier);
    };


    public toggleSidenav(menuId) {
        this.$mdSidenav(menuId).toggle();
    };

    public closeSidenav(menuId) {
        this.$mdSidenav(menuId).close();
    };

    public openSidenav(menuId) {
        this.$mdSidenav(menuId).open();
    };

    public goTo(target) {
        this.$location.path('/' + target);
        this.toggleSidenav('left');

    };

    public sortableOptions = {
        receive: (e, ui) => {
            var id = ui.item[0].children[1].id.split('-')[0];
            this.ngProgress.start();
            var str = e.target.id + ui.item[0].children[1].id.split('-')[1];
            var newStr = [];

            angular.forEach(str.split(','), function (value) {
                newStr.push(parseInt(value));
            });
            if (!newStr[3]) {
                newStr[3] = 12;
                newStr.push(0);
                newStr.push(0);
            }
            var targetDate = new Date(newStr[0], newStr[1] - 1, newStr[2], newStr[3], newStr[4]);

            this.changeDate.async(id, targetDate).then(() => {
                    this.initService.updateDate(id, targetDate);
                    this.ngProgress.complete();
                },
                () => {
                    var dialog = () => {
                        this.$mdDialog.show(
                            this.$mdDialog.alert()
                                .parent(angular.element(document.body))
                                .title('Oops, something went wrong.')
                                .textContent('please check your connection and reload this page')
                                .ariaLabel('Connection Error')
                                .ok('reload')
                            //  .targetEvent(ev)
                        ).then(() => {
                            this.changeDate.async(ui.item[0].firstElementChild.id.split('-')[0], targetDate).then(function () {
                                // user is only, successfull
                            }, function () {
                                dialog();

                            });
                        });
                    };
                    dialog();
                });

        },
        placeholder: 'card',
        connectWith: '.dayCards'

    };

    public logout() {
        this.initService.remove();
        this.login = false;
        this.$location.path('/');
    };

    public toHome() {
        this.$location.path('/app/month');

    };

    public openCardOverdued() {
        if (this.overduedHeader === {} || !this.overduedHeader) {
            this.overduedHeader = {'background-color': '#CF513D'};
            this.overduedIcon = {fill: 'white'};
            this.overduedTitle = {color: 'white'};
            this.overduedContent = {height: 'auto'};
            //this.overduedContent = {'max-height': '160px',height:'auto','overflow-y':'scroll'};
        }
        else {
            this.overduedHeader = null;
            this.overduedIcon = null;
            this.overduedTitle = null;
            this.overduedContent = null;

        }
    };

    public openCardnoDue() {
        if (this.nodueHeader === {} || !this.nodueHeader) {
            this.nodueHeader = {'background-color': '#42548E'};
            this.nodueIcon = {fill: 'white'};
            this.nodueTitle = {color: 'white'};
            this.nodueContent = {height: 'auto'};

        }
        else {
            this.nodueHeader = null;
            this.nodueIcon = null;
            this.nodueTitle = null;
            this.nodueContent = null;

        }
    };

    public toggleRight() {
        this.$mdSidenav('right').toggle().then(() => {
            this.keepOpen = !this.keepOpen;
            if (this.keepOpen) {
                angular.element('md-backdrop.md-sidenav-backdrop-custom').removeClass('disabled');
            }
            else {
                angular.element('md-backdrop.md-sidenav-backdrop-custom').addClass('disabled');
            }
        });
    }
}

appModule.controller('headerCtrl', HeaderCtrl);
