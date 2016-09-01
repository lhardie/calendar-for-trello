"use strict";
import {appModule} from "../app";

export class SetTokenService {
    private token: string;

    constructor(private webStorage) {
        "ngInject";
        let token = webStorage.get("trello_token");
        console.log("current token: " + token);

        this.token = token;
    }

    set(token) {
        console.log("setToken: " + token);
        this.webStorage.set("trello_token", token);
    }
}

appModule.service("setToken", SetTokenService);