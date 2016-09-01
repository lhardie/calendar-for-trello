///<reference path="../../node_modules/tslint/typings/underscore/underscore.d.ts"/>
"use strict";
import {appModule} from "../app";
import IRootScopeService = angular.IRootScopeService;


class InitService {
    private token: string;
    private login: any;
    private me: any;
    private data: any;
    private colors: any;

    private colorizeCards: boolean;
    private observer: boolean;
    private autorefresh: boolean;
    private version: string;

    constructor(private $q: ng.IQService, private ngProgress, private webStorage, private $http: ng.IHttpService,
                private $rootScope: ng.IRootScopeService, private $window, private baseUrl, private AppKey: string) {
        "ngInject"

        /**
         *Init variables
         */

        this.token = this.webStorage.get("trello_token");
        this.login = this.$q.defer();
        this.colorizeCards = true;
        this.observer = false;
        this.autorefresh = true;
        this.version = "0.1.41";
    }

    /**
     *firstInit pulls the userinformation and board colors
     * fields: fullName, id  fields: color,id,...
     * */
    private firstInit() {
        this.ngProgress.start();
        var deferred = this.$q.defer();
        this.token = this.webStorage.get("trello_token");
        var TrelloCalendarStorage = this.webStorage.get("TrelloCalendarStorage");
        var cache = this.webStorage.get("TrelloCalendarStorage");
        this.me = this.$http.get("https://api.trello.com/1/members/me?fields=fullName&key=" + this.AppKey + "&token=" + this.token);
        this.colors = this.$http.get("https://api.trello.com/1/members/me/boardBackgrounds?key=" + this.AppKey + "&token=" + this.token);
        this.$q.all([me, colors]).then((responses) =>{

            TrelloCalendarStorage.me = responses[0].data;
            TrelloCalendarStorage.colors = {};
            for (var x in responses[1].data) {
                if (responses[1].data[x].type === "default") {
                    TrelloCalendarStorage.colors[responses[1].data[x].id] = responses[1].data[x];
                }
            }

            if (cache.me) {
                if (cache.me.observer === undefined) {
                    TrelloCalendarStorage.me.observer = this.observer;
                }
                else {
                    TrelloCalendarStorage.me.observer = cache.me.observer;
                }
                if (cache.me.colorizeCards === undefined) {
                    TrelloCalendarStorage.me.boardColors = this.colorizeCards;
                }
                else {
                    TrelloCalendarStorage.me.colorizeCards = cache.me.colorizeCards;
                }
                if (cache.me.version === undefined) {
                    TrelloCalendarStorage.me.version = this.version;
                }
                else {
                    TrelloCalendarStorage.me.version = cache.me.version;
                }
                if (cache.me.autorefresh === undefined) {
                    TrelloCalendarStorage.me.autorefresh = this.autorefresh;
                    console.log("refresh init ");

                }
                else {
                    TrelloCalendarStorage.me.autorefresh = cache.me.autorefresh;

                }
            }
            else {
                TrelloCalendarStorage.me.observer = this.observer;
                TrelloCalendarStorage.me.colorizeCards = this.colorizeCards;
                TrelloCalendarStorage.me.version = this.version;
                TrelloCalendarStorage.me.autorefresh = this.autorefresh;
            }

            if (!TrelloCalendarStorage.boards) {
                TrelloCalendarStorage.boards = {};
            }
            if (!TrelloCalendarStorage.cards) {
                TrelloCalendarStorage.cards = {};
            }
            if (!TrelloCalendarStorage.cards.all) {
                TrelloCalendarStorage.cards.all = {};
            }
            if (!TrelloCalendarStorage.cards.my) {
                TrelloCalendarStorage.cards.my = {};
            }
            TrelloCalendarStorage.cards = {
                "all": TrelloCalendarStorage.cards.all,
                "my": TrelloCalendarStorage.cards.my
            };
            this.webStorage.set("TrelloCalendarStorage", TrelloCalendarStorage);
            this.ngProgress.complete();
            deferred.resolve("init");

        }, function () {
            deferred.reject("init error");
        });
        return deferred.promise;
    };
    /**
     *pullBoards pulls open Boards from Trello
     *fields: name, shortUrl, id, prefs {background,backgroundColor,...}
     * */
    private pullBoards() {
        var deferred = this.$q.defer();
        var TrelloCalendarStorage = this.webStorage.get("TrelloCalendarStorage");
        var temp = this.webStorage.get("TrelloCalendarStorage");

        this.$http.get("https://api.trello.com/1/members/me/boards/?fields=name,shortUrl,prefs&filter=open&key=" + this.AppKey + "&token=" + this.token)
            .then((responses) => {

                _.forEach(responses.data, (board) => {
                    if (TrelloCalendarStorage.boards[board.id]) {
                        TrelloCalendarStorage.boards[board.id].name = board.name;
                        TrelloCalendarStorage.boards[board.id].shortUrl = board.shortUrl;
                        TrelloCalendarStorage.boards[board.id].id = board.id;
                        TrelloCalendarStorage.boards[board.id].prefs = board.prefs;
                        TrelloCalendarStorage.boards[board.id].prefs.background = temp.boards[board.id].prefs.background;
                        TrelloCalendarStorage.boards[board.id].prefs.backgroundColor = temp.boards[board.id].prefs.backgroundColor;
                        if (TrelloCalendarStorage.boards[board.id].enabled === undefined) {
                            TrelloCalendarStorage.boards[board.id].enabled = true;
                        }

                    }
                    else {
                        TrelloCalendarStorage.boards[board.id] = board;
                        TrelloCalendarStorage.boards[board.id].enabled = true;

                    }
                });
                this.webStorage.set("TrelloCalendarStorage", TrelloCalendarStorage);
                deferred.resolve("boards");
            }, function () {
                deferred.reject("boards error");
            });
        return deferred.promise;
    };
    /**
     *pullLists pulls open Lists from Trello
     *fields: id, name
     * */
    private pullLists() {
        var deferred = this.$q.defer();
        var TrelloCalendarStorage = this.webStorage.get("TrelloCalendarStorage");
        var listRequests = [];
        var alllists = [];
        _.forEach(TrelloCalendarStorage.boards, (board) => {
            listRequests.push(this.$http.get("https://api.trello.com/1/boards/" + board.id + "/lists/?fields=name&filter=open&key=" + this.AppKey + "&token=" + this.token));
        });
        this.$q.all(listRequests).then((responses) => {
            _.forEach(responses, (lists) =>{
                alllists = alllists.concat(lists.data);
            });
            TrelloCalendarStorage.lists = _.keyBy(alllists, "id");
            this.webStorage.set("TrelloCalendarStorage", TrelloCalendarStorage);
            deferred.resolve("lists");
        }, function () {
            deferred.reject("lists error");

        });
        return deferred.promise;
    };
    /**
     *switches between pull my/all Cards
     */
    private pullCards() {
        var deferred = this.$q.defer();
        var TrelloCalendarStorage = this.webStorage.get("TrelloCalendarStorage");
        if (TrelloCalendarStorage.me.observer && TrelloCalendarStorage.me.observer === true) {
            this.pullAllCards().then(function () {
                deferred.resolve();
            }, function (error) {
                deferred.reject(error);
            });
        }
        else {
            this.pullMyCards().then(function () {
                deferred.resolve();
            }, function (error) {
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
        var deferred = this.$q.defer();
        var TrelloCalendarStorage = this.webStorage.get("TrelloCalendarStorage");
        this.$http.get("https://api.trello.com/1/members/me/cards/?fields=idList,name,dateLastActivity,shortUrl,due,idBoard&filter=open&key=" + this.AppKey + "&token=" + this.token).then((responses) =>{
            var myCards = responses.data;
            for (var card in myCards) {
                if (TrelloCalendarStorage.boards[myCards[card].idBoard]) {
                    myCards[card].boardName = (TrelloCalendarStorage.boards[myCards[card].idBoard]).name;
                    var dueDay = myCards[card].due;
                    myCards[card].dueDay = new Date(new Date(dueDay).setHours(0, 0, 0, 0)).toUTCString();
                    myCards[card].color = (TrelloCalendarStorage.boards[myCards[card].idBoard]).prefs.backgroundColor;
                    myCards[card].boardUrl = (TrelloCalendarStorage.boards[myCards[card].idBoard]).shortUrl;

                }
                if (TrelloCalendarStorage.lists[myCards[card].idList]) {
                    myCards[card].listName = (TrelloCalendarStorage.lists[myCards[card].idList]).name;
                }

            }

            TrelloCalendarStorage.cards.my = _.keyBy(myCards, "id");
            this.webStorage.set("TrelloCalendarStorage", TrelloCalendarStorage);
            deferred.resolve("myCards");
            this.login.resolve("myCards");

        }, function () {
            deferred.reject("myCards error");
        });

        return deferred.promise;

    };

    /**
     *pullAllCards pulls open Cards from Trello
     *if me/observer is true
     *fields: id, name,idList,dateLastActivity,shortUrl,due,idBoard
     * */
    private pullAllCards() {
        var deferred = this.$q.defer();
        var TrelloCalendarStorage = this.webStorage.get("TrelloCalendarStorage");
        var cardRequests = [];
        var allCards = [];
        _.forEach(TrelloCalendarStorage.boards, (board) => {
            cardRequests.push(this.$http.get("https://api.trello.com/1/boards/" + board.id + "/cards/?fields=idList,name,dateLastActivity,shortUrl,due,idBoard&filter=open&key=" + this.AppKey + "&token=" + this.token));
        });
        this.$q.all(cardRequests).then((responses) =>{
            _.forEach(responses, (lists) => {
                allCards = allCards.concat(lists.data);
            });

            for (var card in allCards) {

                if (TrelloCalendarStorage.boards[allCards[card].idBoard]) {

                    allCards[card].boardName = (TrelloCalendarStorage.boards[allCards[card].idBoard]).name;
                    var dueDay = allCards[card].due;
                    allCards[card].dueDay = new Date(new Date(dueDay).setHours(0, 0, 0, 0)).toUTCString();
                    allCards[card].color = (TrelloCalendarStorage.boards[allCards[card].idBoard]).prefs.backgroundColor;
                    allCards[card].boardUrl = (TrelloCalendarStorage.boards[allCards[card].idBoard]).shortUrl;
                }
                if (TrelloCalendarStorage.lists[allCards[card].idList]) {
                    allCards[card].listName = (TrelloCalendarStorage.lists[allCards[card].idList]).name;
                }
            }
            TrelloCalendarStorage.cards.all = _.keyBy(allCards, "id");
            this.webStorage.set("TrelloCalendarStorage", TrelloCalendarStorage);
            this.login.resolve("allCards");
            deferred.resolve("allCards");
        }, function () {
            deferred.reject("allCards error");
        });
        return deferred.promise;
    };

    /**
     * update() updates boards, lists, and cards
     */
    private update() {
        this.ngProgress.start();
        var deferred = this.$q.defer();
        this.pullBoards().then(() => {
            this.pullLists().then(() => {
                this.pullCards().then(() => {
                    deferred.resolve("update");
                    this.ngProgress.complete();

                }, (error) => {
                    this.ngProgress.complete();
                    deferred.reject(error);
                });
            }, (error) =>{
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
        var deferred = this.$q.defer();

        this.pullBoards().then(() => {
            this.pullLists().then(() => {
                this.$q.all([this.pullMyCards, this.pullAllCards]).then(() =>  {
                    this.ngProgress.complete();
                    deferred.resolve("update");
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
        var BoardId;
        var storage = this.webStorage.get("TrelloCalendarStorage");
        for (var x in storage.cards.my) {
            BoardId = storage.cards.my[x].idBoard;

            if (storage.boards[BoardId]) {
                storage.cards.my[x].color = storage.boards[BoardId].prefs.backgroundColor;
            }

        }
        for (var y in storage.cards.all) {
            BoardId = storage.cards.all[y].idBoard;

            if (storage.boards[BoardId]) {
                storage.cards.all[y].color = storage.boards[BoardId].prefs.backgroundColor;
            }
        }
        this.webStorage.set("TrelloCalendarStorage", storage);
    };

    public init() {

        if (!this.webStorage.has("trello_token")) {
            if (this.$rootScope.mobil) {
                var redirect = this.baseUrl + "/app/token?do=settoken";
                var ref = window.open("https://trello.com/1/authorize?response_type=token&scope=read,write&key=" + this.AppKey + "&redirect_uri=" + redirect + "&callback_method=fragment&expiration=never&name=Calendar+for+Trello", "_blank", "location=no", "toolbar=no");
                ref.addEventListener("loadstart", (event) => {
                    if (event.url.indexOf("/#token=") > -1) {
                        this.token = event.url.substring((event.url.indexOf("/#token=") + 8));
                        ref.close();
                        this.firstInit().then(() => {
                            this.updateAll();
                        });
                    }
                });
            } else {
                this.$window.location.href = "https://trello.com/1/authorize?response_type=token&key=" + this.AppKey + "&redirect_uri=" + encodeURI(this.baseUrl + "/app") + "%2Ftoken%3Fdo%3Dsettoken%26callback_method=fragment&scope=read%2Cwrite%2Caccount&expiration=never&name=Calendar+for+Trello";
            }


        } else {
            this.token = this.webStorage.get("trello_token");
            if (!this.webStorage.has("TrelloCalendarStorage")) {
                this.webStorage.set("TrelloCalendarStorage", {});
                this.firstInit().then(() => {
                    this.firstInit().then(() => {
                        this.updateAll().then(() => {
                            this.ngProgress.complete();
                            this.login.resolve("not exist");
                        });
                    });
                });
            }
            else {
                this.updateAll().then(() => {
                });
                this.login.resolve("exists");

            }
        }
        return login.promise;
    }

    public refresh() {
        this.login = this.$q.defer();
        this.update().then(function () {

            },
            function () {
                console.log("failed refresh");
            });

        return this.login.promise;
    }

    public remove() {
        this.data = null;
        this.webStorage.set("trello_token", null);
    }

    public refreshAll() {
        this.login = this.$q.defer();
        this.updateAll().then(function () {
            },
            function () {
                console.log("failed refreshAll");
            });
        return this.login.promise;
    }

    public updateDate() {
        this.$rootScope.$broadcast("refresh");
    }

}

appModule.service("initService", InitService);