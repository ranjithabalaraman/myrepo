'use strict';

module.exports = [
  '$scope',
  '$timeout',
  function($scope, $timeout) {

    $scope.rowHeaderClicked = function(row) {
      if (row.isSelected) {
        row.grid.api.selection.unSelectRow(row.entity);
      } else {
        row.grid.api.selection.selectRow(row.entity);
      }
      row.clicked = true;
    };

    $scope.rowHeaderLostFocus = function(row) {
      $timeout(function() {
        row.clicked = false;
      }, 250); // delay 250 ms
    };

    $scope.triggerAddRow = function(row) {
      $scope.$emit('ADD_LINE', row);
    };

    $scope.triggerDuplicate = function(row) {
      $scope.$emit('DUPLICATE_LINE', row);
    };

    $scope.trigerDeleteRow = function(row) {
      $scope.$emit('DELETE_LINE', row);
    };
      this.rowTemplateControllerSafe = true;
  }
];
