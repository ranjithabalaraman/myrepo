'use strict';
var moment = require('norman-client-tp').moment;
module.exports = [
    '$scope',
    function ($scope) {
        $scope.headerTypeMap = null;

        function matchString() {
            return true;
        }

        function matchNumber(value) {
            return !isNaN(value);
        }

        function matchBoolean(value) {
            var bReturn = false;
            var input = (typeof value !== 'undefined') ? value.toString().toLowerCase() : '';
            if (input === 'true' || input === 'false') {
                bReturn = true;
            }
            return bReturn;
        }

        function matchTime(value) {
            var bTimeReturn = false;
            if (value) {
                value = value.trim();
                var check = /^(?:2[0-3]|[01]?[0-9]):[0-5][0-9]:[0-5][0-9]$/;
                bTimeReturn = check.test(value);
            } else {
                bTimeReturn = true;
            }
            return bTimeReturn;
        }

        function matchDate(value) {
            var bDateReturn = false;
            if (!value) {
                bDateReturn = true;
            } else {
                value = value.trim();
                var match = /^[0-9]{4}-(((0[13578]|(10|12))-(0[1-9]|[1-2][0-9]|3[0-1]))|(02-(0[1-9]|[1-2][0-9]))|((0[469]|11)-(0[1-9]|[1-2][0-9]|30)))$/;
                if (match.test(value)) {
                    if (typeof value === 'string') {
                        value = moment.parseZone(value + ' UTC');
                        value = value._d;
                    }
                    if (value instanceof Date && isFinite(value)) {
                        bDateReturn = true;
                    }
                }
            }
            return bDateReturn;
        }

        function cellTypeMatched(value, type) {
            var matched = false;
            if (!value && !type) {
                return matched;
            }

            var typeGroup = {
                string: matchString,
                decimal: matchNumber,
                float: matchNumber,
                number: matchNumber,
                single: matchNumber,
                double: matchNumber,
                int: matchNumber,
                int16: matchNumber,
                int32: matchNumber,
                int64: matchNumber,
                integer: matchNumber,
                boolean: matchBoolean,
                time: matchTime,
                date: matchDate,
                datetime: matchDate,
                datetimeoffset: matchDate
            };

            matched = (typeof typeGroup[type] === 'function')
                ? typeGroup[type](value)
                : true;
            return matched;
        }

        function setHeaderTypeMap(dataModel) {
            var localMap = {};
            for (var i = 0; i < dataModel.entities.length; i++) {
                var entity = dataModel.entities[i];
                localMap[entity.name] = {};
                for (var j = 0; j < entity.properties.length; j++) {
                    var property = entity.properties[j];
                    localMap[entity.name][property.name] = {
                        type: property.propertyType.toLowerCase(),
                        isKey: property.isKey
                    };
                }
            }
            return localMap;
        }

        $scope.removeHighlight = function (row, col) {
            if (row.entity[col] !== $scope.stroredValue) {
                if (row.entity.isHighLight) {
                    var index = row.entity.isHighLight.indexOf(col);
                    if (index > -1) {
                        row.entity.isHighLight.splice(index, 1);
                    }
                    if (row.entity.isHighLight.length === 0) {
                        delete row.entity.isHighLight;
                    }
                }
                if (row.entity.isHighLight && row.entity.isHighLight.length === 0) {
                    delete row.entity.isHighLight;
                }
            }
            if (row.entity.errorText) {
                delete row.entity.errorText[col];
                if (Object.keys(row.entity.errorText).length === 0) {
                    delete row.entity.errorText;
                }
            }
        };
        $scope.storeEntity = function (rowValue) {
            $scope.stroredValue = rowValue;
        };
        $scope.validateCellData = function (row, colField) {
            if (!$scope.headerTypeMap) {
                $scope.headerTypeMap = setHeaderTypeMap(row.grid.options.dataModel);
            }

            if (!row.entity[colField]) {
                row.entity[colField] = null;
            }
            var newValue = row.entity[colField];
            var isTypeMatched = cellTypeMatched(newValue, $scope.headerTypeMap[row.grid.options.tabName][colField].type);
            if (!isTypeMatched) {
                $scope.invalidCellEntry = true;
                if (!row.entity.dirtyCells) {
                    row.entity.dirtyCells = [];
                }
                var columnName = row.grid.api.cellNav.getFocusedCell().col.name;
                if (row.entity.dirtyCells.indexOf(columnName) === -1) {
                    row.entity.dirtyCells.push(columnName);
                }
            }
            else {
                if (row.entity.dirtyCells) {
                    var index = row.entity.dirtyCells.indexOf(row.grid.api.cellNav.getFocusedCell().col.name);
                    if (index > -1) {
                        row.entity.dirtyCells.splice(index, 1);
                    }
                }
            }
        };
    }
];