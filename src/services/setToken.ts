'use strict';
import {appModule} from '../app';
import {WebStorageAdapter} from './WebStorageAdapter';

export class SetTokenService {
    private token: string;

    constructor(private WebStorageAdapter: WebStorageAdapter) {
        'ngInject';
        this.token = WebStorageAdapter.getToken();
    }

    set(token) {
        this.WebStorageAdapter.setToken(token);
    }
}

appModule.service('setToken', SetTokenService);