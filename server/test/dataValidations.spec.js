'use strict';

var commonServer = require('norman-common-server');
var appServerController = require('./controller');
var appServerStarted = null;

var expect = require('chai').expect;

var sampleDataID = null;
var dataModelJson = {
    'projectId': 'p1',
    'entities': [{
            '_id': 'e1',
            'name': 'SalesOrder',
            'navigationProperties': [{
                '_id': 'nav1',
                'toEntityId': 'e2',
                'name': 'SalesOrderItemSet',
                'referentialConstraints': [{
                    'entityId': 'e1',
                    'propertyRef': 'e1p1'
                }, {
                    'entityId': 'e2',
                    'propertyRef': 'e2p5'
                }]
            }],
            'properties': [{
                '_id': 'e1p1',
                'name': 'ID',
                'isKey': true,
                'isForeignKey': false,
                'propertyType': 'String'
            }, {
                '_id': 'e1p2',
                'name': 'Desc',
                'isKey': false,
                'isForeignKey': false,
                'propertyType': 'String'
            }, {
                '_id': 'e1p3',
                'name': 'CompanY',
                'isKey': false,
                'isForeignKey': false,
                'propertyType': 'String'
            }]
        }, {
            '_id': 'e2',
            'name': 'SalesOrderItem',
            'navigationProperties': [],
            'properties': [{
                '_id': 'e2p1',
                'name': 'ID',
                'isForeignKey': false,
                'isKey': true,
                'propertyType': 'String'
            }, {
                '_id': 'e2p2',
                'name': 'lineNo',
                'isForeignKey': false,
                'isKey': true,
                'propertyType': 'String'
            }, {
                '_id': 'e2p3',
                'name': 'Qty',
                'isForeignKey': false,
                'isKey': false,
                'propertyType': 'int'
            }, {
                '_id': 'e2p4',
                'name': 'ProdId',
                'isForeignKey': false,
                'isKey': false,
                'propertyType': 'String'
            }, {
                '_id': 'e2p5',
                'name': 'SalesOrderID',
                'isForeignKey': true,
                'isKey': false,
                'propertyType': 'String'
            }]
        }

    ],

    'sampleData': '54d095d30b2aa22044bfaf79'
};
var sampleData = [{
    entityName: 'salesorder',
    properties: [{
        'id': '11',
        'desc': 'description1',
        'company': 'ABC'
    }, {
        'id': '22',
        'desc': 'description2',
        'company': 'SAP Labs'
    }, {
        'id': '33',
        'desc': 'description3',
        'company': 'XYZ'
    }]
}, {
    entityName: 'salesorderitem',
    properties: [{
        'id': '1',
        'lineno': '1',
        'qty': '25',
        'prodid': 'prod1',
        'salesorderid': '11'
    }, {
        'id': '1',
        'lineno': '2',
        'qty': '400',
        'prodid': 'prod2',
        'salesorderid': '11'
    }, {
        'id': '2',
        'lineno': '1',
        'qty': '5',
        'prodid': 'prod4',
        'salesorderid': '22'
    }, {
        'id': '3',
        'lineno': '1',
        'qty': '95',
        'prodid': 'prod1',
        'salesorderid': '33'
    }, {
        'id': '3',
        'lineno': '2',
        'qty': '456',
        'prodid': 'prod11',
        'salesorderid': '33'
    }]
}];

function testFailed(done) {
    return function(err) {
        done(err || new Error('Test failed!!'));
    };
}

//Validations to check
//*********************************************************
// Format Sample data - names in the same case as Data model
// Check for valid entities, properties
// Check for duplicate entities
// Primary Key checks
//        - Check if value is provided
//        - Check if duplicate keys are provided
// Foreign Key checks
//        - If the corresponding Primary key is not found, value should be set to null
// Data Type conversion checks

