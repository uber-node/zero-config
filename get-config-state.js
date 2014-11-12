var flatten = require('flatten-prototypes');
var configChain = require('config-chain');
var parseArgs = require('minimist');
var join = require('path').join;
var putPath = require('dotty').put;
var traverse = require('traverse');

module.exports = getConfigState;

function getConfigState(dirname, opts) {
    var cliArgs = parseArgs(opts.argv || process.argv.slice(2));
    var env = opts.env || process.env;
    var NODE_ENV = env.NODE_ENV;
    var dc = opts.datacenterValue;
    var blackList = opts.blackList || ['_'];
    var replacements = opts.replacements;

    // hardcoded to read from `./config` by convention
    var configFolder = join(dirname, 'config');

    // blackList allows you to ensure certain keys from argv
    // do not get set on the config object
    blackList.forEach(function (key) {
        if (cliArgs[key]) {
            delete cliArgs[key];
        }
    });

    // Where is our environment specifiv config file?
    var envConfigFile = NODE_ENV ? join(configFolder, NODE_ENV + '.json') : null;

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
        // load ./config/NODE_ENV.json if we don't need any replacements.
        replacements ? null : envConfigFile,
        // load ./config/common.json
        join(configFolder, 'common.json'),
        // load defaults
        opts.defaults || null
    );

    if(replacements){
        var envConfig = configChain.json(envConfigFile);
        var configWithReplacements = runReplacements(envConfig, replacements);
        configTree.add(configWithReplacements);
    }
    // there is a "bug" in config-chain where it doesn't 
    // support deep extension. So we flatten deeply
    // https://github.com/dominictarr/config-chain/issues/14
    var configState = flatten(configTree.store);

    return configState;
}

/**
 * Run replacements on the configuration object
 * Traverse the object. For each node which is a string,
 * iterate over each replacement and run against that string.
 * @param  {Object} configObject The configuration object
 * @param  {Array} replacements The array of replacements of form [{ from: 'foo', to: 'bar'}]
 * @return {Object} The new object after all replacements
 */
function runReplacements(configObject, replacements){
    if(!Array.isArray(replacements)){
        throw new Error('Invalid replacements configuration');
    }
    var newObj = traverse(configObject).map(function(node){
        if(typeof node !== 'string'){
            return;
        }
        var self = this;
        replacements.forEach(function(replacement){
            if(!replacement.from || !replacement.to){
                throw new Error('Invalid replacements configuration');
            }
            self.update(self.node.replace(replacement.from, replacement.to));
        });
    });
    return newObj;
}

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
