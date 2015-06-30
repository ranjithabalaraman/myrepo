'use strict';

/**
 * @ngdoc module
 * @name SampleDataManager
 * @description SampleDataManager module to handle Sample data
 */

require('norman-common-client');
require('norman-ng-grid');
var sampleDataCtrl = require('./sampleData/sampleDataManager.controller.js');
module.exports = angular.module('SampleDataManager', ['ui.router', 'ui.grid', 'ui.grid.edit', 'ui.grid.selection'])

    .config(function ($stateProvider) {
        $stateProvider
            .state('shell.SampleDataManager', {
                url: '/SampleDataManager/:projId/:entityName',
                templateUrl: 'resources/norman-sample-data-manager-client/sampleData/sampleDataManager.html',
                controller: 'sampleDataManagerController',
                authenticate: false,
                onEnter: 'sampleDataManagerController.getEntityNavDataForProj'
            });
    })
    .factory('sdm.sampleData', require('./services/sampleData.service.js'))
    .controller('sampleDataManagerController', sampleDataCtrl)
    .controller('rowTemplateController', require('./sampleData/rowTemplate.controller.js'))
    .controller('editableCellTemplateController', require('./sampleData/editableCellTemplate.controller.js'))
    .controller('cellTemplateController', require('./sampleData/cellTemplate.controller.js'))
    .controller('columnHeaderController', require('./sampleData/columnHeader.controller.js'))
    .controller('cornerCellController', require('./sampleData/cornerTemplate.controller.js'))
    .directive('focusOn', function () {
        return function (scope, elem, attr) {
            scope.$on(attr.focusOn, function () {
                elem[0].parentElement.parentElement.classList.add('headerSelected');
                elem[0].parentElement.style.display = 'flex';
                elem[0].focus();
                var classes = elem[0].parentElement.parentElement.parentElement.classList;
                var reqClass;
                for (var i in classes) {
                    if (classes[i].indexOf('ui-grid-coluiGrid-') !== -1) {
                        reqClass = classes[i];
                        break;
                    }
                }
                angular.element(document.getElementsByClassName(reqClass)).addClass('cellsSelected');
            });
        };
    })
    .directive('blurOn', function () {
        return function (scope, elem, attr) {
            scope.$on(attr.blurOn, function () {
                if (elem[0].value === '') {
                    elem[0].parentElement.style.display = 'none';
                    elem[0].parentElement.parentElement.classList.remove('headerSelected');
                    var classes = elem[0].parentElement.parentElement.parentElement.classList;
                    var reqClass;
                    for (var i in classes) {
                        if (classes[i].indexOf('ui-grid-coluiGrid-') !== -1) {
                            reqClass = classes[i];
                            break;
                        }
                    }
                    angular.element(document.getElementsByClassName(reqClass)).removeClass('cellsSelected');
                }
            });
        };
    })
    .directive('sdmDraggable', ['$document', function ($document) {
        return {
            scope: {
                coOrdinate: '=coOrdinate'
            },
            link: function (scope, element) {
                var startX = 0, startY = 0, x = scope.coOrdinate.x || 0, y = scope.coOrdinate.y || 0;

                element.css({
                    cursor: 'pointer'
                });

                function mousemove(event) {
                    y = event.pageY - startY;
                    x = event.pageX - startX;
                    element.css({
                        position: 'relative',
                        top: y + 'px',
                        left: x + 'px'
                    });
                }

                function mouseup() {
                    $document.off('mousemove', mousemove);
                    $document.off('mouseup', mouseup);
                }

                element.on('mousedown', function (event) {
                    // Prevent default dragging of selected content
                    event.preventDefault();
                    if (scope.coOrdinate.reset === true) {
                        if (element.css('top') !== '' && element.css('left') !== '') {
                            x = parseInt(element.css('left'));
                            y = parseInt(element.css('top'));
                        } else {
                            x = scope.coOrdinate.x || 0;
                            y = scope.coOrdinate.y || 0;
                        }
                        scope.coOrdinate.reset = false;
                    }
                    startX = event.pageX - x;
                    startY = event.pageY - y;
                    $document.on('mousemove', mousemove);
                    $document.on('mouseup', mouseup);
                    console.log(scope);
                });
            }
        };
    }])
    .directive('showFocus', function ($timeout) {
        return function (scope, element, attrs) {
            scope.$watch(attrs.showFocus,
                function (newValue) {
                    $timeout(function () {
                        element[0].select();
                    });
                }, true);
        };
    })
    .run(function ($rootScope) {
        $rootScope.$on('SampleDataEditor', function (event, data) {
            $rootScope[data.sampleDataPath] = 'resources/norman-sample-data-manager-client/sampleData/sampleDataManager.html';
            $rootScope.sampleData = {
                id: data.id,
                entityName: data.entityName
            };
            $rootScope.loadSDEDitor = true;
        });
    });
