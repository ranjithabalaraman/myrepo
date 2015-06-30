'use strict';

var sax = require('norman-server-tp').sax;
var BindingParser = require('./binding/BindingParser.js');
var _ = require('norman-server-tp')['lodash-node'];
var defaultAggregations = {
    'sap.ui.core.View': 'content',
    'sap.ca.ui.Notes': 'items',
    'sap.m.List': 'items',
    'sap.ui.layout.Grid': 'content',
    'sap.m.Select': 'items',
    'sap.ui.layout.VerticalLayout': 'content',
    'sap.m.Toolbar': 'content',
    'sap.ui.layout.form.FormElement': 'fields',
    'sap.m.ObjectHeader': 'attributes',
    'sap.m.Page': 'content',
    'sap.m.Column': 'header',
    'sap.ui.layout.HorizontalLayout': 'content',
    'sap.m.IconTabFilter': 'content',
    'sap.ca.ui.GrowingTileContainer': 'content',
    'sap.m.Panel': 'content',
    'sap.ui.layout.form.SimpleForm': 'content',
    'sap.m.ObjectListItem': 'attributes',
    'sap.m.HBox': 'items',
    'sap.m.VBox': 'items',
    'sap.m.FlexBox': 'items',
    'sap.ui.layout.ResponsiveFlowLayout': 'content',
    'sap.m.Table': 'items',
    'sap.m.SegmentedButton': 'buttons',
    'sap.uxap.ObjectPageLayout': 'content',
    'sap.uxap.ObjectPageHeader': 'content'

};

function getDefaultAggregationName(control) {
    var defaultAggregationName = defaultAggregations[control.controlName] || 'defaultAggregation';
    if (defaultAggregationName === 'defaultAggregation') {
        console.warn('no default aggregation for control ' + control.controlName);
    }
    return defaultAggregationName;
}

function parseBinding(bindingString) {

    var bindingJSON;
    bindingJSON = BindingParser.complexParser(bindingString);

    if (bindingJSON.parts) {
        var hasUIModel = _.find(bindingJSON.parts, function (part) {
            return part.model === 'ui';
        });
        if (hasUIModel) {
            return null;
        }
        else {
            return bindingJSON;
        }
    }
    else {
        if (!bindingJSON.model) {
            var path = bindingJSON.path;
            var pathSplit = path.split('>');
            delete bindingJSON.path;
            bindingJSON.model = pathSplit[0];
            bindingJSON.path = pathSplit[1];
        }
        if (bindingJSON.model === 'ui') {
            return null;
        }
        return bindingJSON;
    }
}

