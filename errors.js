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

module.exports = {
    InvalidDirname: InvalidDirname,
    MissingDatacenter: MissingDatacenter,
    DatacenterRequired: DatacenterRequired,
    DatacenterFileRequired: DatacenterFileRequired,
    InvalidKeyPath: InvalidKeyPath
};
