'use strict';

var historyApiFallback = require('connect-history-api-fallback')

var GulpConfig = (function () {
    function GulpConfig() {

        // ----------------------------------------------------------
        // Vendor
        // ----------------------------------------------------------

        this.vendor = [
            "bower_components/jquery/dist/jquery.min.js",
            "bower_components/jquery-ui/jquery-ui.js",
            "bower_components/jquery-ui-touch-punch/jquery.ui.touch-punch.js",

            "bower_components/angular/angular.min.js",
            "bower_components/angular-animate/angular-animate.min.js",
            "bower_components/angular-aria/angular-aria.min.js",
            "bower_components/angular-dragdrop/src/angular-dragdrop.min.js",
            "bower_components/angular-local-storage/dist/angular-local-storage.min.js",
            "bower_components/angular-material/angular-material.min.js",
            "bower_components/angular-material-icons/angular-material-icons.min.js",
            "bower_components/angular-toastr/dist/angular-toastr.min.js",
            "bower_components/angular-sanitize/angular-sanitize.min.js",
            "bower_components/angular-ui-router/release/angular-ui-router.min.js",
            "bower_components/angular-webstorage/angular-webstorage.min.js",
            "bower_components/animate.css/animate.min.css",

            "bower_components/lodash/lodash.min.js",
            "bower_components/moment/moment.js",
            "bower_components/moment/locales/en-gb.js",
            "bower_components/ngprogress/build/ngProgress.js",
            "bower_components/array-tools/dist/array-tools.js",
            "bower_components/w11k.angular-seo-header/angular-seo-header.js",
            //Error-Logging:
            "bower_components/raven-js/dist/raven.js",
            "bower_components/angular-raven/angular-raven.min.js",
            //Analytics:
            "bower_components/angulartics/src/angulartics.js",
            "bower_components/angulartics/src/angulartics-ga.js"
        ];

        this.nodeModulesCopy = [
            // "lodash"
        ];

        // ----------------------------------------------------------
        // Source Paths
        // ----------------------------------------------------------

        this.revAllOptions = {
            dontRenameFile: ["index.html"]
        };

        this.htmlFiles = [
            "src/**/*.html"
        ];

        this.cssFiles = [
            "src/**/*.css",
            "bower_components/angular-material/angular-material.css",
            "bower_components/ngprogress/ngProgress.css",
            "bower_components/angular-ui-notification/src/angular-ui-notification.less",
            "bower_components/angular-toastr/dist/angular-toastr.min.css"
        ];

        this.scssFiles = [
            "!src/**/_*.scss",
            "src/**/*.scss"
        ];

        this.scssRebuildAllFiles = [
            "src/**/_*.scss"
        ];

        this.typeScriptFiles = [
            "typings/index.d.ts",
            "src/**/*.ts",
            "src/**/*.js"
        ];
        this.typeScriptLintFiles = [
            "src/**/*.ts"
        ];

            /*["bower_components/bootstrap/dist/fonts/!**!/!*", "fonts"],
            ["bower_components/font-awesome/fonts/!*.woff", "fonts"]*/
        this.copyFiles = [
        ];

        // ----------------------------------------------------------
        // SystemJS
        // ----------------------------------------------------------

        this.systemImportMain = "init";

        this.systemJSConfig = {
            baseURL: '',
            defaultJSExtensions: true,

            "paths": {
                "*": "*.js"
            },

            map: {
                lodash: 'lodash/lodash.min'
            }
        };

        // ----------------------------------------------------------
        // Output
        // ----------------------------------------------------------

        this.target = "target";

        this.targetApp = this.target + "/build";

        this.targetJs = this.targetApp;

        // ----------------------------------------------------------
        // BrowserSync
        // ----------------------------------------------------------

        this.browserSyncOptions = {
            injectChanges: true,
            reloadDelay: 750,
            open: false,
            online: true,
            reloadOnRestart: true,
            port: 9999,
            //proxy: {
            //    target: "http://localhost:8080",
            //    ws: true
            //},
            server: {
                baseDir: this.targetApp,
                directory: true,
								middleware: [ historyApiFallback() ]
            }//,
            //files: this.targetApp + '/**/*'
        };

    }

    return GulpConfig;
})();
module.exports = GulpConfig;
