var process = require('process');
var EventEmitter = require('events').EventEmitter;

var errors = require('./errors.js');
var readDatacenter = require('./read-datacenter.js');
var getConfigState = require('./get-config-state.js');
var ConfigWrapper = require('./config-wrapper.js');

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
    var localConfigWrapper = ConfigWrapper(configState);
    var remoteConfigWrapper = ConfigWrapper({});

    config.get = localConfigWrapper.get;
    config.set = localConfigWrapper.set;
    config.freeze = localConfigWrapper.freeze;
    config.getRemote = remoteConfigWrapper.get;
    config.setRemote = remoteConfigWrapper.set;

    return config;
}

