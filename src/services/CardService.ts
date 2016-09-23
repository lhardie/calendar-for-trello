import * as _ from 'lodash';
import moment from 'moment';

import {appModule} from '../app';
import {Dictionary} from 'lodash';
import {WebStorageAdapter, TrelloCalendarStorage} from './WebStorageAdapter';
import IHttpPromise = angular.IHttpPromise;
import {TRELLO_API_URL} from './initService';


export class CardService {
    private token;

    constructor(private WebStorageAdapter: WebStorageAdapter, private $http: ng.IHttpService, private AppKey,
    private $q: ng.IQService) {
        'ngInject';
        this.token = WebStorageAdapter.getToken();
    }

    /**
     *switches between pull my/all Cards
     */
    public pullCards(all: boolean = false) {
        let deferred = this.$q.defer();
        let me = this.WebStorageAdapter.getStorage().me;
        let requests = [];


        if (all || me.observer === true) {
            requests.push(this.pullAllCards);
        }

        if (all || me.observer === false) {
            requests.push(this.pullMyCards);
        }

        this.$q.all(requests).then(() => {
            deferred.resolve('update');
        }, (error) => {
            deferred.reject(error);
        });

        return deferred.promise;
    };

    /**
     *pullMyCards pulls open Cards from Trello
     *if me/observer is false
     *fields: id, name,idList,dateLastActivity,shortUrl,due,idBoard
     * */
    public pullMyCards() {
        let deferred = this.$q.defer();
        let TrelloCalendarStorage = this.WebStorageAdapter.getStorage();
        this.$http.get(TRELLO_API_URL + '/members/me/cards/' +
            '?fields=idList,name,dateLastActivity,shortUrl,due,idBoard&filter=open&key='
            + this.AppKey + '&token=' + this.token).then((responses) => {
            let myCards: Array<Card> = responses.data as Array<Card>;

            myCards.forEach((card) => {
                this.enrichCard(TrelloCalendarStorage, card);
            });


            TrelloCalendarStorage.cards.my = _.keyBy(myCards, 'id');
            this.WebStorageAdapter.setStorage(TrelloCalendarStorage);
            deferred.resolve('myCards');

        }, () => {
            deferred.reject('myCards error');
        });

        return deferred.promise;

    };

    /**
     *pullAllCards pulls open Cards from Trello
     *if me/observer is true
     *fields: id, name,idList,dateLastActivity,shortUrl,due,idBoard
     * */
    public pullAllCards() {
        let deferred = this.$q.defer();
        let TrelloCalendarStorage = this.WebStorageAdapter.getStorage();
        let cardRequests: Array<IHttpPromise<Card>> = [];
        let allCards = [];
        _.forEach(TrelloCalendarStorage.boards, (board) => {
            cardRequests.push(this.$http.get(TRELLO_API_URL + '/boards/' + board.id
                + '/cards/?fields=idList,name,dateLastActivity,shortUrl,due,idBoard&filter=open&key='
                + this.AppKey + '&token=' + this.token));
        });
        this.$q.all(cardRequests).then((responses) => {
            _.forEach(responses, (lists) => {
                allCards = allCards.concat(lists.data);
            });

            allCards.forEach((card) => {
                this.enrichCard(TrelloCalendarStorage, card);
            });
            TrelloCalendarStorage.cards.all = _.keyBy(allCards, 'id');
            this.WebStorageAdapter.setStorage(TrelloCalendarStorage);
            deferred.resolve('allCards');
        }, () => {
            deferred.reject('allCards error');
        });
        return deferred.promise;
    };


    private enrichCard(TrelloCalendarStorage: TrelloCalendarStorage, card: Card) {
        if (TrelloCalendarStorage.boards[card.idBoard]) {
            card.boardName = (TrelloCalendarStorage.boards[card.idBoard]).name;
            let dueDay = card.due;
            card.dueDay = new Date(new Date(dueDay).setHours(0, 0, 0, 0)).toUTCString();
            card.color = (TrelloCalendarStorage.boards[card.idBoard]).prefs.backgroundColor;
            card.boardUrl = (TrelloCalendarStorage.boards[card.idBoard]).shortUrl;

        }
        if (TrelloCalendarStorage.lists[card.idList]) {
            card.listName = (TrelloCalendarStorage.lists[card.idList]).name;
        }
    }

}

appModule.service('CardService', CardService);