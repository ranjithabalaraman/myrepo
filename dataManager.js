'use strict';

var commonServer = require('norman-common-server');
var DataModel = require('./dataModelHelper');
var Promise = require('norman-promise');
var _ = require('norman-server-tp')['lodash-node'];
var serviceLogger = commonServer.logging.createLogger('sampleDataService');
var processQueue = require('./processQueue');
var prototypeHelper = require('./prototypeHelper');

var removeEntity = null;

function throwErrors(errorList, pDefer) {
    var validationError = {
        text: 'Validation Failed',
        errorList: errorList
    };
    pDefer.reject(validationError);
    //throw validationError;
}

function lodashRemoveEntity(item) {
    if (!item) {
        return true;
    }
    return item.entityName === removeEntity;
}

function removeNull(item) {
    return !Object.keys(item).length;
}

function SampleDataManager(sampleData, dataModel, bValidate, pDefer) {
    var p = Promise.defer();
    var errorList = [];
    if (!(this instanceof SampleDataManager)) {
        return new SampleDataManager(sampleData, dataModel, bValidate);
    }
    this.sampleData = sampleData;
    if (bValidate) {
        if (!dataModel) {
            var body = {
                "text": 'Data Model is required for validation.'
            }
            errorList.push(body);
            throwErrors(errorList, pDefer);
        }
        this.dataModel = new DataModel(dataModel);
    }
    //validates primary key uniqueness
    //works for complex keys as well
    this.validatePrimaryKeys = function (primaryKeys) {
        if (!primaryKeys) {
            return;
        }
        var pkNames = null;

        function concatKeys(elem) {
            return JSON.stringify(elem, pkNames);
        }

        for (var entityId in primaryKeys) {
            var entityPKs = primaryKeys[entityId];
            pkNames = _.keys(entityPKs[0]);
            _.remove(primaryKeys[entityId], removeNull);
            var trimmedData = _.uniq(primaryKeys[entityId], concatKeys);
            if (primaryKeys[entityId].length !== trimmedData.length) {
                //var entityName = this.
                var body = {
                    "text": 'Duplicate Primary Key for Entity : ' + this.dataModel.idMap.entityMap[entityId].name
                }
                errorList.push(body);
            }
        }
    };

    this.validateForeignKeys = function (primKeyArrays) {
        for (var i = 0; i < this.sampleData.entities.length; i++) {
            var entity = this.sampleData.entities[i];
            var dEntityProp = this.dataModel.getModelEntityNameMap(entity.entityName);
            var dPropNames = dEntityProp.properties;
            for (var j = 0; j < entity.properties.length; j++) {
                var prop = entity.properties[j];
                for (var propName in prop) {
                    var propMeta = dPropNames[propName.toLowerCase()];
                    if (!propMeta.isForeignKey) {
                        continue;
                    }
                    var dPrimKeyData = this.dataModel.getPrimaryKeyMetaData(entity.entityId, propMeta._id);
                    if (!dPrimKeyData) {
                        prop[propName] = null;
                        continue;
                    }
                    if (!primKeyArrays[dPrimKeyData.entityId]) {
                        continue;
                    }
                    var primKeyVals = primKeyArrays[dPrimKeyData.entityId][dPrimKeyData.primaryKeyId];
                    if (!primKeyVals) {
                        prop[propName] = null;
                        continue;
                    }
                    if (primKeyVals.indexOf(prop[propName]) === -1) {
                        prop[propName] = null;
                    }
                }
            }
        }
    };

    //format corrects the entity and property names (case) as per Data Model
    //format does the check for existence of entity names and property names
    this.formatAndValidate = function () {

        var primaryKeys = {};
        var primKeyArrays = {};
        var uniqueEntities = _.uniq(this.sampleData.entities, function (item) {
            return item.entityName.toLowerCase();
        });
        if (uniqueEntities.length !== this.sampleData.entities.length) {
            var body = {
                "text": 'Duplicate Entities found.'
            }
            errorList.push(body);
            //also removes the duplicated entity to avoid clash in further validation
        }
        var removableEntities = [];
        this.sampleData.entities = _.map(this.sampleData.entities, function (sdEntity) {
            var outEntity = {};
            var lEntityProp = this.dataModel.getModelEntityNameMap(sdEntity.entityName);
            if (!lEntityProp) {
                var body = {
                    "text": 'Entity "' + sdEntity.entityName + '" not found'
                }
                errorList.push(body);
                //remove if invalid entity to skip property validation
                removableEntities.push(sdEntity.entityName);
                return null;
            }
            outEntity.entityName = lEntityProp.name;
            outEntity.entityId = lEntityProp._id;
            var dPropNames = lEntityProp.properties;
            primaryKeys[lEntityProp._id] = [];
            primKeyArrays[lEntityProp._id] = {};
            outEntity.properties = _.map(sdEntity.properties, function (sdPropObj) {
                var pmKeyEntry = {};
                var outProp = {};
                for (var sdPropName in sdPropObj) {
                    var propMeta = dPropNames[sdPropName.toLowerCase()];
                    var propValue = sdPropObj[sdPropName];
                    if (!propMeta) {
                        errorList.push({
                            "text": 'Invalid property: ' + sdPropName
                        });
                        continue;
                    }
                    var calculated = propMeta.calculated;
                    if (calculated && calculated.inputProperties && calculated.inputProperties.length !== 0) {
                        //its a calculated property so eliminate the property
                        continue;
                    }
                    if (propMeta.isKey && !propValue) {
                        var body = {
                            "text": 'Key value missing for Property: ' + sdPropName + ' in Entity: ' + sdEntity.entityName
                        }
                        errorList.push(body);
                        continue;
                    }
                    var expectedType = propMeta.propertyType;
                    var convertedValue = module.exports.checkAndConvertType(propValue, expectedType);
                    outProp[propMeta.name] = convertedValue;
                    if (propMeta.isKey) {
                        pmKeyEntry[propMeta._id] = convertedValue;
                        if (!primKeyArrays[lEntityProp._id][propMeta._id]) {
                            primKeyArrays[lEntityProp._id][propMeta._id] = [];
                        }
                        primKeyArrays[lEntityProp._id][propMeta._id].push(convertedValue);
                    }
                }
                primaryKeys[lEntityProp._id].push(pmKeyEntry);
                return outProp;
            }, this);
            return outEntity;
        }, this);
        if (removableEntities.length > 0) {
            for (var i = 0; i < removableEntities.length; i++) {
                removeEntity = removableEntities[i];
                _.remove(this.sampleData.entities, lodashRemoveEntity);
            }
        }
        this.validatePrimaryKeys(primaryKeys);
        this.validateForeignKeys(primKeyArrays);
    };
    if (bValidate) {
        this.formatAndValidate();
        if (errorList.length > 0) {
            throwErrors(errorList, pDefer);
        }
    }
    return p.Promise;
}

