var TypedError = require('error/typed');

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
    message: 'expected `opts.dcValue` to be passed to fetchConfig.\n' +
        'must call `fetchConfig(__dirname, { dcValue: "..." }).\n' +
        'instead I got opts: {strOpts}.\n' +
        '`opts.dcValue` is not optional when NODE_ENV is "production".\n' +
        'SUGGESTED FIX: update the `fetchConfig()` callsite.\n'
});

var NonexistantKeyPath = TypedError({
    type: 'nonexistant.key.path',
    message: 'attempting to get a nonexistant keyPath.\n' +
        'Expected the key: {keyPath} to be found.\n' +
        'SUGGESTED FIX: add {keyPath} and value to config'
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

var InvalidMultiSetArgument = TypedError({
    type: 'invalid.multi.set',
    message: 'Invalid `config.set(obj)` argument.\n' +
        'expected an object but instead got {objStr}.\n' +
        'SUGGESTED FIX: update the `config.set()` callsite to ' +
            'be a valid object.\n',
    objStr: null,
    obj: null
});

var SetFrozenObject = TypedError({
    type: 'set.frozen.object',
    message: 'Cannot `config.set(key, value)`. Config is ' +
        'frozen.\n' +
        'expected `config.set()` not to be called. Instead ' +
        'it was called with {keyPath} and {valueStr}.\n' +
        'SUGGESTED FIX: Do not call `config.set()` it was ' +
        'frozen by someone else.\n',
    keyPath: null,
    valueStr: null,
    value: null
});

module.exports = {
    InvalidDirname: InvalidDirname,
    MissingDatacenter: MissingDatacenter,
    DatacenterRequired: DatacenterRequired,
    DatacenterFileRequired: DatacenterFileRequired,
    InvalidKeyPath: InvalidKeyPath,
    NonexistantKeyPath: NonexistantKeyPath,
    InvalidMultiSetArgument: InvalidMultiSetArgument,
    SetFrozenObject: SetFrozenObject
};
