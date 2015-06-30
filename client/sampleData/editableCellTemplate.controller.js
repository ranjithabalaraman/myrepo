'use strict';

var _ = require('norman-client-tp').lodash;
var moment = require('norman-client-tp').moment;

module.exports = [
    '$scope',
    function ($scope) {
        $scope.headerTypeMap = null;

        function cellTypeMatched(value, type) {
            if (!value && !type) {
                return false;
            }
            var valueType = (typeof value).toLowerCase();
            switch (type.toLowerCase()) {
            case 'string':
                return true;

            case 'decimal':
            case 'float':
            case 'number':
            case 'single':
            case 'double':
            case 'int':
            case 'int16':
            case 'int32':
            case 'int64':
            case 'integer':
                if (!isNaN(value)) {
                    return true;
                }
                return false;

            case 'boolean':
                if (value === true || value === false) {
                    return true;
                }
                if (value.toLowerCase()) {
                    if (value.toLowerCase() === 'true' || value.toLowerCase() === 'false') {
                        return true;
                    }
                }
                return false;

            case 'date':
            case 'datetime':
            case 'datetimeoffset':
                if  (typeof value  ===  'string') {
                    value = moment.parseZone(value + ' UTC');
                    value = value._d;
                }
                if  (value  instanceof  Date  &&  isFinite(value)) {
                    return  true;
                }
                return false;
            }
        }

        function setHeaderTypeMap(dataModel) {
            var localMap = {};
            for (var i = 0; i < dataModel.entities.length; i++) {
                var entity = dataModel.entities[i];
                localMap[entity.name] = {};
                for (var j = 0; j < entity.properties.length; j++) {
                    var property = entity.properties[j];
                    localMap[entity.name][property.name] = {
                        'type': property.propertyType.toLowerCase(),
                        'isKey': property.isKey
                    };
                }
            }
            return localMap;
        }

        $scope.validateCellData = function (row, colField) {
            // $scope.$emit('ON_BLUR_CELL', row);
            if (!$scope.headerTypeMap) {
                $scope.headerTypeMap = setHeaderTypeMap(row.grid.options.dataModel);
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
            } else {
                if (row.entity.dirtyCells) {
                    var index = row.entity.dirtyCells.indexOf(row.grid.api.cellNav.getFocusedCell().col.name);
                    if (index > -1) {
                        row.entity.dirtyCells.splice(index, 1);
                    }
                }
            }
        };

        $scope.enterPressed = function (row) {

        };
    }
];
