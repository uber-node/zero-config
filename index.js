var flatten = require('flatten-prototypes');
var configChain = require('config-chain');
var parseArgs = require('minimist');
var process = require('process');
var getPath = require('dotty').get;
var putPath = require('dotty').put;
var join = require('path').join;
var fs = require('fs');
var EventEmitter = require('events').EventEmitter;
var TypedError = require('error/typed');
var deepExtend = require('deep-extend');

var InvalidDirname = TypedError({
    type: 'missing.dirname.argument',
    message: 'invalid __dirname argument.\n' +
        'Must call fetchConfig(__dirname).\n' +
        '__dirname should be a string and is non-optional.\n' +
        'instead I got {strDirname}.\n' +
        'SUGGESTED FIX: update the `fetchConfig()` callsite.\n'
});

var MissingDatacenter = TypedError({
    type: 'missing.datacenter.file',
    warning: true,
    message: 'no such file or directory \'{path}\'.\n' +
        'expected to find datacenter configuration at {path}.\n'
});

var DatacenterRequired = TypedError({
    type: 'datacenter.option.required',
    message: 'expected `opts.dc` to be passed to fetchConfig.\n' +
        'must call `fetchConfig(__dirname, { dc: "..." }).\n' +
        'instead I got opts: {strOpts}.\n' +
        '`opts.dc` is not optional when NODE_ENV is "production".\n' +
        'SUGGESTED FIX: update the `fetchConfig()` callsite.\n'
});

var DatacenterFileRequired = TypedError({
    type: 'datacenter.file.required',
    message: 'no such file or directory \'{path}\'.\n' + 
        'expected to find datacenter configuration at {path}.\n' +
        'when NODE_ENV is "production" the datacenter file must exist.\n' +
        'SUGGESTED FIX: configure your system so it has a datacenter file.\n'
});

var InvalidKeyPath = TypedError({
    type: 'invalid.keypath',
    message: 'specified an invalid keypath to `config.set()`.\n' +
        'expected a string but instead got {keyPath}.\n' +
        'SUGGESTED FIX: update the `config.set()` callsite.\n'
});

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

// break try catch into small function to avoid v8 de-optimization
function readFileOrError(uri) {
    var content;
    try {
        content = fs.readFileSync(uri, 'utf8');
    } catch (err) {
        return [err, null];
    }

    return [null, content];
}

function fetchConfigSync(dirname, opts) {
    if (typeof dirname !== 'string' || dirname === '') {
        throw InvalidDirname({
            dirname: dirname,
            strDirname: JSON.stringify(dirname)
        });
    }

    opts = opts || {};
    // config is EventEmitter purely for `.emit('error', err)`
    var config = new EventEmitter();
    var cliArgs = parseArgs(opts.argv || process.argv.slice(2));
    var dc = null;
    // hardcoded to read from `./config` by convention
    var configFolder = join(dirname, 'config');
    var env = opts.env || process.env;
    var NODE_ENV = env.NODE_ENV;
    var blackList = opts.blackList || [];

    // specifying a datacenter is optional in dev but required
    // in production.
    if (opts.dc) {
        var tuple = readFileOrError(opts.dc);
        if (tuple[0]) {
            var err = tuple[0];
            // create error synchronously for correct stack trace
            var error;
            if (NODE_ENV === 'production') {
                error = DatacenterFileRequired({
                    path: err.path,
                    errno: err.errno,
                    code: err.code,
                    syscall: err.syscall
                });
            } else {
                error = MissingDatacenter({
                    path: err.path,
                    errno: err.errno,
                    code: err.code,
                    syscall: err.syscall
                });
            }

            // throw error async. this allows for breaking a 
            // circular dependency between config & logger.
            process.nextTick(function () {
                config.emit('error', error);
            });
        } else {
            dc = { 'datacenter': tuple[1].replace(/\s/g, '') };
        }
    }

    if (NODE_ENV === 'production' && !opts.dc) {
        throw DatacenterRequired({
            strOpts: JSON.stringify(opts)
        });
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
            throw InvalidKeyPath({
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
