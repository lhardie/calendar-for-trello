'use strict';
import {appModule} from "../app";

export class ChangeDateService {
    token: string;

    constructor(private AppKey, private webStorage, private $http: ng.IHttpService) {
        "ngInject";
        this.token = webStorage.get('trello_token');

    }

    async(id, date) {

        let data = {
            due: date,
            token: this.token,
            key: this.AppKey
        };
        return this.$http({
            method: 'PUT',
            url: 'https://api.trello.com/1/cards/' + id + '?key=' + this.AppKey + '&token=' + this.token,
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            transformRequest: function (obj) {
                var str = [];
                for (var p in obj) {
                    str.push(encodeURIComponent(p) + '=' + encodeURIComponent(obj[p]));
                }
                return str.join('&');
            },
            data: data
        });
    }

}
appModule.service('changeDate', ChangeDateService);