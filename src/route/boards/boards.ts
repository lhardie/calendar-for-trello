'use strict';
import {InitService} from '../../services/initService';
import {TrelloCalendarStorage, WebStorageAdapter} from '../../services/WebStorageAdapter';
import {Dictionary} from 'lodash';
import {ColorService} from '../../services/ColorService';
class BoardsCtrl {

    private storage: TrelloCalendarStorage;
    private boards = [];
    private colors:Dictionary<TrelloColor>;
    private colorizeCards;

    /* @ngInject */
    constructor(private $rootScope, private WebStorageAdapter: WebStorageAdapter,
                private ColorService: ColorService) {

        this.storage = WebStorageAdapter.getStorage();
        this.colorizeCards = WebStorageAdapter.getStorage().me.colorizeCards;
        this.colors = WebStorageAdapter.getColors();
        this.update();

    }


    private update() {
        this.WebStorageAdapter.setStorage(this.storage);
        this.ColorService.updateCardColorsInLocalStorage();
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

        /*this.colors = [];
        for (var y in this.storage.colors) {
            this.colors.push(this.storage.colors[y]);
        }*/

    }

    setColor(colorId, boardId) {
        this.storage.boards[boardId].prefs.backgroundColor = this.colors[colorId].color;
        this.storage.boards[boardId].prefs.background = this.colors[colorId].id;
        this.update();
    };

    change(index, state) {
        // this.colors[index].enabled = state;
        this.storage.boards[this.boards[index].id].enabled = state;
        this.update();
    };

}

angular.module('trelloCal.boards', []).controller('boardsCtrl', BoardsCtrl);

