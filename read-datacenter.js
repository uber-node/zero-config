var fs = require('fs');

var errors = require('./errors.js');

module.exports = readDatacenter;

function readDatacenter(opts) {
    var env = opts.env || process.env;
    var NODE_ENV = env.NODE_ENV;

    if (NODE_ENV === 'production' && !opts.dc) {
        throw errors.DatacenterRequired({
            strOpts: JSON.stringify(opts)
        });
    }

    var result, error = null;

    // specifying a datacenter is optional in dev but required
    // in production.
    if (opts.dc) {
        var tuple = readFileOrError(opts.dc);
        if (tuple[0]) {
            var err = tuple[0];
            // create error synchronously for correct stack trace
            if (NODE_ENV === 'production') {
                error = errors.DatacenterFileRequired({
                    path: err.path,
                    errno: err.errno,
                    code: err.code,
                    syscall: err.syscall
                });
            } else {
                error = errors.MissingDatacenter({
                    path: err.path,
                    errno: err.errno,
                    code: err.code,
                    syscall: err.syscall
                });
            }
        } else {
            result = {
                'datacenter': tuple[1].replace(/\s/g, '')
            };
        }
    } else {
        result = null;
    }

    return [error, result];
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
