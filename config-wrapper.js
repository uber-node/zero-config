var getPath = require('dotty').get;
var putPath = require('dotty').put;
var deepExtend = require('deep-extend');

var errors = require('./errors.js');

var safeCloneInto = {value: null};
var safeCloneFrom = {value: null};

module.exports = ConfigWrapper;

function ConfigWrapper(configObject, loose) {
    var frozen = false;
    // default `loose` to true.
    loose = typeof loose === 'boolean' ? loose : true;

    return {
        get: configuredGet,
        set: setKey,
        freeze: freeze
    };

    function getKey(keyPath) {
        if (!keyPath) {
            return safe(configObject);
        }

        return safe(getPath(configObject, keyPath));
    }

    function configuredGet(keyPath) {
        if (!keyPath) {
            return getKey();
        }

        var value = getKey(keyPath);
        var strictMode = !loose;

        if (value === undefined && strictMode) {
            throw errors.NonexistantKeyPath(({
                keyPath: keyPath
            }));
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
        v = deepExtend({keyPath: v}, {keyPath: value});
        return putPath(configObject, keyPath, v.keyPath);
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

    function safe(value) {
        safeCloneInto.value = null;
        safeCloneFrom.value = value;
        return deepExtend(safeCloneInto, safeCloneFrom).value;
    }
}

function isValidKeyPath(keyPath) {
    return typeof keyPath === 'string' ||
        Array.isArray(keyPath);
}
