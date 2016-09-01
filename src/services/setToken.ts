'use strict';
import {appModule} from "../app";

export class SetTokenService {
    private token: string;

    constructor(private webStorage) {
        "ngInject";
        this.token = webStorage.get('trello_token');

    }

    set(token) {
        this.webStorage.set('trello_token', token);
    }
}

appModule.factory('setToken', SetTokenService);