//TestSuite
describe('Test SampleData validations', function() {
    //0
    it('Init', function(done) {
        this.timeout(5000);
        appServerStarted = appServerController.getServerPromise()
            .then(function() {
                done();
            })
            .catch(function(err) {
                console.log(err);
                done(err);
            });
    });

    //1
    it('Format sample data', function(done) {
        appServerStarted
            .then(function() {
                var sampleDataService = commonServer.registry.getModule('SampleDataService');
                var jsonData = {
                    name: 'FormatSample',
                    projectId: 'p1',
                    entities: _.clone(sampleData, true)
                };
                var abc = sampleDataService.getSampleDataMetadata(jsonData.projectId);
                return abc;
                // return sampleDataService.create(dataModelJson, jsonData);
            })
            .then(function(result) {
                sampleDataID = result._id.toString();
                expect(result.name).equal('FormatSample');
                done();
            })
            .catch(done);
    });

    //2
    it('Valid Entity check', function(done) {
        appServerStarted.then(function() {
                var sampleDataService = commonServer.registry.getModule('SampleDataService');
                var jsonData = {
                    name: 'EntityValidSample',
                    projectId: 'p2',
                    entities: _.clone(sampleData, true)
                };
                jsonData.entities.push({
                    entityName: 'invalidEntity',
                    properties: [{
                        'id': '1',
                        'lineno': '1',
                        'qty': '25',
                        'prodid': 'prod1',
                        'salesorderid': '11'
                    }]
                }, {
                    entityName: 'invalidEntity123',
                    properties: [{
                        'id': '1',
                        'lineno': '1',
                        'qty': '25',
                        'prodid': 'prod1',
                        'salesorderid': '11'
                    }]
                });

                return sampleDataService.create(dataModelJson, jsonData);

            })
            .then(function() {
                done(new Error('Test Failed'));
            })
            .catch(function(err) {
                expect(err.errorList).to.include('Entity "invalidEntity" not found');
                done();
            })
            .catch(done);
    });

    //3
    it('Validate Duplicate Entity', function(done) {
        appServerStarted.then(function() {
                var sampleDataService = commonServer.registry.getModule('SampleDataService');
                var jsonData = {
                    name: 'DuplicateEntitySample',
                    projectId: 'p2',
                    entities: _.clone(sampleData, true)
                };
                jsonData.entities.push({
                    entityName: 'salesorderitem',
                    properties: [{
                        'id': '1'
                    }]
                });

                return sampleDataService.create(dataModelJson, jsonData);

            })
            .then(function() {
                done(new Error('Test Failed'));
            })
            .catch(function(err) {
                expect(err.errorList).to.include('Duplicate Entities found.');
                done();
            })
            .catch(done);
    });

    //4
    it('Valid Property check', function(done) {
        appServerStarted.then(function() {
                var sampleDataService = commonServer.registry.getModule('SampleDataService');
                var jsonData = {
                    name: 'PropValidSample',
                    projectId: 'p3',
                    entities: _.clone(sampleData, true)
                };
                jsonData.entities[1].properties[1].invalidProp = 'wrong value';

                return sampleDataService.create(dataModelJson, jsonData);
            })
            .then(function() {
                done(new Error('Test Failed'));
            })
            .catch(function(err) {
                expect(err.errorList).to.include('Invalid property: invalidProp');
                done();
            })
            .catch(done);
    });

    //5
    it('Check if all Primary Key values are provided', function(done) {
        appServerStarted.then(function() {
                var sampleDataService = commonServer.registry.getModule('SampleDataService');
                var jsonData = {
                    name: 'PrimKeyNullNotValidSample',
                    projectId: 'p4',
                    entities: _.clone(sampleData, true)
                };
                jsonData.entities[1].properties[1].lineno = null;
                return sampleDataService.create(dataModelJson, jsonData);
            })
            .then(function() {
                done(new Error('Test Failed'));
            })
            .catch(function(err) {
                expect(err.errorList).to.include('Key value missing for Property: lineno');
                done();
            })
            .catch(done);
    });

    //6
    it('Check for duplicate primary keys', function(done) {
        appServerStarted.then(function() {
                var sampleDataService = commonServer.registry.getModule('SampleDataService');
                var jsonData = {
                    name: 'duplicateKeysSample',
                    projectId: 'p5',
                    entities: _.clone(sampleData, true)
                };
                jsonData.entities[1].properties[1].lineno = 1;
                return sampleDataService.create(dataModelJson, jsonData);
            })
            .then(function() {
                done(new Error('Test Failed'));
            })
            .catch(function(err) {
                expect(err.errorList).to.include('Duplicate Primary Key for Entity ID: e2');
                done();
            })
            .catch(done);
    });

    //7
    it('Replace invalid foreign keys with Null', function(done) {
        appServerStarted.then(function() {
                var sampleDataService = commonServer.registry.getModule('SampleDataService');
                var jsonData = {
                    name: 'invalidForeignKeySample',
                    projectId: 'p6',
                    entities: _.clone(sampleData, true)
                };
                jsonData.entities[1].properties[1].salesorderid = 1001;
                return sampleDataService.create(dataModelJson, jsonData);
            })
            .then(function(result) {
                var foreignKeyVal = result.entities[1].properties[1].SalesOrderID;
                expect(foreignKeyVal).equal(null);
                done();
            })
            .catch(done);
    });

    //8
    it('Data Conversion validations', function(done) {
        appServerStarted.then(function() {
                var sampleDataService = commonServer.registry.getModule('SampleDataService');
                var jsonData = {
                    name: 'DataConversionValidation',
                    projectId: 'p7',
                    entities: _.clone(sampleData, true)
                };
                jsonData.entities[1].properties[1].qty = '200';
                jsonData.entities[1].properties[2].prodid = 999;
                jsonData.entities[0].properties[0].id = 1;

                return sampleDataService.create(dataModelJson, jsonData);
            })
            .then(function(result) {
                expect(result.entities[1].properties[1].Qty).equal(200);
                expect(result.entities[1].properties[2].ProdId).equal('999');
                expect(result.entities[0].properties[0].ID).equal('1');
                var foreignKey1 = result.entities[1].properties[0].SalesOrderID;
                var foreignKey2 = result.entities[1].properties[1].SalesOrderID;
                expect(foreignKey1).equal(null);
                expect(foreignKey2).equal(null);
                done();
            })
            .catch(done);
    });
    //9
    it('Get Sample Data given projectId', function(done) {
        appServerStarted.then(function() {
                var sampleDataService = commonServer.registry.getModule('SampleDataService');
                return sampleDataService.getSDfromProjId('p7');
            })
            .then(function(result) {
                expect(result.entities[0].entityName).equal('SalesOrder');
                expect(result.entities[1].entityName).equal('SalesOrderItem');
                done();
            })
            .catch(done);
    });

    //10
    it('Get Sample Data given projectId and entityNames', function(done) {
        appServerStarted.then(function() {
                var sampleDataService = commonServer.registry.getModule('SampleDataService');
                return sampleDataService.getSDfromProjId('p7', ['SalesOrderItem']);
            })
            .then(function(result) {
                expect(result.entities.length).equal(1);
                expect(result.entities[0].entityName).equal('SalesOrderItem');
                done();
            })
            .catch(done);
    });

    //11
    it('Get Entity Data given projectId and entityName', function(done) {
        appServerStarted
            .then(function() {
                var sampleDataService = commonServer.registry.getModule('SampleDataService');
                return sampleDataService.getEntityDataFromProjId('p7', 'SalesOrderItem');
            })
            .then(function(result) {
                expect(result.length).equal(5);
                done();
            })
            .catch(done);
    });
    //12
    it('Validate Multiple Errors', function(done) {
        appServerStarted.then(function() {
                var sampleDataService = commonServer.registry.getModule('SampleDataService');
                var jsonData = {
                    name: 'DuplicateEntitySample',
                    projectId: 'p2',
                    entities: _.clone(sampleData, true)
                };
                jsonData.entities[1].properties[0].invalidProp = 'wrong value';
                jsonData.entities.push({
                    entityName: 'salesorderitem',
                    properties: [{
                        'id': '1'
                    }]
                }, {
                    entityName: 'invalidEntity',
                    properties: [{
                        'id': '1',
                        'lineno': '1',
                        'qty': '25',
                        'prodid': 'prod1',
                        'salesorderid': '11'
                    }]
                });

                return sampleDataService.create(dataModelJson, jsonData);

            })
            .then(function() {
                done(new Error('Test Failed'));
            })
            .catch(function(err) {
                expect(err.errorList).to.include('Duplicate Entities found.');
                expect(err.errorList).to.include('Invalid property: invalidProp');
                expect(err.errorList).to.include('Entity "invalidEntity" not found');
                done();

            })
            .catch(done);
    });

    //13
    it('Copy Sample Data', function(done) {
        appServerStarted.then(function() {
                var sampleDataService = commonServer.registry.getModule('SampleDataService');
                return sampleDataService.copySampleData(sampleDataID);
            })
            .then(function(result) {
                expect(result.name).equal('FormatSample');
                done();
            })
            .catch(done);
    });
});
