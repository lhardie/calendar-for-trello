'use strict';
import * as _ from 'lodash';
import {WebStorageAdapter, Cards, Me, TrelloCalendarStorage} from './WebStorageAdapter';
import {appModule} from '../app';
import IHttpPromise = angular.IHttpPromise;
import {TrelloCalRootScope} from '../config/trelloCal.run';


export class InitService {
    private token;

    constructor(private $q: ng.IQService, private ngProgress, private WebStorageAdapter: WebStorageAdapter,
                private $http: ng.IHttpService,
                private $rootScope: TrelloCalRootScope, private $window: ng.IWindowService,
                private baseUrl, private AppKey) {
        'ngInject';

        /**
         *Init variables
         */

        // let key = AppKey;
        this.token = WebStorageAdapter.getToken();
    }

    /**
     *firstInit pulls the userinformation and board colors
     * fields: fullName, id  fields: color,id,...
     * */
    private firstInit() {
        this.ngProgress.start();
        let deferred = this.$q.defer();
        let TrelloCalendarStorage = this.WebStorageAdapter.getStorage();

        let me = this.$http.get('https://api.trello.com/1/members/me?fields=fullName&key=' + this.AppKey + '&token=' + this.token);
        let colors = this.$http.get('https://api.trello.com/1/members/me/boardBackgrounds?key=' + this.AppKey + '&token=' + this.token);
        this.$q.all([me, colors]).then((responses) => {

            TrelloCalendarStorage.me = responses[0].data;
            TrelloCalendarStorage.colors = {};
            for (let x in responses[1].data) {
                if (responses[1].data[x].type === 'default') {
                    TrelloCalendarStorage.colors[responses[1].data[x].id] = responses[1].data[x];
                }
            }


            let meFromTrello: TrelloMe = responses[0].data as TrelloMe;
            let meFromCache = TrelloCalendarStorage.me;


            if (meFromCache) {
                let tempMe = new Me();
                if (meFromCache.observer === undefined) {
                    TrelloCalendarStorage.me.observer = tempMe.observer;
                }
                if (meFromCache.colorizeCards === undefined) {
                    TrelloCalendarStorage.me.colorizeCards = tempMe.colorizeCards;
                }
                if (meFromCache.version === undefined) {
                    TrelloCalendarStorage.me.version = tempMe.version;
                }
                if (meFromCache.autorefresh === undefined) {
                    TrelloCalendarStorage.me.autorefresh = tempMe.autorefresh;
                }

                if (meFromCache.fullName === undefined) {
                    TrelloCalendarStorage.me.fullName = meFromTrello.fullName;
                }

                if (meFromCache.id === undefined) {
                    TrelloCalendarStorage.me.id = meFromTrello.id;
                }
            } else {
                TrelloCalendarStorage.me = new Me(meFromTrello.fullName, meFromTrello.id);
            }


            if (!TrelloCalendarStorage.colors) {
                TrelloCalendarStorage.colors = {};
            }
            if (!TrelloCalendarStorage.boards) {
                TrelloCalendarStorage.boards = {};
            }
            if (!TrelloCalendarStorage.cards) {
                TrelloCalendarStorage.cards = new Cards();
            }
            if (!TrelloCalendarStorage.cards.all) {
                TrelloCalendarStorage.cards.all = {};
            }
            if (!TrelloCalendarStorage.cards.my) {
                TrelloCalendarStorage.cards.my = {};
            }

            this.WebStorageAdapter.setStorage(TrelloCalendarStorage);
            this.ngProgress.complete();
            deferred.resolve('init');

        }, () => {
            deferred.reject('init error');
        });
        return deferred.promise;
    }


    /**
     *pullBoards pulls open Boards from Trello
     *fields: name, shortUrl, id, prefs {background,backgroundColor,...}
     * */
    private pullBoards() {
        let deferred = this.$q.defer();
        let TrelloCalendarStorage = this.WebStorageAdapter.getStorage();
        let temp = this.WebStorageAdapter.getStorage();

        this.$http.get(
            'https://api.trello.com/1/members/me/boards/?fields=name,shortUrl,prefs&filter=open&key='
            + this.AppKey + '&token=' + this.token)
            .then((responses) => {

                _.forEach(responses.data, (board: Board) => {
                    let boardFromStorage: Board = TrelloCalendarStorage.boards[board.id];
                    if (boardFromStorage !== undefined) {
                        boardFromStorage.name = board.name;
                        boardFromStorage.shortUrl = board.shortUrl;
                        boardFromStorage.id = board.id;
                        boardFromStorage.prefs = board.prefs;
                        boardFromStorage.prefs.background = temp.boards[board.id].prefs.background;
                        boardFromStorage.prefs.backgroundColor = temp.boards[board.id].prefs.backgroundColor;
                        if (boardFromStorage.enabled === undefined) {
                            boardFromStorage.enabled = true;
                        }

                    } else {
                        board.enabled = true;
                        TrelloCalendarStorage.boards[board.id] = board;
                        // console.log(board);
                        // console.log(TrelloCalendarStorage);
                    }
                });

                // console.log(TrelloCalendarStorage);
                this.WebStorageAdapter.setStorage(TrelloCalendarStorage);
                deferred.resolve('boards');
            }, () => {
                deferred.reject('boards error');
            });
        return deferred.promise;
    }

