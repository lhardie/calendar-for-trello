'use strict';

import {appModule} from "../app";
import ISidenavService = angular.material.ISidenavService;
import {WebStorageAdapter} from "../services/WebStorageAdapter";
import IDialogService = angular.material.IDialogService;

export class AppCtrl {
    private offline: boolean;
    private toolbar;
    private keepOpen: boolean;
    private checkClosingForm: Function;
    private keyHandler: Function;
    constructor(private $scope: ng.IScope, private $rootScope: ng.IRootScopeService,
                private ngProgress, private initService, private $mdSidenav: ISidenavService,
                private WebStorageAdapter: WebStorageAdapter, private $window: ng.IWindowService) {
        "ngInject";

        console.log('AppCtrl');

        window.Offline.options = {
            checks: {xhr: {url: '/'}},
            checkOnLoad: false,
            interceptRequests: false,
            reconnect: false,
            requests: true,
            game: false
        };

        window.addEventListener('offline', () => {
            window.Offline.on('down', () => {
                console.debug('Trello Calendar is offline now.');
                this.offline = true;
                this.toolbar = {'background-color': '#B04632'};
                $scope.$apply();

            });

        });
        window.addEventListener('online', () => {
            window.Offline.on('up', () => {
                console.debug('Trello Calendar is online now.');

                this.toolbar = {'background-color': '#42548E'};
                this.offline = false;
                $rootScope.$broadcast('updateChange');
                initService.refreshAll();

            });

        });

        if (WebStorageAdapter.hasStorage()) {

            this.ngProgress.color('#CF513D');
            $rootScope.$on('$stateChangeSuccess', () => {
                ngProgress.complete();
            });
            $rootScope.$on('$stateChangeStart', () => {
                this.ngProgress.start();
            });

            this.keyHandler = function (e) {
                var event = window.event ? window.event : e;
                if (event.keyCode === 114) {
                    console.log('reload');
                    $rootScope.$broadcast('reload');
                }
            };

            $rootScope.$on('reload', () => {
                this.ngProgress.start();
                initService.refresh().then(() => {
                    this.ngProgress.complete();
                });
            });
            this.keepOpen = false;

            this.checkClosingForm = () => {
                if (true) {
                    this.toggleRight();
                }
            };
        }
    }


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


    public drop(item) {
        console.log('item: ', item.id);
        //console.log('item: ',);
        console.log(document.getElementById(item.id + '-12,0,0').parentNode.parentNode.id);
    }

}

appModule.controller('AppCtrl', AppCtrl)    ;