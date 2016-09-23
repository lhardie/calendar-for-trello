'use strict';
import * as _ from 'lodash';
import {WebStorageAdapter, Cards, Me, TrelloCalendarStorage} from './WebStorageAdapter';
import {appModule} from '../app';
import IHttpPromise = angular.IHttpPromise;
import {TrelloCalRootScope} from '../config/trelloCal.run';
import {ColorService} from './ColorService';
import {CardService} from './CardService';

export const TRELLO_API_URL = 'https://api.trello.com/1';

export class InitService {
    private token;

    constructor(private $q: ng.IQService, private ngProgress, private WebStorageAdapter: WebStorageAdapter,
                private $http: ng.IHttpService, private ColorService: ColorService,
                private CardService: CardService,
                private $rootScope: TrelloCalRootScope, private $window: ng.IWindowService,
                private baseUrl, private AppKey) {
        'ngInject';

        /**
         *Init variables
         */

        this.token = WebStorageAdapter.getToken();
    }

    /**
     *firstInit pulls the userinformation and board colors
     * fields: fullName, id  fields: color,id,...
     * */
    private firstInit() {
        this.ngProgress.start();
        this.ColorService.loadColorsFromTrello();

        let deferred = this.$q.defer();
        let TrelloCalendarStorage = this.WebStorageAdapter.getStorage();

        let mePromise = this.$http.get(TRELLO_API_URL + '/members/me?fields=fullName&key=' + this.AppKey + '&token=' + this.token);

        mePromise.then((response) => {

            let meFromTrello: TrelloMe = response.data as TrelloMe;
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
             TRELLO_API_URL + '/members/me/boards/?fields=name,shortUrl,prefs&filter=open&key='
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
            listRequests.push(this.$http.get(TRELLO_API_URL + '/boards/'
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
     * update() updates boards, lists, and cards
     */
    public refresh(all: boolean = false) {
        this.ngProgress.start();
        let deferred = this.$q.defer();
        this.pullBoards().then(() => {
            this.pullLists().then(() => {
                this.CardService.pullCards(all);
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
                            this.refresh(true);
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
                        this.refresh(true).then(() => {
                            this.ngProgress.complete();
                        });
                    });
                });
            } else {
                this.refresh(true).then(() => {
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