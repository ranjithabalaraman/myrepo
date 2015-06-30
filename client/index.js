'use strict';

module.exports = angular.module('UICatalogManager', ['ui.router', 'angular.filter'])

.config(function($stateProvider) {
        $stateProvider
            .state('console.uicatalogmanager', {
                url: '/UICatalogManager',
                templateUrl: 'resources/norman-ui-catalog-manager-client/catalogs/UICatalogManager.html',
                controller: 'UICatalogManagerCtrl',
                authenticate: true
            });
    })
    .factory('ucm.UICatalog', require('./services/uicatalog.service.js'))
    .directive('iframeOnload', require('./catalogs/metadataIframe.directive.js'))
    .controller('UICatalogManagerCtrl', require('./catalogs/UICatalogManager.controller.js'))
    .run(function($rootScope, AsideFactory, Auth) {
        Auth.getSecurityConfig()
            .then(function(config) {
                var settings = config.settings;
                if (settings && settings.application && settings.application.admin === true) {
                    AsideFactory.push({
                        state: 'console.uicatalogmanager',
                        name: 'UI Catalog',
                        type: 'uicatalog',
                        isPersistant: true
                    });
                }
            });
    });
require('norman-client-tp');
require('angular-filter');
