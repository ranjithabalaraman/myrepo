'use strict';

var expect = require('chai').expect;
var commonServer = require('norman-common-server');
var appServerController = require('./controller');
var _ = require('norman-server-tp')['lodash-node'];

var appServerStarted = null;
var eventData = {
    excel: false,
    operations: [],
    projectId: 'project-id-123'
};

var createModel = {
    operation: 'create',
    type: 'model'
};

var createEntity = {
    operation: 'create',
    type: 'entity',
    current: {
        _id: 'entityId1',
        name: 'entityName1'
    },
    previous: {}
};

var createProperty = {
    operation: 'create',
    type: 'property',
    entity: {
        _id: 'entityId1',
        name: 'entityName1'
    },
    current: {
        _id: 'propertyId',
        name: 'ID',
        propertyType: 'String',
        isKey: true,
        isNullable: false,
        isForeignKey: false,
        calculated: {
            inputProperties: []
        }
    },
    previous: {}
};

var addProperty = {
    operation: 'create',
    type: 'property',
    entity: {
        _id: 'entityId1',
        name: 'entityName1'
    },
    current: {
        _id: 'propertyId1',
        name: 'propertyName1',
        propertyType: 'String',
        isKey: true,
        isNullable: false,
        isForeignKey: false,
        calculated: {
            inputProperties: []
        }
    },
    previous: {}
};

var addCalcProperty = {
    operation: 'create',
    type: 'property',
    entity: {
        _id: 'entityId1',
        name: 'entityName1'
    },
    current: {
        _id: 'propertyId2',
        name: 'propertyNameCalc',
        propertyType: 'String',
        isKey: true,
        isNullable: false,
        isForeignKey: false,
        calculated: {
            inputProperties: [{
                'any': 'calc'
            }]
        }
    },
    previous: {}
};

var updateProperty = {
    type: 'property',
    operation: 'update',
    entity: {
        _id: 'entityId1',
        name: 'entityName1Updated'
    },
    previous: {
        _id: 'propertyId1',
        name: 'propertyName1',
        propertyType: 'String',
        isKey: true,
        isNullable: false,
        isForeignKey: false,
        calculated: {
            inputProperties: []
        }
    },
    current: {
        _id: 'propertyId1',
        name: 'propertyName1Updated',
        propertyType: 'String',
        isKey: true,
        isNullable: false,
        isForeignKey: false,
        calculated: {
            inputProperties: []
        }
    }
};

var removeProperty = {
    type: 'property',
    operation: 'delete',
    entity: {
        _id: 'entityId1',
        name: 'entityName1Updated'
    },
    previous: {
        _id: 'propertyId1',
        name: 'propertyName1Updated',
        propertyType: 'String',
        isKey: true,
        isNullable: false,
        isForeignKey: false,
        calculated: {
            inputProperties: []
        }
    },
    current: {}
};

var updateEntity = {
    type: 'entity',
    operation: 'update',
    previous: {
        _id: 'entityId1',
        name: 'entityName1'
    },
    current: {
        _id: 'entityId1',
        name: 'entityName1Updated'
    }
};

var removeEntity = {
    operation: 'delete',
    type: 'entity',
    previous: {
        _id: 'entityId1',
        name: 'entityName1Updated'
    },
    current: {}
};

var deleteModel = {
	    operation: 'delete',
	    type: 'model'
	};



function testFailed(done) {
    return function(err) {
        done(err || new Error('Test failed!!'));
    };
}