    /**
     *pullLists pulls open Lists from Trello
     *fields: id, name
     * */
    private pullLists() {
        let deferred = this.$q.defer();
        let TrelloCalendarStorage = this.WebStorageAdapter.getStorage();
        let listRequests: Array<IHttpPromise<TrelloList>> = [];
        let alllists = [];
        _.forEach(TrelloCalendarStorage.boards, (board) => {
            listRequests.push(this.$http.get('https://api.trello.com/1/boards/'
                + board.id + '/lists/?fields=name&filter=open&key=' + this.AppKey + '&token=' + this.token));
        });
        this.$q.all(listRequests).then((responses) => {
            _.forEach(responses, (response) => {
                alllists = alllists.concat(response.data);
            });
            TrelloCalendarStorage.lists = _.keyBy(alllists, 'id');
            this.WebStorageAdapter.setStorage(TrelloCalendarStorage);
            deferred.resolve('lists');
        }, () => {
            deferred.reject('lists error');

        });
        return deferred.promise;
    };

    /**
     *switches between pull my/all Cards
     */
    private pullCards() {
        let deferred = this.$q.defer();
        let me = this.WebStorageAdapter.getStorage().me;
        if (me.observer && me.observer === true) {
            this.pullAllCards().then(() => {
                deferred.resolve();
            }, (error) => {
                deferred.reject(error);
            });
        } else {
            this.pullMyCards().then(() => {
                deferred.resolve();
            }, (error) => {
                deferred.reject(error);
            });
        }

        return deferred.promise;
    };

    /**
     *pullMyCards pulls open Cards from Trello
     *if me/observer is false
     *fields: id, name,idList,dateLastActivity,shortUrl,due,idBoard
     * */
    private pullMyCards() {
        let deferred = this.$q.defer();
        let TrelloCalendarStorage = this.WebStorageAdapter.getStorage();
        this.$http.get('https://api.trello.com/1/members/me/cards/' +
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

    /**
     *pullAllCards pulls open Cards from Trello
     *if me/observer is true
     *fields: id, name,idList,dateLastActivity,shortUrl,due,idBoard
     * */
    private pullAllCards() {
        let deferred = this.$q.defer();
        let TrelloCalendarStorage = this.WebStorageAdapter.getStorage();
        let cardRequests: Array<IHttpPromise<Card>> = [];
        let allCards = [];
        _.forEach(TrelloCalendarStorage.boards, (board) => {
            cardRequests.push(this.$http.get('https://api.trello.com/1/boards/' + board.id
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

    /**
     * update() updates boards, lists, and cards
     */
    public refresh() {
        this.ngProgress.start();
        let deferred = this.$q.defer();
        this.pullBoards().then(() => {
            this.pullLists().then(() => {
                this.pullCards().then(() => {
                    deferred.resolve('update');
                    this.ngProgress.complete();

                }, (error) => {
                    this.ngProgress.complete();
                    deferred.reject(error);
                });
            }, (error) => {
                this.ngProgress.complete();
                deferred.reject(error);
            });

        }, (error) => {
            this.ngProgress.complete();
            console.log(error);
            deferred.reject(error);
        }); //runs pullLists() and  pullCards();

        return deferred.promise;

    };

    public refreshAll() {
        this.ngProgress.start();
        let deferred = this.$q.defer();

        this.pullBoards().then(() => {
            this.pullLists().then(() => {
                this.$q.all([this.pullMyCards, this.pullAllCards]).then(() => {
                    this.ngProgress.complete();
                    deferred.resolve('update');
                }, (error) => {
                    this.ngProgress.complete();
                    deferred.reject(error);
                });
            }, (error) => {
                this.ngProgress.complete();
                deferred.reject(error);
            });

        }, (error) => {
            this.ngProgress.complete();
            console.log(error);
            deferred.reject(error);
        }); //runs pullLists() and  pullCards();

        return deferred.promise;
    };

    /**
     * refresh Card colors from changed Storage
     */
    public refreshColors() {
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


    public init() {

        if (!this.WebStorageAdapter.hasToken()) {
            if (this.$rootScope.mobil) {
                let redirect = this.baseUrl + '/app/token?do=settoken';
                let ref = window.open('https://trello.com/1/authorize?response_type=token&scope=read,write&key='
                    + this.AppKey + '&redirect_uri=' + redirect + '&callback_method=fragment' +
                    '&expiration=never&name=Calendar+for+Trello', '_blank', 'location=no, toolbar=no');
                ref.addEventListener('loadstart', (event) => {
                    if (event.url.indexOf('/#token=') > -1) {
                        this.token = event.url.substring((event.url.indexOf('/#token=') + 8));
                        ref.close();
                        this.firstInit().then(() => {
                            this.refreshAll();
                        });
                    }
                });
            } else {
                this.$window.location.href = 'https://trello.com/1/authorize?response_type=token&key='
                    + this.AppKey + '&redirect_uri=' + encodeURI(this.baseUrl + '/app')
                    + '%2Ftoken%3Fdo%3Dsettoken%26callback_method=fragment' +
                    '&scope=read%2Cwrite%2Caccount&expiration=never&name=Calendar+for+Trello';
            }
        } else {
            if (!this.WebStorageAdapter.hasStorage()) {
                this.WebStorageAdapter.initStorage();
                this.firstInit().then(() => {
                    this.firstInit().then(() => {
                        this.refreshAll().then(() => {
                            this.ngProgress.complete();
                        });
                    });
                });
            } else {
                this.refreshAll().then(() => {
                    // NO OP
                });

            }
        }
    }

    public remove() {
        this.WebStorageAdapter.setToken(null);
    }

    public updateDate() {
        this.$rootScope.$broadcast('refresh');
    }
}

appModule.service('initService', InitService);