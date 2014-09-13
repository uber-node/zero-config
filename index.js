var process = require('process');
var getPath = require('dotty').get;
var putPath = require('dotty').put;
var EventEmitter = require('events').EventEmitter;
var deepExtend = require('deep-extend');

var errors = require('./errors.js');
var readDatacenter = require('./read-datacenter.js');
var getConfigState = require('./get-config-state.js');

module.exports = fetchConfigSync;


function fetchConfigSync(dirname, opts) {
    if (typeof dirname !== 'string' || dirname === '') {
        throw errors.InvalidDirname({
            dirname: dirname,
            strDirname: JSON.stringify(dirname)
        });
    }

    opts = opts || {};

    // config is EventEmitter purely for `.emit('error', err)`
    var config = new EventEmitter();

    var datacenterTuple = readDatacenter(opts);

    if (datacenterTuple[0]) {
        // throw error async. this allows for breaking a 
        // circular dependency between config & logger.
        process.nextTick(function () {
            config.emit('error', datacenterTuple[0]);
        });
    } else {
        opts.datacenterValue = datacenterTuple[1];
    }

    var configState = getConfigState(dirname, opts);

    config.get = getKey;
    config.set = setKey;

    // deprecated: __state, __tree
    config.__state = configState;

    return config;

    function getKey(keyPath) {
        if (!keyPath) {
            return configState;
        }

        return getPath(configState, keyPath);
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

        return putPath(configState, keyPath, v);
    }
}