function initParser(name, parser, isStream, fnSuccess, fnError, options) {

    var pageModel = {name: name, controls: []};
    var namespaceAliases = {};
    var nameCounter = {};
    var stack = [];
    var controlCount = 0;

    var fnOnError = function (e) {
        // unhandled errors will throw, since this is a proper node
        // event emitter.
        console.error('error!', e);
        // clear the error
        parser.error = null;
        parser.resume();
        fnError(e); // TODO: better handle error
    };
    var fnParsetemplate = function (templateName, templateProperties, parsedObject) {
        if (!(templateProperties && templateProperties['build:metadata'] && templateProperties['build:metadata'] === '#ignore')) {
            switch (templateName) {
                case 'with':
                    var templateVar = '';
                    if (templateProperties.var) {
                        if (!parsedObject.var) {
                            parsedObject.var = {};
                        }
                        templateVar = templateProperties.helper ? templateProperties.helper + '(' + templateProperties.path + ')' : templateProperties.path;
                        parsedObject.var[templateProperties.var] = templateVar;
                    }
                    break;
                case 'repeat':
                    if (templateProperties.var) {
                        if (!parsedObject.var) {
                            parsedObject.var = {};
                        }
                        parsedObject.var[templateProperties.var] = 'repeat';
                    }
                    parsedObject.repeat = templateProperties.list.model ? templateProperties.list.model + '>' + templateProperties.list.path : templateProperties.list.path;
                    //TODO : manage the filter here
                    break;
                case 'if':
                    if (!parsedObject.conditions) {
                        parsedObject.conditions = [];
                    }
                    parsedObject.conditions.push({type: templateName, test: templateProperties.test});
                    break;
                case 'then':
                case 'else':
                    if (!parsedObject.conditions) {
                        parsedObject.conditions = [];
                    }
                    parsedObject.conditions.push({type: templateName});
                    break;
            }
        }

    };

    var fnAddControl = function (control, context) {
        if (!context) {
            pageModel.controls.push(control);
        }
        else if (context.aggregationName) {
            var controlToPush = {};
            controlToPush.targetAggregation = context.aggregationName;
            if (context.template) {
                controlToPush.template = _.clone(context.template, true);
            }
            _.each(control, function (controlPropValue, controlPropName) {
                controlToPush[controlPropName] = controlPropValue;
            });
            control = controlToPush;
            if (context.control.children == null) {
                context.control.children = [];
            }
            context.control.children.push(controlToPush);
        } else if (context.control) {
            // control inside a control -> default aggregation
            // find default aggregation
            var aggregationName = getDefaultAggregationName(context.control);
            if (context.aggregationName != null) {
                aggregationName = context.aggregationName;
            }

            controlToPush = {};
            controlToPush.targetAggregation = aggregationName;
            if (context.template) {
                controlToPush.template = _.clone(context.template, true);
            }
            _.each(control, function (controlPropValue, controlPropName) {
                controlToPush[controlPropName] = controlPropValue;
            });
            control = controlToPush;
            if (context.control.children == null) {
                context.control.children = [];
            }
            context.control.children.push(controlToPush);
        }
        // Add control in the stack of ancestor nodes
        stack.push({control: control});
    };

    var fnOpenTag = function (node) {
        var context, fullName, lastDotPos, firstControlCharPos,
            control, namespaceAlias, namespace, attributeValue, controlId,
            split, attribute, bIgnore, properties, metadata, parsedAttribute,
            splitMeta, meta, splitSubMeta, patternParent, patternName;
        if (!stack.length) {
            for (attribute in node.attributes) {
                if (attribute.indexOf('xmlns') === 0) {
                    namespaceAliases[attribute] = node.attributes[attribute];
                }
            }
        } else {
            context = stack[stack.length - 1];
        }

        // -> must create a control or an aggregation of the current control
        if (node.name.indexOf(':') > 0) {
            split = node.name.split(':');
            namespaceAlias = 'xmlns:' + split[0];
            name = split[1];
        } else {
            name = node.name;
            namespaceAlias = 'xmlns';
        }
        namespace = namespaceAliases[namespaceAlias];
        fullName = namespace + '.' + name;
        lastDotPos = fullName.lastIndexOf('.');
        firstControlCharPos = 0;
        if (lastDotPos > -1) {
            firstControlCharPos = lastDotPos + 1;
        }

        //we want to keep nested fragments
        if (fullName === 'sap.ui.core.Fragment') {
            control = {
                controlName: fullName,
                properties: {}
            };
            for (attribute in node.attributes) {
                attributeValue = node.attributes[attribute];
                if (attributeValue.indexOf('#ignore') > -1) {
                    bIgnore = true;
                }
                else {
                    control.properties[attribute] = attributeValue;
                }
            }
            //check that there is no #ignore and we add the fragment even though it is not a bound control
            if (!bIgnore) {
                fnAddControl(control, context);
            }

        }
        else if (fullName[firstControlCharPos] === fullName[firstControlCharPos].toUpperCase() || namespace === 'http://www.w3.org/1999/xhtml') {
            // Control
            controlCount++;
            controlId = null;
            properties = null;
            metadata = null;

            // -> must put attributes in binding
            for (attribute in node.attributes) {
                if (attribute === 'id') {
                    controlId = node.attributes[attribute];
                }
                else if (attribute.indexOf('xmlns') === -1) {
                    attributeValue = node.attributes[attribute];
                    if (attributeValue.indexOf('{{') === 0) {
                        attributeValue = '';
                    }
                    else {
                        attributeValue = attributeValue.replace(/\r?\n|\r|\t/g, '');
                    }
                    if (attributeValue.indexOf('{') === 0) {

                        parsedAttribute = parseBinding(attributeValue);
                        if (parsedAttribute) {
                            if (properties == null) {
                                properties = {};
                            }
                            properties[attribute] = parsedAttribute;
                        }

                    }
                    else if (attributeValue.indexOf('#') === 0) {
                        splitMeta = attributeValue.slice(1).split(';');
                        meta = {};
                        _.each(splitMeta, function (subMeta) {
                            splitSubMeta = subMeta.split(':');
                            switch (splitSubMeta[0]) {
                                case 'pattern':
                                    patternParent = splitSubMeta[1].split('>>');
                                    if (patternParent.length > 1) {
                                        patternName = patternParent[1].split('>');
                                        meta.forceParent = patternParent[0];
                                    }
                                    else {
                                        patternName = splitSubMeta[1].split('>');
                                    }
                                    meta.type = patternName[1] || patternName[0];
                                    meta.inherit = patternName[0];
                                    break;
                                case 'prop':
                                    if (!meta.properties) {
                                        meta.properties = {};
                                    }
                                    meta.properties[splitSubMeta[1]] = splitSubMeta[2];
                                    //case if this is a virtual property created by the metadata
                                    if (splitSubMeta.length > 3) {
                                        //get any complex binding we get any text part that is inside brackets :{ }
                                        var bindingString = subMeta.substring(splitSubMeta[0].length + splitSubMeta[1].length + splitSubMeta[2].length);
                                        bindingString = '{' + bindingString.match(/\{([^)]+)\}/)[1] + '}';
                                        parsedAttribute = parseBinding(bindingString);
                                        if (parsedAttribute) {
                                            if (properties == null) {
                                                properties = {};
                                            }
                                            properties[splitSubMeta[1]] = parsedAttribute;
                                        }
                                    }
                                    break;
                                case 'bindingContext':
                                    if (splitSubMeta.length > 3) {
                                        //get any complex binding we get any text part that is inside brackets :{ }
                                        var bindingString = subMeta.substring(splitSubMeta[0].length + splitSubMeta[1].length + splitSubMeta[2].length);
                                        bindingString = '{' + bindingString.match(/\{([^)]+)\}/)[1] + '}';
                                        parsedAttribute = parseBinding(bindingString);
                                        meta.bindingContext = {
                                            name: splitSubMeta[2],
                                            target: splitSubMeta[1],
                                            value: parsedAttribute
                                        };
                                    }
                                    break;
                                case 'isAbstract':
                                    meta.isAbstract = true;
                                    break;
                                case 'condition':
                                    meta.condition = {target: splitSubMeta[1], value: splitSubMeta[2]};
                                    break;

                            }
                        });
                        metadata = meta;
                    }

                }

            }

            if (controlId == null) {
                if (nameCounter[name] == null) {
                    nameCounter[name] = 0;
                }
                controlId = name + '_' + nameCounter[name]++;
            }

            control = {
                controlName: fullName
            };
            //this
            if (properties != null) {
                control.properties = properties;
            }
            if (metadata != null) {
                control.metadata = metadata;
            }
            fnAddControl(control, context);

        }
        else if (namespace === 'http://schemas.sap.com/sapui5/extension/sap.ui.core.template/1') {
            controlId = null;
            properties = null;

            // -> must put attributes in binding
            for (attribute in node.attributes) {
                if (attribute === 'id') {
                    controlId = node.attributes[attribute];
                }
                else if (attribute.indexOf('xmlns') === -1) {
                    attributeValue = node.attributes[attribute];

                    if (attributeValue.indexOf('{{') === 0) {

                        attributeValue = '';
                    }
                    else {
                        attributeValue = attributeValue.replace(/\r?\n|\r|\t/g, '');
                    }
                    if (properties == null) {
                        properties = {};
                    }
                    if (attributeValue[0] === '{' && name !== 'if') {
                        //we do a special parsng for the if later on because parseBinding doesn't work well
                        properties[attribute] = parseBinding(attributeValue);
                    }
                    else {
                        properties[attribute] = attributeValue;
                    }

                }
            }
            var stackStuff = {aggregationName: context.aggregationName, control: context.control};
            var templateStuff = _.clone(context.template) || {};
            fnParsetemplate(name, properties, templateStuff);
            stackStuff.template = templateStuff;
            stack.push(stackStuff);
        }
        else {
            // aggregation
            // Get current control in stack
            var aggregationName;
            if (node.name.indexOf(':') > 0) {
                split = node.name.split(':');
                aggregationName = split[1];
                // TODO: keep the namespace of the aggregation ?
            } else {
                aggregationName = node.name;
            }

            stack.push({aggregationName: aggregationName, control: context.control});
        }
    };

    //if an expression is based only on a single path we consider the property as this path
    var fnSimplifyExpression = function (propertyValue) {
        var parts = [];
        _.each(propertyValue.parts, function (part) {
            var path = part.model ? part.model + '>' + part.path : part.path;
            parts.push(path);
        });
        parts = _.uniq(parts);
        if (parts.length === 1) {
            if (parts[0].split('>').length === 2) {
                propertyValue = {model: parts[0].split('>')[0], path: parts[0].split('>')[1]};
            }
            else {
                propertyValue = {path: parts[0]};
            }
        }
        return propertyValue;

    };

    var fnCloseTag = function () {
        if (stack.length) {
            var context = stack[stack.length - 1];
            if (context && context.control && context.control.children && context.control.children.length) {
                // Move the binding of the aggregations from the properties to the aggregation binding
                var control = context.control;
                var aggregationsMap = {}, bindingsWithoutAggregation = null;
                control.children.forEach(function (aggregation) {
                    aggregationsMap[aggregation.targetAggregation] = aggregation;
                });
                _.each(control.properties, function (propertyValue, propertyName) {
                    //simplify expression
                    if (propertyValue.expression) {
                        propertyValue = fnSimplifyExpression(propertyValue);
                    }
                    var aggregation = aggregationsMap[propertyName];
                    if (aggregation) {
                        aggregation.binding = propertyName;
                    } else {
                        if (bindingsWithoutAggregation == null) {
                            bindingsWithoutAggregation = {};
                        }
                        bindingsWithoutAggregation[propertyName] = propertyValue;

                    }
                });
                if (bindingsWithoutAggregation != null) {
                    control.properties = bindingsWithoutAggregation;
                }

            }
        }
        stack.pop();
    };

    var fnEnd = function () {
        fnSuccess(pageModel);
    };

    if (isStream) {
        parser.on('error', fnOnError);
        parser.on('opentag', fnOpenTag);
        parser.on('closetag', fnCloseTag);
        parser.on('end', fnEnd);
    } else {
        parser.onerror = fnOnError;
        parser.onopentag = fnOpenTag;
        parser.onclosetag = fnCloseTag;
        parser.onend = fnEnd;
    }
}


exports.parseView = function (name, viewContent, fnSuccess, fnError, options) {
    var parser = sax.parser(true);
    initParser(name, parser, false, fnSuccess, fnError, options);
    parser.write(viewContent).close();
};
