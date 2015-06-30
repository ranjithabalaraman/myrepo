'use strict';

module.exports = [
  '$scope',
  '$timeout',
  function($scope) {
    $scope.triggerNewLine = function(row) {
      $scope.$emit('ADD_LINE', row);
    };
  }
];
