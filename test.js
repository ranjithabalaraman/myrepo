'use strict';

function DataModelHelper(dataModelJson) {
    if (!(this instanceof DataModelHelper)) {
        return new DataModelHelper(dataModelJson);
    }
    this.idMap = {
        entityMap: {},
        foreignKeyMap: {}
    };
    this.lcaseEntityPropMap = {};

    dataModelJson.entities.forEach(function (entity) {
        var entityName = entity.name;
        var lcaseEntityName = entityName.toLowerCase();

        this.idMap.entityMap[entity._id] = {
            name: entityName,
            properties: {}
        };
        this.lcaseEntityPropMap[lcaseEntityName] = {
            _id: entity._id,
            name: entityName,
            properties: {},
            navEntities: []
        };

        var entityMap = this.idMap.entityMap[entity._id];
        var curLcaseEntityPropMap = this.lcaseEntityPropMap[lcaseEntityName];

        var props = curLcaseEntityPropMap.properties;
        entity.properties.forEach(function (prop) {
            entityMap.properties[prop._id] = prop;
            props[prop.name.toLowerCase()] = prop;
        }, this);

        this._processForeignKeyMap(entity);
    }, this);
}

DataModelHelper.prototype._processForeignKeyMap = function (entity) {

    if (!entity.navigationProperties) {
        return {};
    }
    var entityMap = this.idMap.entityMap[entity._id];
    var foreignKeyMap = this.idMap.foreignKeyMap;

    var navEntities = this.lcaseEntityPropMap[entity.name.toLowerCase()].navEntities;
    entity.navigationProperties.forEach(function (nav) {

        var selfNavigation = false;
        var fkId, pkEntity, pkKey, fkEntityId;
        fkId = pkEntity = pkKey = fkEntityId = null;

        navEntities.push(nav.toEntityId);
        if (entity._id === nav.toEntityId) {
            selfNavigation = true;
        }

        nav.referentialConstraints.forEach(function (refConstr) {
            var propRef = refConstr.propertyRef;
            if (selfNavigation || (nav.multiplicity === false)) {
                //Foreign key will be in the same entity
                var curEntityProp = entityMap.properties[propRef];
                if (curEntityProp && curEntityProp.isForeignKey) {
                    fkId = propRef;
                    fkEntityId = entity._id;
                }
                else {
                    pkEntity = refConstr.entityId;
                    pkKey = propRef;
                }
            }
            else {
                //Foreign key will be in target entity
                if (refConstr.entityId === entity._id) {
                    pkEntity = refConstr.entityId;
                    pkKey = propRef;
                }
                else {
                    fkId = propRef;
                    fkEntityId = refConstr.entityId;
                }
            }
        });
        if (!foreignKeyMap[fkEntityId]) {
            foreignKeyMap[fkEntityId] = {};
        }
        foreignKeyMap[fkEntityId][fkId] =
        {
            entityId: pkEntity,
            primaryKeyId: pkKey,
            relationName: nav.name,
            multiplicity: nav.multiplicity,
            selfNavigation: selfNavigation
        };
        return foreignKeyMap;
    });

};
DataModelHelper.prototype.getModelEntityNameMap = function (entityName) {
    return this.lcaseEntityPropMap[entityName.toLowerCase()];
};

DataModelHelper.prototype.getModelPropMeta = function (entityName, propertyName) {
    var entityMap = this.getModelEntityNameMap(entityName);
    if (!entityMap) {
        return null;
    }
    return entityMap.properties[propertyName.toLowerCase()];
};

DataModelHelper.prototype.getPrimaryKeyMetaData = function (foreignEntityId, foreignKeyId) {
    if (this.idMap.foreignKeyMap[foreignEntityId]) {
        return this.idMap.foreignKeyMap[foreignEntityId][foreignKeyId];
    }
    return null;
};

DataModelHelper.prototype.getEntityIdMap = function (entityId) {
    return this.idMap.entityMap[entityId];
};

DataModelHelper.prototype.getNavEntityInfo = function (entityName) {

    var entityMap = this.lcaseEntityPropMap[entityName.toLowerCase()];
    if (!entityMap) {
        throw 'Entity Not found: ' + entityName;
    }
    var navEntities = entityMap.navEntities;
    var out = [];
    navEntities.forEach(function (entityId) {
        var entityMap = this.idMap.entityMap[entityId];
        out.push({
            entityName: entityMap.name
        });
    }, this);
    return out;
};

module.exports = DataModelHelper;