//TestSuite
describe('Test Event Operations', function() {
    //0
    it('Prerequisite', function(done) {
        var sampleDataService = null;
        appServerStarted = appServerController.getServerPromise()
            /*.then(function() {
                sampleDataService = commonServer.registry.getModule('SampleDataService');
                var dataManager = require('../lib/services/sampleData/dataManager.js');
                return dataManager.removeUsingProjId(eventData.projectId);
            })
            .then(function() {
                return sampleDataService.getSDfromProjId(eventData.projectId);
            })*/
            .then(function(result) {
                //expect(result).equal(null);
                done();
            })
            .catch(done);
    });

    //1
    it('create Model', function(done) {
        appServerStarted.then(function() {
            eventData.operations.push(createModel);
            var sampleDataService = commonServer.registry.getModule('SampleDataService');
            var dataAdapter = require('../lib/services/sampleData/dataAdapter.js');
            dataAdapter.captureEvent(eventData);
            return sampleDataService.getSDfromProjId(eventData.projectId);
        })
        .then(function(result) {
            expect(result.projectId).equal(eventData.projectId);
            done();
        })
        .catch(done);
    });
    //2
    it('create Entity and add Property ID', function(done) {
        appServerStarted.then(function() {
            eventData.operations = [];
            eventData.operations.push(createEntity);
            eventData.operations.push(createProperty);
            var sampleDataService = commonServer.registry.getModule('SampleDataService');
            var dataAdapter = require('../lib/services/sampleData/dataAdapter.js');
            dataAdapter.captureEvent(eventData);
            sampleDataService.getSDfromProjId(eventData.projectId)
                .then(function(result) {
                    expect(result.projectId).equal(eventData.projectId);
                    var foundEntity = _.find(result.entities, function(item) {
                        return item.entityName === createEntity.current.name;
                    });
                    if (foundEntity) {
                        expect(foundEntity.entityName).equal(createEntity.current.name);
                        if (foundEntity.properties.length !== 0) {
                            expect(foundEntity.properties[0]).to.include.keys(createProperty.current.name);
                            done();
                        }
                    }
                    done();
                })
                .catch(done);
        });
    });

    //3
    it('add Property to existing Entity', function(done) {
        appServerStarted.then(function() {
            eventData.operations = [];
            eventData.operations.push(addProperty);
            var sampleDataService = commonServer.registry.getModule('SampleDataService');
            //insert data to property
            var dataManager = require('../lib/services/sampleData/dataManager.js');
            dataManager.getSDfromProjId(eventData.projectId).then(function(result) {
                var foundEntity = _.find(result.entities, function(item) {
                    return item.entityName === addProperty.entity.name;
                });
                foundEntity.properties.push({
                    'ID': 'id-12345'
                });
                dataManager.updateSDNoValidation(result)
                    .then(function() {
                        var dataAdapter = require('../lib/services/sampleData/dataAdapter.js');
                        dataAdapter.captureEvent(eventData);
                        return sampleDataService.getSDfromProjId(eventData.projectId);
                    })
                    .then(function(result) {
                        var foundEntity1 = _.find(result.entities, function(item) {
                            return item.entityName === createEntity.current.name;
                        });
                        if (foundEntity1) {
                            expect(foundEntity1.entityName).equal(createEntity.current.name);
                            if (foundEntity1.properties.length !== 0) {
                                expect(foundEntity1.properties[0]).to.include.keys(addProperty.current.name);
                                done();
                            }
                        }
                    })
                    .catch(done);

            });
        });
    });

    //4
    it('update Entity Name', function(done) {
        appServerStarted.then(function() {
            eventData.operations = [];
            eventData.operations.push(updateEntity);
            var sampleDataService = commonServer.registry.getModule('SampleDataService');
            var dataAdapter = require('../lib/services/sampleData/dataAdapter.js');
            dataAdapter.captureEvent(eventData);
            sampleDataService.getSDfromProjId(eventData.projectId)
                .then(function(result) {
                    var foundEntity = _.find(result.entities, function(item) {
                        return item.entityId === updateEntity.current._id;
                    });
                    expect(foundEntity.entityName).equal(updateEntity.current.name);
                    done();
                })
                .catch(done);
        });
    });

    //5
    it('update Property', function(done) {
        appServerStarted.then(function() {
            eventData.operations = [];
            eventData.operations.push(updateProperty);
            eventData.operations.push(addCalcProperty);
            var sampleDataService = commonServer.registry.getModule('SampleDataService');
            var dataAdapter = require('../lib/services/sampleData/dataAdapter.js');
            dataAdapter.captureEvent(eventData);
            sampleDataService.getSDfromProjId(eventData.projectId)
                .then(function(result) {
                    var foundEntity = _.find(result.entities, function(item) {
                        return item.entityId === updateEntity.current._id;
                    });
                    if (foundEntity) {
                        expect(foundEntity.properties[0]).to.include.keys(updateProperty.current.name);
                        expect(foundEntity.properties[0]).to.not.include.keys(addCalcProperty.current.name);
                    }
                    done();
                })
                .catch(done);

        });
    });

    //5
    it('remove Property', function(done) {
        appServerStarted.then(function() {
            eventData.operations = [];
            eventData.operations.push(removeProperty);
            var sampleDataService = commonServer.registry.getModule('SampleDataService');
            var dataAdapter = require('../lib/services/sampleData/dataAdapter.js');
            dataAdapter.captureEvent(eventData);
            sampleDataService.getSDfromProjId(eventData.projectId)
                .then(function(result) {
                    var foundEntity = _.find(result.entities, function(item) {
                        return item.entityId === updateEntity.current._id;
                    });
                    if (foundEntity) {
                        expect(foundEntity.properties[0]).to.not.include.keys(removeProperty.previous.name);
                    }
                    done();
                })
                .catch(done);
        });
    });

    //6
    it('remove Entity', function(done) {
        appServerStarted.then(function() {
            eventData.operations = [];
            eventData.operations.push(removeEntity);
            var sampleDataService = commonServer.registry.getModule('SampleDataService');
            var dataAdapter = require('../lib/services/sampleData/dataAdapter.js');
            dataAdapter.captureEvent(eventData);
            sampleDataService.getSDfromProjId(eventData.projectId)
                .then(function(result) {
                    var foundEntity = _.find(result.entities, function(item) {
                        return item.entityId === removeEntity.previous._id;
                    });
                    expect(foundEntity).equal(undefined);
                    done();
                })
                .catch(done);
        });
    });

    //7
    /*it('delete model', function(done) {
        appServerStarted.then(function() {
            eventData.operations = [];
            eventData.operations.push(deleteModel);
            var sampleDataService = commonServer.registry.getModule('SampleDataService');
            var dataAdapter = require('../lib/services/sampleData/dataAdapter.js');
            dataAdapter.captureEvent(eventData);
            sampleDataService.getSDfromProjId(eventData.projectId)
                .then(function(result) {
                    expect(result).equal(null);
                    done();
                })
                .catch(done);
        });
    });*/

    it('parallel operation - Create and Get Sample Data with Wait as true', function(done) {
        appServerStarted.then(function() {
            eventData.operations = [];
            eventData.operations.push(createModel);
            var sampleDataService = commonServer.registry.getModule('SampleDataService');
            var dataAdapter = require('../lib/services/sampleData/dataAdapter.js');
            dataAdapter.captureEvent(eventData);
            return sampleDataService.getSDfromProjId(eventData.projectId)
                .then(function(sampleData) {
                    expect(sampleData.projectId).equals(eventData.projectId);
                    done();
                })
                .catch(done);
        });
    });

    it('parallel operation - Create and Get Sample Data with Wait as false', function(done) {
        appServerStarted.then(function() {
            eventData.operations = [];
            eventData.projectId = 'NoWaitGetSample';
            eventData.operations.push(createModel);
            var sampleDataService = commonServer.registry.getModule('SampleDataService');
            var dataAdapter = require('../lib/services/sampleData/dataAdapter.js');
            dataAdapter.captureEvent(eventData);
            return sampleDataService.getSDfromProjId(eventData.projectId, null, false)
                .then(function() {
                    done(new Error('Test Failed'));
                }, function(err) {
                    expect(err).equals('Sample Data Update is progress.');
                    done();
                });
        });
    });
});