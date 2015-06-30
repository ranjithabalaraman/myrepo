'use strict';

var _ = require('norman-client-tp').lodash;
var moment = require('norman-client-tp').moment;

module.exports = [
    '$rootScope',
    '$scope',
    '$http',
    '$q',
    '$timeout',
    '$interval',
    '$stateParams',
    'sdm.sampleData',
    'uiError',
    'uiDialogHelper',
    function ($rootScope, $scope, $http, $q, $timeout, $interval, $stateParams, sampleDataFactoryService, uiError, uiDialogHelper) {
        /***ERROR HANDLING START***/
        $scope.showErrors = false;
        $scope.toggleSymbol = '+';
        $scope.tab = {
            active: ''
        };

        $scope.errorWindowStyle = {
            height: 'auto',
            overflow: 'visible',
            top: '250px',
            left: '40%',
            width: '500px'
        };

        $scope.sdErrorContainerStyle = {
            maxHeight: '200px',
            height: '0'
        };

        $scope.errorDialogCoordinates = {
            x: parseInt($scope.errorWindowStyle.left),
            y: parseInt($scope.errorWindowStyle.top),
            reset: false
        };

        $scope.openToast = function (text) {
            uiError.create({
                content: text,
                dismissOnTimeout: false,
                dismissButton: true
            });
        };

        function handleError(err) {
            $scope.openToast(err.data);
        }

        /***ERROR HANDLING END***/
        $scope.highlight = function (data) {
            if (typeof data.tab != 'undefined') {
                var tab = data.tab.tabNum;
                var column = data.column;
                var row = data.row;
                var rowEntity = data.rowEntity;
                var tabName = data.tab.tabName;
                var grid = $scope.gridApis[$scope.tab.active].grid;


                function changeTab() {
                    $scope.selectedTab = tabName;
                    $scope.entityTabs[tab].gridOptions.enableCellEditOnFocus = false;
                    console.log($scope.entityTabs[tab].gridOptions.enableCellEditOnFocus);
                    grid.api.cellNav.scrollTo(grid, $scope, rowEntity, null);
                    $scope.entityTabs[tab].gridOptions.data[row].isHighLight = [column];
                    $scope.gridApis[tabName].selection.selectRow(data.rowEntity);
                    $scope.$emit('uiGridEventEndCellEdit');
                }
                $timeout(changeTab, 200);
            }
        }
        $scope.removehighlight = function (data) {
            if (typeof data.tab != 'undefined') {
                var tab = data.tab.tabNum;
                var column = data.column;
                var row = data.row;
                var tabName = data.tab.tabName;

                function close() {
                    delete $scope.entityTabs[tab].gridOptions.data[row].isHighLight;
                    $scope.gridApis[tabName].selection.unSelectRow(data.rowEntity);
                }
                $timeout(close, 201);
            }
        }

        $scope.$on('SampleDataEditor', function (event, data) {
            $rootScope.loadSDEDitor = false;
            $scope.getEntityNavDataForProj(data.id, data.entityName);
        });
        $scope.$on('DUPLICATE_LINE', function () {
            $scope.triggerDuplicate();
        });
        $scope.$on('DELETE_LINE', function () {
            $scope.triggerDelete();
        });

        var addLineListener = $scope.$on('ADD_LINE', function (event, activeRow) {
            $scope.triggerNewLine(activeRow);
        });

        $scope.$on('$destroy', function () {
            addLineListener(); // remove listener.
        });

        function resetErrorWindowCordinate(bReset) {
            $scope.errorDialogCoordinates = {
                x: 250,
                y: -550,
                reset: bReset
            };
        }

        function maximizeErrorWindow() {
            $scope.errorWindowStyle = {
                height: 'auto',
                overflow: 'visible',
                top: '250px',
                left: '40%',
                width: '500px'
            };
            $scope.maxMinBtnStyle = {
                height: '20px',
                width: '12px',
                borderBottom: '3px solid #fff',
                marginTop: '0'
            };
            resetErrorWindowCordinate(true); /*change made herer*true to false*/
        }

        function minimizeErrorWindow() {
            $scope.errorWindowStyle = {
                height: '30px',
                overflow: 'hidden',
                bottom: '0',
                left: '18px',
                width: '200px'
            };
            $scope.maxMinBtnStyle = {
                height: '8px',
                width: '12px',
                border: '2px solid #fff',
                marginTop: '7px',
                borderTopWidth: '6px'
            };
            resetErrorWindowCordinate(true);
        }

        $scope.maxMinError = function () {
            if ($scope.errorWindowStyle.height === 'auto') {
                minimizeErrorWindow();
            } else {
                maximizeErrorWindow();
            }
        };

        $scope.closeError = function () {
            $scope.saveError = false;
        };

        $scope.saveNcloseDialog = function () {
            return function () {
                $scope.triggerSave();
            };
        };

        $scope.cleanDialog = function (id) {
            angular.element(document.getElementById(id)).data().$isolateScope.dialogClean();
        };

        $scope.triggerModalClick = $scope.saveNcloseDialog('gridDialog');

        $scope.openSDDialog = function () {
            angular.element(document.getElementById('ui-dialog-modal-backdrop')).bind('click', $scope.triggerModalClick);
        };

        $scope.addHiddenCol = function (colName) {
            if (!$scope.hiddenCols[$scope.tab.active]) {
                $scope.hiddenCols[$scope.tab.active] = [];
            }
            $scope.hiddenCols[$scope.tab.active].push(colName);
        };

        $scope.checkarray = [];

        function dateCheck(a) {
            for (var i = 0; i < a.properties.length; i++) {
                switch (a.properties[i].propertyType.toLowerCase()) {
                case "datetime":
                    $scope.checkarray.push({
                        'name': a.properties[i].name,
                        'type': a.properties[i].propertyType.toLowerCase()
                    });
                }
            }
        }

        function dateParse(data, opt) {
            console.log(data)
            if ($scope.checkarray.length > 0) {
                var checkArr = $scope.checkarray;
                for (var i = 0; i < checkArr.length; i++) {
                    switch (checkArr[i].type) {
                    case "datetime":
                        for (var j = 0; j < data.properties.length; j++) {
                            var parse = data.properties[j][checkArr[i].name];
                            switch (opt) {

                            case 'format':
                                if (parse) {
                                    parse = moment(parse).format("YYYY-MM-DD");
                                }
                                data.properties[j][checkArr[i].name] = parse;

                            case 'parse':
                                console.log('in');
                                if (parse) {
                                    parse = moment.parseZone(parse + ' UTC');
                                    parse = parse._d;
                                }
                                if (parse  instanceof  Date  &&  isFinite(parse)) {
                                    data.properties[j][checkArr[i].name] = parse;
                                }
                            }
                        }
                    }
                }
            }
            console.log(data)
            return data;
        }
        $scope.getEntityNavDataForProj = function (projId, entityName) {
            var params = {
                projId: projId,
                entityName: entityName
            };
            $scope.saveError = false;

            function setHeaderCSS(grid, row, column) {
                if (column.colDef.isForeignKey) {
                    return 'foreignKeyClass';
                }
            }
            sampleDataFactoryService.getEntityNavDataForProj(params, function (response) {
                    var registerGridApi = function (gridApi) {
                        if (!$scope.gridApis) {
                            $scope.gridApis = {};
                        }
                        $scope.gridApis[gridApi.grid.options.tabName] = gridApi;
                        gridApi.selection.on.rowSelectionChanged($scope, function (row) {
                            if (row.isSelected) {
                                $scope.lastSelectedRow = row;
                            }
                            $scope.gridApis[gridApi.grid.options.tabName] = gridApi;
                        });
                    };
                    var tabIndex;
                    var sampleDataNav = JSON.parse(JSON.stringify(response));
                    if (!sampleDataNav) {
                        handleError(new Error('No Sample Data found'));
                    }
                    $scope.dataModelJson = sampleDataNav.dataModelJson;
                    $scope.sampleData = sampleDataNav.sampleData;
                    $scope.hiddenCols = {};
                    $scope.navigationEntities = sampleDataNav.navigationEntities;
                    //Lower case key value object pair
                    var dataModelEntity = _.transform(sampleDataNav.dataModelJson.entities, function (result, entityObj) {
                        result[entityObj.name.toLowerCase()] = entityObj;
                        return result;
                    });
                    //Lower case key value object pair
                    var sampleDataEntity = _.transform(sampleDataNav.sampleData.entities, function (result, entityObj) {
                        result[entityObj.entityName.toLowerCase()] = entityObj;
                        return result;
                    }, {});

                    var entityLCase = entityName.toLowerCase();
                    var tableNamesL = [entityLCase];
                    var entityTabs = [];
                    for (var ind = 0; ind < sampleDataNav.navigationEntities.length; ind++) {
                        tableNamesL.push(sampleDataNav.navigationEntities[ind].entityName.toLowerCase());
                    }
                    for (var i = 0; i < tableNamesL.length; i++) {
                        var entityMeta = dataModelEntity[tableNamesL[i]];
                        var entityData = sampleDataEntity[tableNamesL[i]];
                        dateCheck(entityMeta);

                        if ($scope.checkarray.length > 0) {
                            entityData = dateParse(entityData, 'format');
                        }

                        tabIndex = i;
                        var entityTab = {
                            name: entityData.entityName,
                            gridOptions: {
                                data: entityData.properties,
                                dataModel: sampleDataNav.dataModelJson,
                                rowHeight: 30,
                                columnDefs: [],
                                excludeProperties: ['dirtyCells'],
                                enableHorizontalScrollbar: 0,
                                enableVerticalScrollbar: 2,
                                enableCellSelection: true,
                                enableCellEditOnFocus: true,
                                enableCellEdit: true,
                                enableFiltering: true,
                                tabName: entityData.entityName,
                                onRegisterApi: registerGridApi,
                                virtualizationThreshold: 2000,
                                scrollThreshold: 10,
                                minRowsToShow: 18,
                                enableRowHeaderSelection: false
                            }
                        };
                        if (i === 0) {
                            entityTab.primaryTable = true;
                        } else {
                            entityTab.primaryTable = false;
                        }
                        entityTab.gridOptions.columnDefs.push({
                            name: '+',
                            width: 30,
                            isForeignKey: false,
                            enableSorting: false,
                            isPrimaryKey: false,
                            isRowHeader: true,
                            enableCellEdit: false,
                            headerCellClass: setHeaderCSS,
                            cellTemplate: 'resources/norman-sample-data-manager-client/sampleData/rowTemplate.html',
                            headerCellTemplate: 'resources/norman-sample-data-manager-client/sampleData/cornerTemplate.html'
                        });
                        var pkColDefItem = [];
                        var fkColDefItem = [];
                        var orderColDefItem = [];
                        for (var j = 0; j < entityMeta.properties.length; j++) {
                            var colDefItem = {
                                name: entityMeta.properties[j].name,
                                order: entityMeta.properties[j].order,
                                isForeignKey: entityMeta.properties[j].isForeignKey,
                                enableSorting: true,
                                enableHiding: false,
                                headerCellClass: setHeaderCSS,
                                isPrimaryKey: entityMeta.properties[j].isKey,
                                type: 'text',
                                cellTemplate: 'resources/norman-sample-data-manager-client/sampleData/cellTemplate.html',
                                editableCellTemplate: 'resources/norman-sample-data-manager-client/sampleData/editableCellTemplate.html',
                                headerCellTemplate: 'resources/norman-sample-data-manager-client/sampleData/columnHeader.html'
                            };
                            if (entityMeta.properties[j].calculated.inputProperties.length !== 0) {
                                colDefItem.enableCellEdit = false;
                            }
                            if (entityMeta.properties[j].isForeignKey) {
                                fkColDefItem.push(colDefItem);
                            } else if (entityMeta.properties[j].isKey) {
                                pkColDefItem.push(colDefItem);
                            } else {
                                orderColDefItem.push(colDefItem);
                            }
                        }
                        //sort the non key properties
                        var sortedProperties = _.sortBy(orderColDefItem, 'order');
                        entityTab.gridOptions.columnDefs = entityTab.gridOptions.columnDefs.concat(pkColDefItem.concat(sortedProperties, fkColDefItem));
                        entityTabs.push(entityTab);
                    }
                    $scope.entityTabs = entityTabs;
                    $scope.selectedTab = entityTabs[0].name;
                    uiDialogHelper.open('gridDialog');
                },
                function (err) {
                    handleError(err);
                });
        };

        $scope.triggerSave = function () {
            var entityNameLcase;
            var aHiddenColNames = {};
            $scope.errorList = [];



            //var div = angular.element('ui-grid-cell-focus');
            //div.removeClass('ui-grid-cell-focus');

            function _findGridOptions(row) {
                return row.name.toLowerCase() === $scope.localEntityName.toLowerCase();
            }

            function _getHiddenColumns(tabName) {
                return $scope.hiddenCols[tabName];
            }

            for (var c = 0; c < $scope.sampleData.entities.length; c++) {
                $scope.localEntityName = $scope.sampleData.entities[c].entityName;
                aHiddenColNames[$scope.localEntityName.toLowerCase()] = _getHiddenColumns($scope.localEntityName);
                var gridDataResult = _.result(_.find($scope.entityTabs, _findGridOptions), 'gridOptions');
                if (gridDataResult) {
                    var gridData = gridDataResult.data;
                    $scope.sampleData.entities[c].properties = gridData;
                }
            }

            function findIndexOfEntity(item) {
                return item.entityName.toLowerCase() === entityNameLcase;
            }

            for (var i = 0; i < $scope.entityTabs.length; i++) {
                entityNameLcase = $scope.entityTabs[i].name.toLowerCase();

                if ($scope.checkarray.length > 0) {
                    $scope.sampleData.entities[i] = dateParse($scope.sampleData.entities[i], 'parse');
                }
                var replaceEntity = _.find($scope.sampleData.entities, findIndexOfEntity);
                replaceEntity.properties = $scope.entityTabs[i].gridOptions.data;


                for (var j = 0; j < replaceEntity.properties.length; j++) {
                    var properties = replaceEntity.properties[j];
                    delete properties['+'];
                    if (properties.hasOwnProperty('dirtyCells')) {
                        if (properties.dirtyCells.length > 0) {
                            for (var k = 0; k < properties.dirtyCells.length; k++) {
                                var body = {
                                    "text": 'Type Mismatch for ' + properties.dirtyCells[k] + ' in row ' + (j + 1) + ' of ' + entityNameLcase,
                                    "row": j,
                                    "column": properties.dirtyCells[k],
                                    "tab": {
                                        tabNum: i,
                                        tabName: entityNameLcase
                                    },
                                    "rowEntity": properties
                                }
                                $scope.errorList.push(body);
                            }
                        } else {
                            delete properties.dirtyCells;
                        }
                    }
                    if (aHiddenColNames[entityNameLcase]) {
                        for (var n = 0; n < aHiddenColNames[entityNameLcase].length; n++) {
                            delete properties[aHiddenColNames[entityNameLcase][n]];
                        }
                    }
                }
            }

            if ($scope.errorList.length > 0) {
                $scope.saveError = true;
                return;
            }
            var postData = {
                sampleData: $scope.sampleData,
                dataModelJson: $scope.dataModelJson
            };
            var params = {
                projId: $scope.sampleData.projectId
            };
            var fnError = function (error) {
                maximizeErrorWindow();
                $scope.saveError = true;
                $scope.sdErrorContainerStyle.height = 'auto';
                $scope.entityTabs[0].gridOptions.minRowsToShow = 15;
                angular.element(document.getElementById('gridOpenerId')).triggerHandler('click');
                $scope.saveDialogClass = 'error';
                if (error.data && error.data.errorList) {
                    $scope.errorList = error.data.errorList;
                    // $scope.errorCount = error.data.errorList.length;
                }
            };
            var fnSuccess = function () {
                angular.element(document.getElementById('ui-dialog-modal-backdrop')).unbind('click', $scope.triggerModalClick);
                //close the dialog
                $scope.saveError = false;
                $scope.cleanDialog('gridDialog');
            };
            sampleDataFactoryService.saveSampleData(params, postData, fnSuccess, fnError);

        };

        $scope.sdCancelled = function () {
            $scope.checkarray = [];
            angular.element(document.getElementById('ui-dialog-modal-backdrop')).unbind('click', $scope.triggerModalClick);
        };

        $scope.triggerNewLine = function (activeRow) {
            var selectedTab = $scope.getSelectedTabId();
            var index = _.findIndex($scope.entityTabs, function (row) {
                return row.name.toLowerCase() === selectedTab.toLowerCase();
            });
            var data = $scope.entityTabs[index].gridOptions.data;
            var columnDefs = $scope.entityTabs[index].gridOptions.columnDefs;
            var sampleRow = {};
            for (var c = 0; c < columnDefs.length; c++) {
                sampleRow[columnDefs[c].name] = null;
            }
            if (activeRow) {
                var selectedRowIndex = _.findIndex(data, function (item) {
                    return item.$$hashKey === activeRow.entity.$$hashKey;
                });
                data.splice(selectedRowIndex + 1, 0, sampleRow);
            } else {
                data.push(sampleRow);
                $timeout(function () {
                    var grid = $scope.gridApis[$scope.tab.active].grid;
                    grid.api.cellNav.scrollTo(grid, $scope, grid.rows[grid.rows.length - 1].entity, null);
                });
            }
        };


        $scope.triggerDelete = function () {
            var selectedTab = $scope.getSelectedTabId();
            var selEntityTab = _.find($scope.entityTabs, function (entityTab) {
                return entityTab.name.toLowerCase() === selectedTab.toLowerCase();
            });
            if ($scope.gridApis[selEntityTab.name]) {
                var deletableData = $scope.gridApis[selEntityTab.name].selection.getSelectedRows();
                selEntityTab.gridOptions.data = _.difference(selEntityTab.gridOptions.data, deletableData);
            }
        };

        $scope.triggerDuplicate = function () {
            var selectedTab = $scope.getSelectedTabId();
            var selEntityTab = _.find($scope.entityTabs, function (entityTab) {
                return entityTab.name.toLowerCase() === selectedTab.toLowerCase();
            });
            if ($scope.gridApis[selEntityTab.name]) {
                var index = _.findIndex($scope.entityTabs, function (row) {
                    return row.name.toLowerCase() === selectedTab.toLowerCase();
                });
                var data = $scope.entityTabs[index].gridOptions.data;
                var selectedData = JSON.parse(JSON.stringify($scope.gridApis[selEntityTab.name].selection.getSelectedRows())); //to avoid reference
                var selectedRowIndex = _.findIndex(data, function (item) {
                    return item.$$hashKey === selectedData[selectedData.length - 1].$$hashKey;
                });
                for (var i = 0; i < selectedData.length; i++) {
                    delete selectedData[i].$$hashKey;
                    data.splice(selectedRowIndex + i + 1, 0, selectedData[i]);
                }
            }
        };

        $scope.getSelectedTabId = function () {
            return $scope.tab.active;
        };

        $scope.isActiveTab = function (tabKey) {
            return tabKey === $scope.currentEntityTab.key;
        };

        /*** Key Event Handlers START ****************/
        $scope.onKeyUp = function ($event) {
            if ($event.shiftKey) {
                if (!$scope.lastSelectedRow) {
                    return;
                }
                var gridRows = $scope.gridApis[$scope.getSelectedTabId()].grid.rows;
                var indexAt = _.findIndex(gridRows, function (item) {
                    return item.entity.$$hashKey === $scope.lastSelectedRow.entity.$$hashKey;
                });
                var nextRow;
                switch ($event.keyCode) {
                case 40:
                    nextRow = gridRows[indexAt + 1];
                    break;
                case 38:
                    nextRow = gridRows[indexAt - 1];
                    break;
                }
                if (nextRow) {
                    if (nextRow && nextRow.isSelected) {
                        //find next unselected Row
                        while (nextRow && nextRow.isSelected) {
                            if ($event.keyCode === 40) {
                                nextRow = gridRows[++indexAt];
                            } else if ($event.keyCode === 38) {
                                nextRow = gridRows[--indexAt];
                            }
                        }
                        if (nextRow) {
                            $scope.gridApis[$scope.getSelectedTabId()].selection.selectRow(nextRow.entity);
                        }
                    } else {
                        $scope.gridApis[$scope.getSelectedTabId()].selection.selectRow(nextRow.entity);
                    }
                }

            }

        };

        $scope.okBtnClicked = function () {
            $scope.triggerSave();
            return false; //return false to avoid dialog close
        };

        /*** Key Event Handlers END ***************/
        $scope.toggleErrorVisibility = function () {
            if ($scope.toggleSymbol === '+') {
                $scope.toggleSymbol = '-';
                $scope.errorStartY = -550;
            } else {
                $scope.toggleSymbol = '+';
                $scope.errorStartY = 0;
            }
            $scope.showErrors = !$scope.showErrors;
        };

        //Trigger Editor dialog on load of Controller
        if ($rootScope.loadSDEDitor) {
            $rootScope.loadSDEDitor = false;
            $scope.getEntityNavDataForProj($rootScope.sampleData.id, $rootScope.sampleData.entityName);
        }
        this.sampleDataControllerSafe = true;
            }
            ];
