'use strict';
import * as _ from 'lodash';
import moment from 'moment'

import {appModule} from "../../app";
import {CalService} from "../../services/CalService";
import {ChangeDateService} from "../../services/changeDate";
import SortableEvents = angular.ui.SortableEvents;
import SortableOptions = angular.ui.SortableOptions;

var month = angular.module('trelloCal.month', []);
month.config(/*ngInject*/ function (toastrConfig) {
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

// props: https://github.com/angular/material/issues/4334#issuecomment-152551028
month.directive('myClick', function ($parse) {
    return {
        restrict: 'A',
        compile: function ($element, attrs) {
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

class CalDate {

    constructor(public year: number, public month: number) {

    }

    monthName() {
        return moment.months()[this.month];
    }
}

class MonthController {
    private today: CalDate;
    private date: CalDate;
    private days;
    private weekdays;
    private isToday;

    private ExistingBoards;
    private selectall;
    private tempPost: Array<any>;
    private offline;
    private searchText: string;
    private boards;

    public sortableOptions;

    constructor(private $interval: ng.IIntervalService, private toastr,
                $scope: ng.IScope, private CalService: CalService, private changeDate: ChangeDateService,
                private $window: ng.IWindowService,
                private orderByFilter, private ngProgress, private initService, private $q: ng.IQService,
                private $rootScope: ng.IRootScopeService,
                private webStorage) {
        "ngInject";


        let newDate = new Date();
        this.date = new CalDate(newDate.getFullYear(), newDate.getMonth());
        this.today = new CalDate(newDate.getFullYear(), newDate.getMonth());
        this.isToday = (this.date.year === this.today.year && this.date.month === this.today.month);

        this.tempPost = [];
        this.ExistingBoards = this.webStorage.get('TrelloCalendarStorage').boards;

        /**top legende**/
        this.weekdays = [];
        for (let i = 0; i <= 6; i++) {
            let long = moment().weekday(i).format('dddd');
            let short = moment().weekday(i).format('dd');
            this.weekdays[i] = [short, long];
        }

        this.addWatchers($interval, $scope, orderByFilter);
        this.createSortableOptions();
    }

    private addWatchers($interval: angular.IIntervalService, $scope, orderByFilter) {
        if (this.webStorage.get('TrelloCalendarStorage').me.autorefresh) {
            $interval(() => {
                this.refresh();
            }, 30000, 0, false);
        }

        $scope.$on('rebuild', () => {
            this.routine(this.date);
        });
        this.selectall = true;

        $scope.$on('updateChange', this.updateChangeArray);
        this.routine(this.date);

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
                    newStr.push(parseInt(value));
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
                var element = document.getElementById(event.target.id);
                if (event.target.id !== ui.item[0].parentElement.id) {
                    var children = element.children;
                    _.forEach(children, function (child) {
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
                _.forEach(children, function (child) {
                    child.style.transform = 'scale(1)';
                });
            }
        };

        this.sortableOptions = sortableOptionsAny;
    }

    public refresh() {
        if (this.offline !== true) {
            this.ngProgress.start();
            this.initService.refresh().then(() => {
                    this.$rootScope.$broadcast('rebuild');
                    this.ngProgress.complete();
                }
            );
        }
        else {
            console.log('offline');
        }
    }

    public reloadView() {
        this.ngProgress.start();
        this.$rootScope.$broadcast('rebuild');
        this.ngProgress.complete();
    }

    private routine(date, defer?) {
        this.initService.refreshColors();
        this.CalService.refresh();
        this.days = [];
        this.days = this.CalService.build(date).days;
        this.date = new CalDate(date.year, date.month);
        this.isToday = (date.year === this.today.year && date.month === this.today.month);
        this.searchText = null;
        this.boards = this.CalService.boards();
        this.ExistingBoards = this.webStorage.get('TrelloCalendarStorage').boards;
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
        this.date = this.today;
        this.routine(this.date);
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

        let year = this.date.year;
        let month = (this.date.month + steps);
        if (month >= 12) {
            month = 0;
            year++;
        } else if (month <= -1) {
            month = 11;
            year--;
        }

        this.date = new CalDate(year, month);
        this.routine(this.date, defer);
        defer.promise.then(() => {
            this.ngProgress.complete();
        });
    };

    public activeBoard(card) {
        var existingBoard = this.ExistingBoards[card.idBoard];
        if (existingBoard !== undefined) {
            return existingBoard.enabled;
        }

    };


    public filterClick(id) {
        let temp = _.find(this.webStorage.get('TrelloCalendarStorage').boards, {'id': id}).enabled;
        var Storage = this.webStorage.get('TrelloCalendarStorage');
        Storage.boards[id].enabled = !temp;
        this.webStorage.set('TrelloCalendarStorage', Storage);
        this.reloadView();
    };


    public allSelectClick() {
        var Storage = this.webStorage.get('TrelloCalendarStorage');
        var board;
        if (this.selectall) {
            for (board in Storage.boards) {
                Storage.boards[board].enabled = true;
            }
        }
        else {
            for (board in Storage.boards) {
                Storage.boards[board].enabled = false;
            }
        }
        this.selectall = !this.selectall;

        this.webStorage.set('TrelloCalendarStorage', Storage);
        this.reloadView();
    };

    public observeClick() {
        var temp = this.webStorage.get('TrelloCalendarStorage');
        temp.me.observer = !temp.me.observer;
        this.webStorage.set('TrelloCalendarStorage', temp);
        if (temp.me.observer === true) {
            if (_.isEmpty(temp.cards.all)) {
                this.reloadView();
            }
        }
        else {
            if (_.isEmpty(temp.cards.my)) {
                this.reloadView();
            }
        }

        this.reloadView();
    }
}
appModule.controller('monthCtrl', MonthController);
