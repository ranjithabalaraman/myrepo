'use strict';

var registry = require('norman-common-server').registry;
var SampleDataService = require('./sampleData');
var SAMPLE_SERVICE = 'SampleDataService';

registry.registerModule(new SampleDataService(), SAMPLE_SERVICE);


module.exports = {
    initialize: function (done) {
        var service = registry.getModule(SAMPLE_SERVICE);
        service.initialize(done);
    },
    onInitialized: function(){
      var service = registry.getModule(SAMPLE_SERVICE);
      service.onInitialized();
    },
    shutdown: function (done) {
        var service = registry.getModule(SAMPLE_SERVICE);
        registry.unregisterModule(SAMPLE_SERVICE);
        service.shutdown(done);
    }
};
