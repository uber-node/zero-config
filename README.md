# zero-config

[![build status][build-png]][build]
[![Coverage Status][cover-png]][cover]
[![Davis Dependency status][dep-png]][dep]

<!-- [![NPM][npm-png]][npm] -->

<!-- [![browser support][test-png]][test] -->

A zero configuration configuration loader

## Example

```js
// config/common.json
{
    "port": 9001
}
```

```js
// config/production.json
{
    "redis": {
        "host": "localhost",
        "port": 6379
    }
}
```

```js
// server.js
var fs = require('fs')
var fetchConfig = require('zero-config')

var config = fetchConfig(__dirname, {
    dcValue: fs.existsSync('/etc/zero-config/datacenter') ?
        fs.readFileSync('/etc/zero-config/datacenter', 'utf8') :
        null
})

var port = config.get("port")
var redisConf = config.get("redis")
var redisPort = config.get("redis.port")
```

You can also call the process with
    `node server.js --port 10253` to change the config 
    information from the command line

## Docs

### `var config = fetchConfig(dirname, opts)`

```ocaml
type Keypath : String | Array<String>

type Config : {
    get: (keypath?: Keypath) => Any,
    set: ((keypath: Keypath, value: Any) => void) &
        (value: Any) => void,
    freeze: () => void,
    clone: () => Config
    getRemote: (keypath?: Keypath) => Any,
    setRemote: ((keypath: Keypath, value: Any) => void) &
        (value: Any) => void
}

zero-config := (dirname: String, opts?: {
    argv?: Array<String>,
    dcValue?: String,
    blackList?: Array<String>,
    env?: Object<String, String>,
    isStaging?: Boolean,
    seed?: Object<String, Any>,
    defaults?: Object<String, Any>
}) => Config
```

`fetchConfig` takes the current __dirname as an argument, it 
  assumes that there exists a config folder at `./config` in 
  your project and it assumes there exists a `common.json` and a
  `NODE_ENV.json` for each environment.

It returns you a `config` object with a `get(keypath)` method
  to fetch properties out of config. `get()` takes a keypath,
  i.e. `"prop.nested.someKey"`to get direct or nested properties
  in the config object.

It's recommended you use `.get()` as in the future we will 
  enable dynamic config properties through flipr support.


### The config lookup algorithm

The `fetchConfig()` function tries to fetch config from multiple
  locations and then deep merges the objects it finds together
  into a single object.

Below are the sources it reads in order of least precendence.
  i.e. the later sources in the list overwrite the earlier ones

- a defaults object that populates values that have 
    not been set by any other means.
 - a `config/common.json` JSON file in your project
 - a `config/NODE_ENV.json` JSON file in your project
 - a `config/secrets/secrets-NODE_ENV.json` JSON file in your
 project containing secrets per NODE_ENV but not production
 - a `config/secrets/secrets.json` JSON file in your project
 containing secrets (API keys, OAuth tokens, etc) only for production
 - a `config/NODE_ENV.{datacenter}.json` JSON file in your
    project if you specificed a datacenter.
 - a `config/staging.json` JSON file in your project if isStaging
    option is true
 - a `config/staging.{datacenter}.json` JSON file in your project
    if isStaging option is true and you specificed a datacenter.
 - a `{ datacenter: '{datacenter}' }` literal if you 
    specified a datacenter.
 - a `--config=/var/config/some-file.json` JSON file if you
    passed a command line argument called `--config` to the
    process.
 - a object literal based on command line arguments. i.e. if 
    you pass `--foo='bar' --bar.baz='bob'` you will get
    `{ "foo": "bar", "bar": { "baz": "bob" } }`
 - a seed object of manual overwrites for testing purposes.

The config loader also uses `config-chain` for the actual
  loading logic so you can read [their docs][config-chain]

#### `dirname`

`dirname` is the directory that is the parent of the `config`
  directly. If you call `fetchConfig` in a file located in the 
  root directory you can just pass `__dirname` as config lives
  at `./config`.

If you require `fetchConfig` anywhere else like `./api/server.js`
  you will have to pass `path.join(__dirname, '..')`

#### `opts`

`opts` is an optional object, that contains the following
  properties.

**Note** that `opts` is only optional in environments other then
  `"production`". If your `process.env.NODE_ENV` is set to
  `"production"` then you **MUST** specifiy `opts` and specify
  the `opts.dcValue` parameter.

Running a production service without knowing how to load 
  datacenter specific configuration is a bug.

#### `opts.dcValue`

`opts.dcValue` is either `null` or a datacenter name.

Say you have two datacenters, EC2-west and EC2-east. It's 
  recommended that you have a file called `/etc/datacenter`
  that contains either the string `EC2-west` or `EC2-east`.

This way any service can know what datacenter it is running
  in with a simple `cat /etc/datacenter`.

You can then call `fetchConfig(...)` with the datacenter value
  by calling `fs.readFileSync('/etc/datacenter')`

Note that if you pass the dc config to `fetchConfig` then the
  config object will contain the `"datacenter"` key whose value
  is either `EC2-west` or `EC2-east` or whatever your datacenter
  names are.

We will also load the file `config/production.EC2-west.json`
  and merge that into the config tree.

#### `opts.argv`

`opts.argv` is optional and probably not needed

`fetchConfig` will read your process argv information using
  the [`minimist`][minimist] module.

If you do not want `fetchConfig` to read global argv for you,
  you can pass in an `argv` object with keys like `'foo'` and
  `'bar.baz''` and values that are strings / numbers / booleans

