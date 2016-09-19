'use strict';
import * as _ from 'lodash';
import moment from 'moment';
import {WebStorageAdapter, Cards} from './WebStorageAdapter';
import {appModule} from '../app';


export class InitService {
    private token;
    private login;
    private me;
    private data;
    private colorizeCards = true;
    private observer = false;
    private autorefresh = true;
    private version: string = '0.1.41';

    constructor(private $q: ng.IQService, private ngProgress, private WebStorageAdapter: WebStorageAdapter,
                private $http: ng.IHttpService,
                private $rootScope: ng.IRootScopeService, private $window: ng.IWindowService,
                private baseUrl, private AppKey) {
        "ngInject";

        /**
         *Init variables
         */

        // let key = AppKey;
        this.token = WebStorageAdapter.getToken();
        this.login = $q.defer();
    }

    /**
     *firstInit pulls the userinformation and board colors
     * fields: fullName, id  fields: color,id,...
     * */
    private firstInit() {
        this.ngProgress.start();
        let deferred = this.$q.defer();
        let TrelloCalendarStorage = this.WebStorageAdapter.getStorage();
        let cache = this.WebStorageAdapter.getStorage();
        this.me = this.$http.get('https://api.trello.com/1/members/me?fields=fullName&key=' + this.AppKey + '&token=' + this.token);
        // this.colors = this.$http.get('https://api.trello.com/1/members/me/boardBackgrounds?key=' + this.AppKey + '&token=' + this.token);
        // this.$q.all([this.me, this.colors]).then((responses) => {
        this.me.then((responses) => {

            TrelloCalendarStorage.me = responses[0].data;
         /*   TrelloCalendarStorage.colors = {};
            for (let x in responses[1].data) {
                if (responses[1].data[x].type === 'default') {
                    TrelloCalendarStorage.colors[responses[1].data[x].id] = responses[1].data[x];
                }
            }*/

            if (cache.me) {
                if (cache.me.observer === undefined) {
                    TrelloCalendarStorage.me.observer = this.observer;
                } else {
                    TrelloCalendarStorage.me.observer = cache.me.observer;
                }
                if (cache.me.colorizeCards === undefined) {
                    TrelloCalendarStorage.me.colorizeCards = this.colorizeCards;
                } else {
                    TrelloCalendarStorage.me.colorizeCards = cache.me.colorizeCards;
                }
                if (cache.me.version === undefined) {
                    TrelloCalendarStorage.me.version = this.version;
                } else {
                    TrelloCalendarStorage.me.version = cache.me.version;
                }
                if (cache.me.autorefresh === undefined) {
                    TrelloCalendarStorage.me.autorefresh = this.autorefresh;
                    console.log('refresh init ');

                } else {
                    TrelloCalendarStorage.me.autorefresh = cache.me.autorefresh;

                }
            } else {
                TrelloCalendarStorage.me.observer = this.observer;
                TrelloCalendarStorage.me.colorizeCards = this.colorizeCards;
                TrelloCalendarStorage.me.version = this.version;
                TrelloCalendarStorage.me.autorefresh = this.autorefresh;
            }

            if (!TrelloCalendarStorage.boards) {
                TrelloCalendarStorage.boards = [];
            }
            if (!TrelloCalendarStorage.cards) {
                TrelloCalendarStorage.cards = new Cards();
            }
            if (!TrelloCalendarStorage.cards.all) {
                TrelloCalendarStorage.cards.all = [];
            }
            if (!TrelloCalendarStorage.cards.my) {
                TrelloCalendarStorage.cards.my = [];
            }
            TrelloCalendarStorage.cards = {
                'all': TrelloCalendarStorage.cards.all,
                'my': TrelloCalendarStorage.cards.my
            };
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

                _.forEach(responses.data, (board) => {
                    let boardFromStorage: Board = TrelloCalendarStorage.boards[board.id];
                    if (boardFromStorage) {
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
                        TrelloCalendarStorage.boards[board.id] = board;
                        boardFromStorage.enabled = true;

                    }
                });
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
        let listRequests = [];
        let alllists = [];
        _.forEach(TrelloCalendarStorage.boards, (board) => {
            listRequests.push(this.$http.get('https://api.trello.com/1/boards/'
                + board.id + '/lists/?fields=name&filter=open&key=' + this.AppKey + '&token=' + this.token));
        });
        this.$q.all(listRequests).then((responses) => {
            _.forEach(responses, (lists) => {
                alllists = alllists.concat(lists.data);
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
        let TrelloCalendarStorage = this.WebStorageAdapter.getStorage();
        if (TrelloCalendarStorage.me.observer && TrelloCalendarStorage.me.observer === true) {
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
            let myCards = responses.data;
            for (let card in myCards) {
                if (TrelloCalendarStorage.boards[myCards[card].idBoard]) {
                    myCards[card].boardName = (TrelloCalendarStorage.boards[myCards[card].idBoard]).name;
                    let dueDay = myCards[card].due;
                    myCards[card].dueDay = new Date(new Date(dueDay).setHours(0, 0, 0, 0)).toUTCString();
                    myCards[card].color = (TrelloCalendarStorage.boards[myCards[card].idBoard]).prefs.backgroundColor;
                    myCards[card].boardUrl = (TrelloCalendarStorage.boards[myCards[card].idBoard]).shortUrl;

                }
                if (TrelloCalendarStorage.lists[myCards[card].idList]) {
                    myCards[card].listName = (TrelloCalendarStorage.lists[myCards[card].idList]).name;
                }

            }

            TrelloCalendarStorage.cards.my = _.keyBy(myCards, 'id');
            this.WebStorageAdapter.setStorage(TrelloCalendarStorage);
            deferred.resolve('myCards');
            this.login.resolve('myCards');

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
    private pullAllCards() {
        let deferred = this.$q.defer();
        let TrelloCalendarStorage = this.WebStorageAdapter.getStorage();
        let cardRequests = [];
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

            for (let card in allCards) {

                if (TrelloCalendarStorage.boards[allCards[card].idBoard]) {

                    allCards[card].boardName = (TrelloCalendarStorage.boards[allCards[card].idBoard]).name;
                    let dueDay = allCards[card].due;
                    allCards[card].dueDay = new Date(new Date(dueDay).setHours(0, 0, 0, 0)).toUTCString();
                    allCards[card].color = (TrelloCalendarStorage.boards[allCards[card].idBoard]).prefs.backgroundColor;
                    allCards[card].boardUrl = (TrelloCalendarStorage.boards[allCards[card].idBoard]).shortUrl;
                }
                if (TrelloCalendarStorage.lists[allCards[card].idList]) {
                    allCards[card].listName = (TrelloCalendarStorage.lists[allCards[card].idList]).name;
                }
            }
            TrelloCalendarStorage.cards.all = _.keyBy(allCards, 'id');
            this.WebStorageAdapter.setStorage(TrelloCalendarStorage);
            this.login.resolve('allCards');
            deferred.resolve('allCards');
        }, () => {
            deferred.reject('allCards error');
        });
        return deferred.promise;
    };

    /**
     * update() updates boards, lists, and cards
     */
    private update() {
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

    private updateAll() {
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
        for (let x in storage.cards.my) {
            BoardId = storage.cards.my[x].idBoard;

            if (storage.boards[BoardId]) {
                storage.cards.my[x].color = storage.boards[BoardId].prefs.backgroundColor;
            }

        }
        for (let y in storage.cards.all) {
            BoardId = storage.cards.all[y].idBoard;

            if (storage.boards[BoardId]) {
                storage.cards.all[y].color = storage.boards[BoardId].prefs.backgroundColor;
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
                    '&expiration=never&name=Calendar+for+Trello', '_blank', 'location=no', 'toolbar=no');
                ref.addEventListener('loadstart', (event) => {
                    if (event.url.indexOf('/#token=') > -1) {
                        this.token = event.url.substring((event.url.indexOf('/#token=') + 8));
                        ref.close();
                        this.firstInit().then(() => {
                            this.updateAll();
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
                        this.updateAll().then(() => {
                            this.ngProgress.complete();
                            this.login.resolve('not exist');
                        });
                    });
                });
            } else {
                this.updateAll().then(() => {});
                this.login.resolve('exists');

            }
        }
        return this.login.promise;
    }

    public refresh() {
        this.login = this.$q.defer();
        this.update().then(() => {},
            () => {
                console.log('failed refresh');
            });

        return this.login.promise;
    }

    public remove() {
        this.data = null;
        this.WebStorageAdapter.setToken(null);
    }

    public refreshAll() {
        this.login = this.$q.defer();
        this.updateAll().then(() => {
            },
            () => {
                console.log('failed refreshAll');
            });
        return this.login.promise;
    }

    public updateDate() {
        this.$rootScope.$broadcast('refresh');
    }
}

appModule.service('initService', InitService);