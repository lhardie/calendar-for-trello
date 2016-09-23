import * as _ from 'lodash';
import moment from 'moment';

import {appModule} from '../app';
import {Dictionary} from 'lodash';
import {WebStorageAdapter} from './WebStorageAdapter';


export class ColorService {
    private token;

    constructor(private WebStorageAdapter: WebStorageAdapter, private $http: ng.IHttpService, private AppKey) {
        'ngInject';
        this.token = WebStorageAdapter.getToken();
    }

    public loadColorsFromTrello() {
        let colors = this.WebStorageAdapter.getColors();

        let colorsPromise = this.$http.get('https://api.trello.com/1/members/me/boardBackgrounds?key='
            + this.AppKey + '&token=' + this.token);

        colorsPromise.then((response) => {

            if (!colors) {
                colors = {};
            }

            for (let x in response.data) {
                if (response.data[x].type === 'default') {
                    colors[response.data[x].id] = response.data[x];
                }
            }

            this.WebStorageAdapter.setColors(colors);
        });
    }

    /**
     * refresh Card colors from changed Storage
     */
    public updateCardColorsInLocalStorage() {
        let BoardId;
        let storage = this.WebStorageAdapter.getStorage();

        let myCards = storage.cards.my;
        for (let x in myCards) {
            if (myCards.hasOwnProperty(x)) {
                BoardId = myCards[x].idBoard;

                if (storage.boards[BoardId]) {
                    myCards[x].color = storage.boards[BoardId].prefs.backgroundColor;
                }
            }
        }

        let allCards = storage.cards.all;
        for (let y in allCards) {
            if (allCards.hasOwnProperty(y)) {
                BoardId = allCards[y].idBoard;

                if (storage.boards[BoardId]) {
                    allCards[y].color = storage.boards[BoardId].prefs.backgroundColor;
                }
            }
        }
        this.WebStorageAdapter.setStorage(storage);
    };


}

appModule.service('ColorService', ColorService);