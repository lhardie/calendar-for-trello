"use strict";
import * as _ from 'lodash';
import {appModule} from "../app";
import {Dictionary} from "lodash";

class StreamService {

    token:string;
    request:any;
    data:Dictionary<any[]>;

    constructor(private webStorage, private $q: ng.IQService, private $http: ng.IHttpService, private $rootScope: ng.IRootScopeService, private localStorageService, private baseUrl, private AppKey, private initService) {
        "ngInject";
        this.token = webStorage.get('trello_token');
        this.request = $q.defer();
    }

    private sort(input) {
        let data = [];
        _.forEach(input, function (item) {
            _.forEach(item.data, function (item) {
                item.day = new Date(item.date).setHours(0, 0, 0, 0);
                item.sort = new Date(item.date).getFullYear() + ',' + new Date(item.date).getMonth();
                item.month = {
                    year: new Date(item.date).getFullYear(),
                    month: new Date(item.date).getMonth()
                };
                data.push(item);
            });
        });


        data = _.groupBy(data, 'sort');

        return data;

    };

    public get() {
        this.initService.init().then(function (initData) {
            if (!this.data) {
                var requests = [];
                angular.forEach(initData[2].data, function (board) {
                    //requests.push($http.get('https://api.trello.com/1/boards/'+board.id+'/actions?key='+key+'&token='+token));
                    // ToDo: monthly limited
                    //https://api.trello.com/1/boards/55267ce7997450bb52ca8b21/actions?since=2015-05-19T11%3A08%3A42%2B00%3A00%0A&key=41485cd87d154168dd6db06cdd3ffd69&token=df89f735a3dec3595a81794e8b40781f1de5bb65ceb1bc651b2562db1d6828a8
                    requests.push(this.$http({
                        method: 'GET',
                        url: 'https://api.trello.com/1/boards/' + board.id + '/actions?limit=2&key=' + this.AppKey + '&token=' + this.token,
                        headers: {'Content-Type': 'application/x-www-form-urlencoded'}
                    }));
                });
                this.$q.all(this.requests)
                    .then(
                        function (results) {
                            results = this.sort(results);
                            this.request.resolve((results));
                            this.data = results;
                        },
                        function (errors) {
                            this.request.reject(errors);
                        });
            } else {
                return this.data;
            }
        });
        return this.request.promise;
    }

}

appModule.service('streamService', StreamService);
