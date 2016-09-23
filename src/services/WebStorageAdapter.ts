import {appModule} from '../app';
import {Dictionary} from 'lodash';

const TOKEN_OFFLINE = 'trello_calendar_offline';
const TRELLO_TOKEN = 'trello_token';

export class TrelloCalendarStorage {
    public boards: Dictionary<Board> = {};
    public lists: Dictionary<any>;
    public me: Me = new Me();
    public cards: Cards = new Cards();
    public colors: Dictionary<string>;
}

export class Cards {
    all: Dictionary<Card> = {};
    my: Dictionary<Card> = {};
}

export class Me {
    observer: boolean = false;
    colorizeCards: boolean = true;
    autorefresh: boolean = true;
    version: string;

    constructor(public fullName?: string, public id?: string) {

    }
}

export class WebStorageAdapter {
    constructor(private webStorage) {
        'ngInject';

    }

    public hasStorage() {
        return this.webStorage.has(TOKEN_OFFLINE);
    }

    public initStorage() {
        this.setStorage(new TrelloCalendarStorage());
    }

    public getStorage(): TrelloCalendarStorage {
        return this.webStorage.get(TOKEN_OFFLINE);
    }

    public setStorage(storage: TrelloCalendarStorage) {
        this.webStorage.set(TOKEN_OFFLINE, storage);
    }

    public removeStorage() {
        return this.webStorage.remove(TOKEN_OFFLINE);
    }

    hasToken() {
        return this.webStorage.has(TRELLO_TOKEN);
    }

    public getToken(): string {
        return this.webStorage.get(TRELLO_TOKEN);
    }

    public setToken(token: string) {
        this.webStorage.set(TRELLO_TOKEN, token);
    }


}

appModule.service('WebStorageAdapter', WebStorageAdapter);