#### `opts.isStaging`

`opts.isStaging` is an optional boolean value to indicate it is
a staging deployment, if set true.

`fetchConfig` will read `staging.json` for a staging deployment,
 followed by `staging.{datacenter}.json` if datacenter is specified.

#### `opts.blackList`

`opts.blackList` is an optional array of argv keys to blacklist.

`fetchConfig` by default converts all command line arguments to
  configuration keys. If you want to pass a non config key 
  command line argument like `--debug` or `--restart-fast`, etc.
  then you might want to add them to the `blackList`

If your `opts.blackList` is `['debug']` then `config.get('debug')`
  will not resolve to the `--debug` command line argument.

#### `opts.env`

`opts.env` is optional and probably not needed.

`fetchConfig` will read the env using `process.env`. The only
  property it reads is an environment variable called `NODE_ENV`.

If you prefer to not have this variable configured through
  the environment or want to call it something else then you
  can pass in `{ NODE_ENV: whatever }` as `opts.env`

#### `opts.loose`

should a value be requested from the config using get() and the
  key does not exist an error will be thrown. By setting
  `opts.loose` to `true` this feature is disabled and a value of
  undefined is returned should this key not be preset in the
  config.

#### `opts.seed`

`opts.seed` is optional, it can be set to an object

If it exists we will merge the seed object into the config
  data we have fetched. seed overwrites all the other sources
  of configuration.

The `seed` option is very useful for testing purposes, it allows
  you to overwrite the configuration that your application would
  load with test specific properties.

This is an alternative to the `NODE_ENV=test `pattern, we highly
  recommend that you do not have a `test.json` file at all.

#### `opts.defaults`

`opts.defaults` is optional, it can be set to an object.

If it exists, it will populate all the values that are unset 
  (but not undefined) in the loaded config with those in 
  `opts.defaults`.

The difference between `defaults` and `seed` is that `seed` over-
  writes set values, while `defaults` does not.

#### `var value = config.get(keypath)`

`config.get(keypath)` will return the value at a keypath. The 
  `keypath` must be a string.

You can call `config.get('port')` to get the port value. You
  can call `config.get('playdoh-logger.kafka.port')` to get
  the nested kafka port config option.

#### `config.set(keypath, value)`

`config.set(keypath, value)` will set a value at the keypath.

You can call `config.set("port", 9001)` to set the port value.
  You can call `config.set("playdoh-logger.kafka.port", 9001)` to
  set then nested kafka port config option.

Note you can also call `config.set(entireObject)` to merge an
  entire object into the `config` instance. This will use 
  deep extend to set all the key / value pairs in `entireObject`
  onto the config instance.

#### `config.freeze()`

Since the `config` object is supposed to represent a set of
  static, immutable configuration that's loaded at process
  startup time it would be useful to enforce this.

Once you are ready to stop mutating `config` you can call
  `.freeze()`. Any future calls to `.set()` will throw a 
  config frozen exception.

Note that you can always call `config.setRemote()` as that is
  not effected by `.freeze()`

#### `config.clone()`

To get a deep clone of the config object, use `config.clone()`.
A cloned config object will have the same underlying data but
none of the other properties. For example, if you clone a frozen
config object, you are able to make changes to the clone but not
the original object.

#### `var value = config.getRemote(keypath)`

The same as `config.get()` but gets from a different in memory
  object then `config.get()`.

It's recommended that you use `config.get()` and `config.set()`
  for any local configuration that is static and effectively
  immutable after process startup.

You can use `config.getRemote()` and `config.setRemote()` for
  any dynamic configuration that is effectively controlled
  remotely outside your program.

#### `config.setRemote(keypath, value)`

The same as `config.set()` but sets to a different in memory
  objec then `config.set()`.

You can use `config.getRemote()` and `config.setRemote()` for
  any dynamic configuration that is effectively controlled
  remotely outside your program.

## Installation

`npm install zero-config`

## Tests

`npm test`

## Best Practices

Zero-config is designed to help you structure your config 
files to support a number of production concerns. These best
 practices reflect our approach and some of the reasons we 
 designed Zero-config as we did.

 - Configuration should live in a single file
 - Only put configuration in more specific configuration 
files when you really have to. Dev and test configs should 
only contain changes to support development 
(e.g. turning off caching).
 - Put your secrets in a `secrets.json` so that they are 
easier to manage safely. Ideally never commit these files 
to your source control repository. This is why we keep secrets
in a folder that is easy to symlink
 - If you must have development secrets in source control
 for developer convenience then try to scrub them from
 builds of your projects. We call these `secrets-ENV.json` to
 make that easy.

## Contributors

 - Raynos
 - sh1mmer

## MIT Licenced

  [build-png]: https://secure.travis-ci.org/uber/zero-config.png
  [build]: https://travis-ci.org/uber/zero-config
  [cover-png]: https://coveralls.io/repos/uber/zero-config/badge.png
  [cover]: https://coveralls.io/r/uber/zero-config
  [dep-png]: https://david-dm.org/uber/zero-config.png
  [dep]: https://david-dm.org/uber/zero-config
  [test-png]: https://ci.testling.com/uber/zero-config.png
  [tes]: https://ci.testling.com/uber/zero-config
  [npm-png]: https://nodei.co/npm/zero-config.png?stars&downloads
  [npm]: https://nodei.co/npm/zero-config
