'use strict';

var SAMPLE_METADATA = 'sampleMetadata';
var UPDATE_ACTION = 'UPDATE';
var CREATE_ACTION = 'CREATE';

var Promise = require('norman-promise');
var commonServer = require('norman-common-server');
var ServerError = commonServer.NormanError;
var mongooseModel = require('./model');

var prototypeService = null;

exports.get = function(projectId) {
    return prototypeService.getMetadata(projectId, [SAMPLE_METADATA])
        .then(function(metadata) {
            var sampleData = metadata.sampleMetadata[metadata.sampleMetadata.length - 1];
            if (!sampleData) {
                throw new ServerError('Sample Metadata not found! ProjectID: ' + projectId, 404);
            }
            return sampleData;
        });
};

exports.update = function(sampleData, user) {
    var Model = mongooseModel.getModel().SampleData;
    var metaData = {
        type: SAMPLE_METADATA,
        OP: UPDATE_ACTION,
        oldId: sampleData._id
    };

    sampleData._id = commonServer.utils.shardkey();
    sampleData.version++;
    metaData.model = new Model(sampleData);
    var metadataArray = [metaData];

    return exports.doMetadata(sampleData.projectId, metadataArray, user);
};

exports.create = function(projectId, sampleData, user) {
    var metadataArray = [{
        model: sampleData,
        type: SAMPLE_METADATA,
        OP: CREATE_ACTION
    }];
    return prototypeService.createPrototype(projectId, metadataArray, user)
        .then(exports.get);
};

exports.initialize = function(done) {
    var model = mongooseModel.getModel();
    mongooseModel.createIndexes(done);
    return model.SampleData;
};

exports.onInitialize = function() {
    prototypeService = commonServer.registry.getModule('PrototypeService');
};

exports.doMetadata = function(projectId, metadataArray, user) {
    if (!projectId || !metadataArray) {
        Promise.reject('doMetadata: parameters mandatory');
    }

    return prototypeService.doMetadata(projectId, metadataArray, user)
        .then(function(){
            var dataModeler = commonServer.registry.getModule('Model');
            dataModeler.generateSampleDataArtifacts(projectId, metadataArray[0].model.toJSON());
        })
        .then(function() {
            return exports.get(projectId);
        });
};
