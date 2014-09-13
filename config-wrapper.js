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
        if (typeof keyPath !== 'string' && !Array.isArray(keyPath)) {
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
}
