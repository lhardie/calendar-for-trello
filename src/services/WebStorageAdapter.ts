import {appModule} from "../app";

const TRELLO_CALENDAR_STORAGE = 'TrelloCalendarStorage';
const TRELLO_TOKEN = 'trello_token';

export class TrelloCalendarStorage {
    public boards: Array<Board>;
    public me: Me;
    public cards: Cards;
}

export class Cards {
    all: Array<Card>;
    my: Array<Card>;
}

export class Me {
    id: string;
    fullName: string;
    observer: boolean;
    colorizeCards: boolean;
    version: string;
    autorefresh: boolean;
}

export class WebStorageAdapter {
    constructor(private webStorage) {
        "ngInject"

    }

    public hasStorage() {
        return this.webStorage.has(TRELLO_CALENDAR_STORAGE);
    }

    public initStorage() {
        this.setStorage(new TrelloCalendarStorage());
    }

    public getStorage(): TrelloCalendarStorage {
        return this.webStorage.get(TRELLO_CALENDAR_STORAGE);
    }

    public setStorage(storage: TrelloCalendarStorage) {
        this.webStorage.set(TRELLO_CALENDAR_STORAGE, storage);
    }

    public removeStorage() {
        return this.webStorage.remove(TRELLO_CALENDAR_STORAGE);
    }

    hasToken() {
        return this.webStorage.has(TRELLO_TOKEN);
    }

    public getToken(): string {
        return this.webStorage.get(TRELLO_TOKEN);
    }

    public setToken(token: string){
        this.webStorage.set(TRELLO_TOKEN, token);
    }


}

appModule.service('WebStorageAdapter', WebStorageAdapter);