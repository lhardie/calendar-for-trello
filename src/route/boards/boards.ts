'use strict';
class BoardsCtrl {

    storage: any;
    boards = [];
    colors = [];

    /* @ngInject */
    constructor(private $scope, private webStorage, private initService) {

        this.storage = webStorage.get('TrelloCalendarStorage');

        $scope.colorizeCards = webStorage.get('TrelloCalendarStorage').me.colorizeCards;
        this.updateScope();

    }


    updateScope() {
        this.webStorage.set('TrelloCalendarStorage', this.storage);
        this.initService.refreshColors();
        this.$rootScope.$broadcast('rebuild');
        this.$scope.boards = [];
        for (var x in this.storage.boards) {
            this.$scope.boards.push(this.storage.boards[x]);
        }
        this.$scope.boards.sort(function (a, b) {
            var nameA = a.name.toLowerCase(), nameB = b.name.toLowerCase();
            if (nameA < nameB) //sort string ascending
            {
                return -1;
            }
            if (nameA > nameB) {
                return 1;
            }
            return 0; //default return value (no sorting)
        });
        this.$scope.colorizeCards = this.storage.me.colorizeCards;
        this.$scope.colors = [];
        for (var y in this.storage.colors) {
            this.$scope.colors.push(this.storage.colors[y]);
        }

    }


    changeColorize(x) {
        this.storage.me.colorizeCards = x;
        this.updateScope();
    };


    announceClick(index, id) {
        this.storage.boards[id].prefs.backgroundColor = this.$scope.colors[index].color;
        this.storage.boards[id].prefs.background = this.$scope.colors[index].id;
        this.updateScope();
    };

    change(index, state) {
        this.$scope.colors[index].enabled = state;
        this.storage.boards[this.$scope.boards[index].id].enabled = state;
        this.updateScope();
    };

}

angular.module('trelloCal.boards', []).controller('boardsCtrl', BoardsCtrl);

