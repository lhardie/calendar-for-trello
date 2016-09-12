"use strict";
import {appModule} from "../app";
import {WebStorageAdapter} from "./WebStorageAdapter";

export class SetTokenService {
    private token: string;

    constructor(private WebStorageAdapter: WebStorageAdapter) {
        "ngInject";
        let token = WebStorageAdapter.getToken();
        console.log("current token: " + token);

        this.token = token;
    }

    set(token) {
        console.log("setToken: " + token);
        this.WebStorageAdapter.setToken(token);
    }
}

appModule.service("setToken", SetTokenService);