'use strict';
import {InitService} from '../../services/initService';
class BoardsCtrl {

    private storage: any;
    private boards = [];
    private colors = [];
    private colorizeCards;

    /* @ngInject */
    constructor(private $rootScope, private WebStorageAdapter, private initService: InitService) {

        this.storage = WebStorageAdapter.getStorage();
        this.colorizeCards = WebStorageAdapter.getStorage().me.colorizeCards;
        this.update();

    }


    private update() {
        this.WebStorageAdapter.setStorage(this.storage);
        this.initService.refreshColors();
        this.$rootScope.$broadcast('rebuild');
        this.boards = [];
        for (var x in this.storage.boards) {
            this.boards.push(this.storage.boards[x]);
        }
        this.boards.sort(function (a, b) {
            var nameA = a.name.toLowerCase(), nameB = b.name.toLowerCase();
            if (nameA < nameB) {//sort string ascending
                return -1;
            }
            if (nameA > nameB) {
                return 1;
            }
            return 0; //default return value (no sorting)
        });
        this.colorizeCards = this.storage.me.colorizeCards;
        this.colors = [];
        for (var y in this.storage.colors) {
            this.colors.push(this.storage.colors[y]);
        }

    }


    // changeColorize(x) {
    //     this.storage.me.colorizeCards = x;
    //     this.updateScope();
    // };


    announceClick(index, id) {
        this.storage.boards[id].prefs.backgroundColor = this.colors[index].color;
        this.storage.boards[id].prefs.background = this.colors[index].id;
        this.update();
    };

    change(index, state) {
        this.colors[index].enabled = state;
        this.storage.boards[this.boards[index].id].enabled = state;
        this.update();
    };

}

angular.module('trelloCal.boards', []).controller('boardsCtrl', BoardsCtrl);

