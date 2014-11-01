var fs = require('fs');
var Result = require('raynos-rust-result');

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

    var result;

    // specifying a datacenter is optional in dev but required
    // in production.
    if (opts.dc) {
        var fileResult = readFileOrError(opts.dc);
        if (Result.isErr(fileResult)) {
            var err = Result.Err(fileResult);
            // create error synchronously for correct stack trace
            if (NODE_ENV === 'production') {
                result = Result.Err(errors.DatacenterFileRequired({
                    path: err.path,
                    errno: err.errno,
                    code: err.code,
                    syscall: err.syscall
                }));
            } else {
                result = Result.Err(errors.MissingDatacenter({
                    path: err.path,
                    errno: err.errno,
                    code: err.code,
                    syscall: err.syscall
                }));
            }
        } else {
            result = Result.Ok({
                'datacenter': Result.Ok(fileResult)
                    .replace(/\s/g, '')
            });
        }
    } else {
        result = Result.Ok(null);
    }

    return result;
}

// break try catch into small function to avoid v8 de-optimization
function readFileOrError(uri) {
    var content;
    try {
        content = fs.readFileSync(uri, 'utf8');
    } catch (err) {
        return Result.Err(err);
    }

    return Result.Ok(content);
}
