var getPath = require('dotty').get;
var putPath = require('dotty').put;
var deepExtend = require('deep-extend');

var errors = require('./errors.js');

module.exports = ConfigWrapper;

function ConfigWrapper(configObject) {
    return {
        get: getKey,
        set: setKey
    };

    function getKey(keyPath) {
        if (!keyPath) {
            return configObject;
        }

        return getPath(configObject, keyPath);
    }

    function setKey(keyPath, value) {
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
