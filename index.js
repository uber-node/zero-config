var flatten = require('flatten-prototypes');
var configChain = require('config-chain');
var parseArgs = require('minimist');
var process = require('process');
var getPath = require('dotty').get;
var putPath = require('dotty').put;
var join = require('path').join;
var EventEmitter = require('events').EventEmitter;
var deepExtend = require('deep-extend');

var errors = require('./errors.js');
var readDatacenter = require('./read-datacenter.js');

module.exports = fetchConfigSync;

// given a shallow object where keys are key paths like:
// { 'foo.bar': 'baz', 'foo.baz': 'foo' }
// it returns a deep object with the key paths expanded like:
// { 'foo': { 'bar': 'baz', 'baz': 'foo' } }
function makeDeep(obj) {
    var deepObj = {};

    Object.keys(obj).forEach(function (key) {
        putPath(deepObj, key, obj[key]);
    });

    return deepObj;
}

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
    var cliArgs = parseArgs(opts.argv || process.argv.slice(2));
    var dc = null;
    var env = opts.env || process.env;
    var NODE_ENV = env.NODE_ENV;
    // hardcoded to read from `./config` by convention
    var configFolder = join(dirname, 'config');
    var blackList = opts.blackList || [];

    var datacenterTuple = readDatacenter(opts);

    if (datacenterTuple[0]) {
        // throw error async. this allows for breaking a 
        // circular dependency between config & logger.
        process.nextTick(function () {
            config.emit('error', datacenterTuple[0]);
        });
    } else {
        dc = datacenterTuple[1];
    }

    // blackList allows you to ensure certain keys from argv
    // do not get set on the config object
    blackList.forEach(function (key) {
        if (cliArgs[key]) {
            delete cliArgs[key];
        }
    });

    /* use config-chain module as it contains a set of 
        "transports" for loading configuration from disk
    */
    var configTree = configChain(
        // the seed option overwrites everything
        opts.seed || null,
        // include all CLI arguments
        makeDeep(cliArgs),
        // load file from --config someFilePath
        cliArgs.config || null,
        // get datacenter from opts.dc file
        dc ? dc : null,
        // load ./config/NODE_ENV.DATACENTER.json
        dc && NODE_ENV ?
            join(configFolder, NODE_ENV + '.' + dc.datacenter + '.json') :
            null,
        // load ./config/NODE_ENV.json
        NODE_ENV ? join(configFolder, NODE_ENV + '.json') : null,
        // load ./config/common.json
        join(configFolder, 'common.json')
    );

    // there is a "bug" in config-chain where it doesn't 
    // support deep extension. So we flatten deeply
    // https://github.com/dominictarr/config-chain/issues/14
    var configState = flatten(configTree.store);

    config.get = getKey;
    config.set = setKey;

    // deprecated: __state, __tree
    config.__state = configState;
    config.__tree = configTree;

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
