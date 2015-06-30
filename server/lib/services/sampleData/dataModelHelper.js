'use strict';
var _ = require('norman-server-tp')['lodash-node'];

module.exports = function DataModel(dataModelJson) {
    if (!(this instanceof DataModel)) {
        return new DataModel(dataModelJson);
    }
    this.idMap = {
        entityMap: {},
        foreignKeyMap: {}
    };
    this.lcaseEntityPropMap = _.transform(dataModelJson.entities, function(result, entity) {
        var entityName = entity.name;
        var lcaseEntityName = entityName.toLowerCase();
        this.idMap.entityMap[entity._id] = {
            name: entityName,
            properties: {}
        };
        result[lcaseEntityName] = {
            _id: entity._id,
            name: entityName,
            properties: {},
            navProps: []
        };
        var props = _.transform(entity.properties, function(result, prop) {
            result[prop.name.toLowerCase()] = prop;
            this.idMap.entityMap[entity._id].properties[prop._id] = prop;
            return result;
        }, {}, this);
        result[lcaseEntityName].properties = props;
        var foreignKeys = this.idMap.foreignKeyMap;
        for (var i = 0; i < entity.navigationProperties.length; i++) {
            var nav = entity.navigationProperties[i];
            var refConstr = null,
                selfForeignKey = null,
                primKeySelf = null,
                primKey = null,
                foreignKey = null;
            var primKeyEntity = null;
            //only two elements will be there in referentialConstraints
            //as we support only simple keys
            var fromKeyFound = false;
            var bSelfNavigation = false;
            for (var j = 0; j < nav.referentialConstraints.length; j++) {
                refConstr = nav.referentialConstraints[j];
                if (nav.multiplicity) {
                    if (refConstr.entityId === entity._id) {
                        if(!primKey){
                            primKey = refConstr.propertyRef;
                            primKeyEntity = refConstr.entityId;
                            fromKeyFound = true;
                        }else{
                            //its self navigation
                            bSelfNavigation = true;
                            foreignKey = refConstr.propertyRef;
                        }
                    } else {
                        foreignKey = refConstr.propertyRef;
                        result[lcaseEntityName].navProps.push({
                            entityId: refConstr.entityId,
                            foreignKeyId: foreignKey
                        });
                    }
                } else {
                    if (refConstr.entityId === entity._id) {
                        foreignKey = refConstr.propertyRef;
                        if(fromKeyFound){
                            bSelfNavigation = true;
                            primKeySelf = refConstr.propertyRef;
                        }else{
                            if(!primKey) {
                                primKey = refConstr.propertyRef;
                                primKeyEntity = refConstr.entityId;
                            }
                            selfForeignKey = refConstr.propertyRef;
                        }
                        fromKeyFound = true;
                    } else {
                        primKey = refConstr.propertyRef;
                        primKeyEntity = refConstr.entityId;
                        result[lcaseEntityName].navProps.push({
                            entityId: refConstr.entityId,
                            foreignKeyId: primKey
                        });
                    }
                }
            }
            if (nav.multiplicity) {
                if (!foreignKeys[nav.toEntityId]) {
                    foreignKeys[nav.toEntityId] = {};
                }
                foreignKeys[nav.toEntityId][foreignKey] = {
                    entityId: primKeyEntity,
                    primaryKeyId: primKey
                };
            } else {
                if (!foreignKeys[entity._id]) {
                    foreignKeys[entity._id] = {};
                }
                if(bSelfNavigation){
                    foreignKeys[entity._id][selfForeignKey] = {
                        entityId: primKeyEntity,
                        primaryKeyId: primKeySelf
                    };
                }else{
                    foreignKeys[entity._id][foreignKey] = {
                        entityId: primKeyEntity,
                        primaryKeyId: primKey
                    };
                }
            }
        }

        return result;
    }, {}, this);

    this.getModelEntityNameMap = function(entityName) {
        return this.lcaseEntityPropMap[entityName.toLowerCase()];
    };
    this.getModelPropMeta = function(entityName, propertyName) {
        var entityMap = this.getModelEntityNameMap(entityName);
        if (!entityMap) {
            return null;
        }
        return entityMap.properties[propertyName.toLowerCase()];
    };
    this.getPrimaryKeyMetaData = function(foreignEntityId, foreignKeyId) {
        if (this.idMap.foreignKeyMap[foreignEntityId]) {
            return this.idMap.foreignKeyMap[foreignEntityId][foreignKeyId];
        }
        return null;
    };
    this.getEntityIdMap = function(entityId) {
        return this.idMap.entityMap[entityId];
    };
    this.getNavEntityInfo = function(entityName) {
        var entityMap = this.lcaseEntityPropMap[entityName.toLowerCase()];
        if (!entityMap) {
            throw 'Entity Not found: ' + entityName;
        }
        var out = [];
        for (var i = 0; i < entityMap.navProps.length; i++) {
            var navProp = entityMap.navProps[i];
            var childEntityMap = this.idMap.entityMap[navProp.entityId];
            out.push({
                entityName: childEntityMap.name,
                foreignKeyName: childEntityMap.properties[navProp.foreignKeyId]
            });
        }
        return out;
    };
};
