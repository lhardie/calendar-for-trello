'use strict';
import * as _ from 'lodash';
import moment from 'moment';

import {appModule} from '../../app';
import {CalendarService} from '../../services/CalendarService';
import {ChangeDateService} from '../../services/changeDate';
import SortableEvents = angular.ui.SortableEvents;
import SortableOptions = angular.ui.SortableOptions;
import {WebStorageAdapter} from '../../services/WebStorageAdapter';
import {CalDate} from "../../models/calendar";
import {InitService} from '../../services/initService';
import {Dictionary} from 'lodash';
import {ColorService} from '../../services/ColorService';

let monthModule = angular.module('trelloCal.month', []);
monthModule.config(/*ngInject*/ function (toastrConfig) {
    angular.extend(toastrConfig, {
        autoDismiss: false,
        containerId: 'toast-container',
        maxOpened: 1,
        newestOnTop: true,
        positionClass: 'toast-bottom-left',
        preventDuplicates: false,
        preventOpenDuplicates: true,
        target: 'body',
        toastClass: 'toast'
    });
});

interface IMyClickAttrbitutes extends ng.IAttributes {
    myClick:any;
}

// props: https://github.com/angular/material/issues/4334#issuecomment-152551028
monthModule.directive('myClick', function ($parse) {
    return {
        restrict: 'A',
        compile: function ($element: JQuery, attrs: IMyClickAttrbitutes) {
            var fn = $parse(attrs.myClick, null, true);
            return function myClick(scope, element) {
                element.on('click', function (event) {
                    event.preventDefault();
                    var callback = function () {
                        fn(scope, {$event: event});
                    };
                    scope.$apply(callback);
                });
            };
        }
    };
});



class MonthController {
    private today: CalDate;
    private currentDate: CalDate;
    private days;
    private weekdays;
    private isToday;

    private ExistingBoards: Dictionary<Board>;
    private tempPost: Array<any> = [];
    private selectall: boolean = true;
    private offline;
    private searchText: string;
    private boards;

    public sortableOptions;

    constructor(private $interval: ng.IIntervalService, private toastr,
                $scope: ng.IScope, private CalendarService: CalendarService, private changeDate: ChangeDateService,
                private $window: ng.IWindowService, private ColorService: ColorService,
                private orderByFilter, private ngProgress, private initService: InitService, private $q: ng.IQService,
                private $rootScope: ng.IRootScopeService,
                private WebStorageAdapter: WebStorageAdapter) {
        'ngInject';


        let newDate = new Date();
        this.currentDate = new CalDate(newDate.getFullYear(), newDate.getMonth());
        this.today = new CalDate(newDate.getFullYear(), newDate.getMonth());

        /**top legende**/
        this.weekdays = [];
        for (let i = 0; i <= 6; i++) {
            let long = moment().weekday(i).format('dddd');
            let short = moment().weekday(i).format('dd');
            this.weekdays[i] = [short, long];
        }

        this.addWatchersAndLoadData($interval, $scope, orderByFilter);
        this.createSortableOptions();
    }

    private addWatchersAndLoadData($interval: angular.IIntervalService, $scope, orderByFilter) {
        if (this.WebStorageAdapter.getStorage().me.autorefresh) {
            $interval(() => {
                this.refresh();
            }, 30000, 0, false);
        }

        $scope.$on('rebuild', () => {
            this.refreshData(this.currentDate);
        });

        $scope.$on('updateChange', this.updateChangeArray);
        this.refreshData(this.currentDate);

        $scope.$watch('days', () => {
            _.forEach(this.days, (day) => {
                day.cards = orderByFilter(day.cards, ['due', 'name']);
            });
        }, true);
    }

    private createSortableOptions() {
        let sortableOptionsAny: SortableOptions<any> = {
            receive: (e, ui) => {
                var id = ui.item[0].children[1].id.split('-')[0];
                this.ngProgress.start();
                var str = e.target.id + ui.item[0].children[1].id.split('-')[1];
                var newStr = [];
                angular.forEach(str.split(','), function (value) {
                    newStr.push(parseInt(value, 0));
                });
                if (!newStr[3]) {
                    newStr[3] = 12;
                    newStr.push(0);
                    newStr.push(0);
                }
                var targetDate = new Date(newStr[0], newStr[1] - 1, newStr[2], newStr[3], newStr[4]);

                this.tempPost.push([id, targetDate]);
                this.updateChangeArray();

            },
            revert: true,
            placeholder: 'card',
            connectWith: '.dayCards',
            over: (event, ui) => {
                var element: HTMLElement = document.getElementById(event.target.id);
                if (event.target.id !== ui.item[0].parentElement.id) {
                    var children = element.children;
                    _.forEach(children, function (child: HTMLElement) {
                        child.style.transform = 'scale(0.8)';
                    });
                }
                element.style.borderColor = '#42548E';
                element.style.borderStyle = 'dashed';
                element.style.borderWidth = '3px';

            },
            out: (event) => {
                var element = document.getElementById(event.target.id);
                element.style.borderStyle = 'none';
                var children = element.children;
                _.forEach(children, function (child: HTMLElement) {
                    child.style.transform = 'scale(1)';
                });
            }
        };

        this.sortableOptions = sortableOptionsAny;
    }

