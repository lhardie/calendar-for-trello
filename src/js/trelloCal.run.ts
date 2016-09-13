'use strict';
import {appModule} from "../app";
import {WebStorageAdapter} from "../services/WebStorageAdapter";

export interface TrelloCalRootScope extends ng.IRootScopeService {
    mobil: boolean;
}

appModule.run(function ($location: ng.ILocationService, $rootScope: TrelloCalRootScope, WebStorageAdapter: WebStorageAdapter) {
    if ($location.protocol() !== 'http' && $location.protocol() !== 'https') {
        $rootScope.mobil = true;
    }
    if (WebStorageAdapter.hasToken()) {
        if ($location.path() === '/') {
            $location.path('/app/month');

        }
    }
});