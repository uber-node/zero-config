var getPath = require('dotty').get;
var putPath = require('dotty').put;
var deepExtend = require('deep-extend');

var errors = require('./errors.js');

module.exports = ConfigWrapper;

function ConfigWrapper(configObject) {
    var frozen = false;

    return {
        get: configuredGet,
        set: setKey,
        freeze: freeze
    };

    function getKey(keyPath) {
        if (!keyPath) {
            return configObject;
        }

        return getPath(configObject, keyPath);
    }

    function configuredGet(keyPath){
        if (!keyPath){
            return getKey();
        }

        var value = getKey(keyPath);
        var strictMode = !getKey('loose');

        if (value === undefined && strictMode) {
            throw errors.NonexistantKeyPath();
        }

        return value;
    }

    function setKey(keyPath, value) {
        if (frozen) {
            throw errors.SetFrozenObject({
                keyPath: keyPath,
                valueStr: JSON.stringify(value),
                value: value
            });
        }

        if (arguments.length === 1) {
            return multiSet(keyPath);
        }

        if (!isValidKeyPath(keyPath)) {
            throw errors.InvalidKeyPath({
                keyPath: keyPath
            });
        }

        var v = getKey(keyPath);

        if (typeof v === 'object' && v !== null) {
            v = deepExtend({}, v, value);
        } else {
            v = value;
        }

        return putPath(configObject, keyPath, v);
    }

    function freeze() {
        frozen = true;
    }

    function multiSet(obj) {
        if (obj === null || typeof obj !== 'object') {
            throw errors.InvalidMultiSetArgument({
                objStr: JSON.stringify(obj),
                obj: obj
            });
        }

        Object.keys(obj).forEach(setEachKey);

        function setEachKey(key) {
            setKey([key], obj[key]);
        }
    }
}

function isValidKeyPath(keyPath) {
    return typeof keyPath === 'string' ||
        Array.isArray(keyPath);
}
