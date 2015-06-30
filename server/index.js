'use strict';

var commonServer = require('norman-common-server');
var services = require('./lib/services');
var api = require('./lib/api');

var logger = commonServer.logging.createLogger('sample-service');

module.exports = {
    initialize: function(done) {
        logger.info('Initializing Sample service');
        services.initialize(function(err) {
            if (err) {
                done(err);
            } else {
                done();
            }
        });
    },
    onInitialized: function() {
        logger.info('Sample service post-initialization');
        services.onInitialized();
    },
    shutdown: function(done) {
        logger.info('Stopping sample service');
        api.shutdown();
        services.shutdown(done);
    },
    getHandlers: function() {
        api.initialize();
        logger.debug('Get sample service handlers');
        return api.getHandlers();
    }
};