module.exports = {
    initialize: function (done) {
        return prototypeHelper.initialize(done);
    },

    onInitialized: function () {
        prototypeHelper.onInitialize();
    },

    updateSD: function (dataModelJson, sampleData, bValidate, bWait, user) {

        var projectId = dataModelJson.projectId;
        var whenEventQueueProcessFinished = function () {
            var p = Promise.defer();
            processQueue.addPromiseInQueue(projectId, p);
            processQueue.resolvePromiseQueue(projectId);
            return p.promise;
        };

        var doUpdate = function () {
            if (!dataModelJson.projectId) {
                throw 'Project Id is mandatory.';
            }
            if (sampleData.projectId) {
                if (sampleData.projectId !== dataModelJson.projectId) {
                    throw 'Invalid Project Id.';
                }
            } else {
                sampleData.projectId = dataModelJson.projectId;
            }

            var generateSDMInstance = function () {
                var p = Promise.defer();
                try {
                    p.resolve(new SampleDataManager(sampleData, dataModelJson, bValidate, p));
                } catch (err) {
                    p.reject(err);
                }
                return p.promise;
            };
            return generateSDMInstance()
                .then(function (sdMInstance) {
                    return prototypeHelper.update(sdMInstance.sampleData, user);
                })
                .catch(function (err) {
                    serviceLogger.error(err);
                    throw err;
                });
        };

        if (processQueue.isEventQueueEmpty(projectId)) {
            return doUpdate();
        }
        if (bWait === false) {
            return Promise.reject('Sample Data Update is progress.');
        }
        return whenEventQueueProcessFinished()
            .then(doUpdate);
    },

    updateSDNoValidation: function (sampleData, user) {
        var sdMInstance = new SampleDataManager(sampleData, null, false);

        return prototypeHelper.update(sdMInstance.sampleData, user)
            .catch(function (err) {
                serviceLogger.error(err);
                throw err;
            });
    },

    getSDfromProjId: function (projectId, entityNamesArray, wait) {

        var triggerGetData = function () {
            return prototypeHelper.get(projectId)
                .then(function (result) {
                    if (!result) {
                        return null;
                    }
                    var sdResult = result;
                    if (entityNamesArray && entityNamesArray.length > 0) {
                        var lEntityNamesArray = _.map(entityNamesArray, function (name) {
                            return name.toLowerCase();
                        });
                        var filteredEntities = _.filter(sdResult.entities, function (entity) {
                            return (lEntityNamesArray.indexOf(entity.entityName.toLowerCase()) !== -1);
                        });
                        sdResult.entities = filteredEntities;
                    }
                    return sdResult;
                })
                .catch(function (err) {
                    serviceLogger.error(err);
                    throw err;
                });
        };

        var whenEventQueueProcessFinished = function () {
            var p = Promise.defer();
            processQueue.addPromiseInQueue(projectId, p);
            processQueue.resolvePromiseQueue(projectId);
            return p.promise;
        };

        if (processQueue.isEventQueueEmpty(projectId)) {
            return triggerGetData();
        } else {
            if (wait === false) {
                return Promise.reject('Sample Data Update is progress.');
            }

            return whenEventQueueProcessFinished()
                .then(triggerGetData)
                .catch(function (err) {
                    serviceLogger.error(err);
                    throw err;
                });
        }
    },

    getSDfromProjIdNoWait: function (projectId, entityNamesArray) {
        return prototypeHelper.get(projectId)
            .then(function (result) {
                if (!result) {
                    return null;
                }
                var sdResult = result;
                if (entityNamesArray && entityNamesArray.length > 0) {
                    var lEntityNamesArray = _.map(entityNamesArray, function (name) {
                        return name.toLowerCase();
                    });
                    var filteredEntities = _.filter(sdResult.entities, function (entity) {
                        return (lEntityNamesArray.indexOf(entity.entityName.toLowerCase()) !== -1);
                    });
                    sdResult.entities = filteredEntities;
                }
                return sdResult;
            }, function (err) {
                serviceLogger.error(err);
                throw err;
            });
    },

    checkAndConvertType: function (data, toType) {
        if (data === null || data === undefined || !toType) {
            return null;
        }
        switch (toType.toLowerCase()) {
        case 'decimal':
        case 'float':
        case 'number':
        case 'single':
        case 'double':
            if (typeof (data) === 'number') {
                return data;
            }
            var parsedNum = parseFloat(data);
            if (!isNaN(parsedNum)) {
                return parsedNum;
            }
            return null;

        case 'int':
        case 'int16':
        case 'int32':
        case 'int64':
        case 'integer':
            var parsedNumInt = parseInt(data);
            if (!isNaN(parsedNumInt)) {
                return parsedNumInt;
            }
            return null;

        case 'boolean':
            if (typeof (data) === 'boolean') {
                return data;
            } else if (typeof (data) === 'string') {
                data = data.toLowerCase();
                if (data === 'true') {
                    return true;
                } else if (data === 'false') {
                    return false;
                } else {
                    return null;
                }
            }
            return null;

        case 'date':
        case 'datetime':
        case 'datetimeoffset':
            if (data instanceof Date && isFinite(data)) {
                return data;
            }

            //TODO: REPLACE WITH UNDEFINED
            return null;

        case 'string':
            return String(data);

        default:
            //Unknow type, return undefined
            //TODO: REPLACE WITH UNDEFINED
            return data;
        }
    }
};