    public refresh() {
        if (this.offline !== true) {
            this.ngProgress.start();
            // first load Date from Trello to Webstorage
            this.initService.refresh().then(() => {

                //2nd put it here
                    this.$rootScope.$broadcast('rebuild');
                    this.ngProgress.complete();
                }
            );
        } else {
            console.log('offline');
        }
    }

    public reloadView() {
        this.ngProgress.start();
        this.$rootScope.$broadcast('rebuild');
        this.ngProgress.complete();
    }

    //TODO jblankenhorn 22.09.16 what does it really do?
    private refreshData(date, defer?) {
        this.ColorService.updateCardColorsInLocalStorage();
        this.days = this.CalendarService.days(date);
        this.currentDate = new CalDate(date.year, date.month);
        this.isToday = (date.year === this.today.year && date.month === this.today.month);
        this.searchText = null;
        this.boards = this.CalendarService.boards();
        this.ExistingBoards = this.WebStorageAdapter.getStorage().boards;
        if (defer) {
            defer.resolve();
        }
    };

    private updateChangeArray() {
        var promises = [];
        _.forEach(this.tempPost, (change) => {
            promises.push(this.changeDate.async(change[0], change[1]));
        });
        this.$q.all(promises).then((responses) => {
            _.forEach(responses, (change, index) => {
                this.tempPost.splice(index, 1);

            });
            this.refresh();
            this.ngProgress.complete();
            this.toastr.success('Successfully changed!');
        }, () => {
            this.toastr.warning('Your changes have been saved!');
        });
    }

    public toToday() {
        this.currentDate = this.today;
        this.refreshData(this.currentDate);
    };


    /**
     * Search for boards.
     */
    public querySearch(query) {
        var results = query ? this.boards.filter(this.createFilterFor(query)) : [];
        return results;
    }

    /**
     * Create filter function for a query string
     */
    private createFilterFor(query) {
        var lowercaseQuery = angular.lowercase(query);

        return function filterFn(board) {
            return (board._lowername.indexOf(lowercaseQuery) === 0);
        };

    }


    public click(shortUrl) {
        this.$window.open(shortUrl);
    };

    public move(steps) {
        this.ngProgress.start();

        var defer = this.$q.defer();

        let year = this.currentDate.year;
        let month = (this.currentDate.month + steps);
        if (month >= 12) {
            month = 0;
            year++;
        } else if (month <= -1) {
            month = 11;
            year--;
        }

        this.currentDate = new CalDate(year, month);
        this.refreshData(this.currentDate, defer);
        defer.promise.then(() => {
            this.ngProgress.complete();
        });
    };

    public activeBoard(card) {
        var existingBoard: Board = this.ExistingBoards[card.idBoard];
        if (existingBoard !== undefined) {
            return existingBoard.enabled;
        }

    };


    public filterClick(id) {
        let temp = _.find(this.WebStorageAdapter.getStorage().boards, {'id': id}).enabled;
        var storage = this.WebStorageAdapter.getStorage();
        storage.boards[id].enabled = !temp;
        this.WebStorageAdapter.setStorage(storage);
        this.reloadView();
    };


    public allSelectClick() {
        var Storage = this.WebStorageAdapter.getStorage();
        var board;
        if (this.selectall) {
            for (board in Storage.boards) {
                if (Storage.boards.hasOwnProperty(board)) {
                    Storage.boards[board].enabled = true;
                }
            }
        } else {
            for (board in Storage.boards) {
                if (Storage.boards.hasOwnProperty(board)) {
                    Storage.boards[board].enabled = false;
                }
            }
        }
        this.selectall = !this.selectall;

        this.WebStorageAdapter.setStorage(Storage);
        this.reloadView();
    };

    public observeClick() {
        var temp = this.WebStorageAdapter.getStorage();
        temp.me.observer = !temp.me.observer;
        this.WebStorageAdapter.setStorage(temp);
        if (temp.me.observer === true) {
            if (_.isEmpty(temp.cards.all)) {
                this.reloadView();
            }
        } else {
            if (_.isEmpty(temp.cards.my)) {
                this.reloadView();
            }
        }

        this.reloadView();
    }
}
appModule.controller('monthCtrl', MonthController);
