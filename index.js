var process = require('process');
var EventEmitter = require('events').EventEmitter;
var Result = require('raynos-rust-result');
var clone = require('clone');

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

    var result = readDatacenter(opts);

    if (Result.isErr(result)) {
        var err = Result.Err(result);
        // throw error async. this allows for breaking a
        // circular dependency between config & logger.
        process.nextTick(function () {
            config.emit('error', err);
        });
    } else {
        opts.datacenterValue = Result.Ok(result);
    }

    var configState = getConfigState(dirname, opts);
    var localConfigWrapper = ConfigWrapper(configState, opts.loose);
    var remoteConfigWrapper = ConfigWrapper({}, opts.loose);

    config.get = localConfigWrapper.get;
    config.set = localConfigWrapper.set;
    config.freeze = localConfigWrapper.freeze;
    config.clone = function(){
        return ConfigWrapper(clone(configState));
    };
    config.getRemote = remoteConfigWrapper.get;
    config.setRemote = remoteConfigWrapper.set;

    return config;
}
