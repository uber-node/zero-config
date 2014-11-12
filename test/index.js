var test = require('tape');
var path = require('path');
var withFixtures = require('fixtures-fs');

var fetchConfig = require('../index.js');

function catchFn(fn) {
    var err;
    try {
        fn();
    } catch (e) {
        err = e;
    }

    return err;
}

test('fetchConfig can be called as a function', function (assert) {
    var c = fetchConfig(__dirname);

    assert.equal(typeof c, 'object');
    assert.equal(typeof c.get, 'function');
    assert.equal(typeof c.getRemote, 'function');
    assert.equal(typeof c.on, 'function');
    assert.equal(typeof c.once, 'function');

    assert.end();
});

test('fetchConfig throws without dirname', function (assert) {
    assert.throws(function () {
        fetchConfig();
    }, /invalid __dirname/);

    assert.end();
});

test('fetchConfig creates a config object', function (assert) {
    var config = fetchConfig(__dirname);

    assert.equal(typeof config, 'object');
    assert.equal(typeof config.get, 'function');
    assert.end();
});

test('fetchConfig reads from argv', function (assert) {
    var argv = ['--foo', 'bar', '--baz.lulz', 'some value'];

    var config = fetchConfig(__dirname, { argv: argv });

    assert.equal(config.get('foo'), 'bar');
    assert.equal(config.get('baz.lulz'), 'some value');
    assert.end();
});

test('config loads config files', withFixtures(__dirname, {
    config: {
        'common.json': JSON.stringify({
            port: 3000,
            nested: {
                key: true,
                shadowed: ':('
            },
            freeKey: 'nice'
        }),
        'test.json': JSON.stringify({
            port: 4000,
            someKey: 'ok',
            nested: {
                extra: 40,
                shadowed: ':)'
            }
        })
    }
}, function (assert) {
    var env = {
        'NODE_ENV': 'test'
    };

    var config = fetchConfig(__dirname, { env: env });

    assert.equal(config.get('port'), 4000);
    assert.equal(config.get('nested.key'), true);
    assert.equal(config.get('nested.shadowed'), ':)');
    assert.equal(config.get('nested.extra'), 40);
    assert.equal(config.get('someKey'), 'ok');
    assert.equal(config.get('freeKey'), 'nice');

    var conf = config.get();
    assert.equal(conf.someKey, 'ok');
    assert.equal(conf.freeKey, 'nice');
    assert.equal(conf.port, 4000);
    assert.deepEqual(conf.nested, {
        key: true,
        shadowed: ':)',
        extra: 40
    });

    assert.end();
}));

test('config loads from datacenter file', withFixtures(__dirname, {
    'config': {
        'common.json': JSON.stringify({
            a: 'a',
            b: {
                c: 'c',
                d: 'd'
            }
        }),
        'production.json': JSON.stringify({
            b: {
                c: 'c2'
            }
        }),
        'production.peak1.json': JSON.stringify({
            a: 'a3'
        })
    },
    'datacenter': 'peak1'
}, function (assert) {
    var env = {
        'NODE_ENV': 'production'
    };

    var config = fetchConfig(__dirname, {
        env: env,
        dc: path.join(__dirname, 'datacenter')
    });

    assert.equal(config.get('datacenter'), 'peak1');
    assert.equal(config.get('a'), 'a3');
    assert.equal(config.get('b.c'), 'c2');
    assert.equal(config.get('b.d'), 'd');
    assert.deepEqual(config.get('b'), { c: 'c2', d: 'd' });

    assert.end();
}));

test('config loads from dcValue', withFixtures(__dirname, {
    'config': {
        'common.json': JSON.stringify({
            a: 'a',
            b: {
                c: 'c',
                d: 'd'
            }
        }),
        'production.json': JSON.stringify({
            b: {
                c: 'c2'
            }
        }),
        'production.peak1.json': JSON.stringify({
            a: 'a3'
        })
    }
}, function (assert) {
    var env = {
        'NODE_ENV': 'production'
    };

    var config = fetchConfig(__dirname, {
        env: env,
        dcValue: 'peak1'
    });

    assert.equal(config.get('datacenter'), 'peak1');
    assert.equal(config.get('a'), 'a3');
    assert.equal(config.get('b.c'), 'c2');
    assert.equal(config.get('b.d'), 'd');
    assert.deepEqual(config.get('b'), { c: 'c2', d: 'd' });

    assert.end();
}));

test('config reads a datacenter file', withFixtures(__dirname, {
    datacenter: 'peak1'
}, function (assert) {
    var config = fetchConfig(__dirname, {
        dc: path.join(__dirname, 'datacenter')
    });

    assert.equal(config.get('datacenter'), 'peak1');

    assert.end();
}));

test('non existant datacenter file', function (assert) {
    var config = fetchConfig(__dirname, {
        dc: path.join(__dirname, 'datacenter')
    });

    config.once('error', function (err) {
        assert.equal(err.type, 'missing.datacenter.file');
        assert.equal(err.warning, true);
        assert.equal(err.code, 'ENOENT');
        assert.ok(/no such file/.test(err.message));

        assert.end();
    });
});

test('non existant datacenter file in production', function (assert) {
    var config = fetchConfig(__dirname, {
        dc: path.join(__dirname, 'datacenter'),
        env: { NODE_ENV: 'production' }
    });

    config.once('error', function (err) {
        assert.equal(err.type, 'datacenter.file.required');
        assert.equal(err.code, 'ENOENT');
        assert.ok(/no such file/.test(err.message));
        assert.ok(/datacenter file must exist/.test(err.message));

        assert.end();
    });
});

test('will load from --config', withFixtures(__dirname, {
    'systemConfig': {
        'config.json': JSON.stringify({ a: 42 })
    },
    'config': {
        'common.json': JSON.stringify({ a: 50, b: 20 })
    }
}, function (assert) {
    var configPath = path.join(__dirname,
        'systemConfig', 'config.json');

    var config = fetchConfig(__dirname, {
        argv: ['--config', configPath]
    });

    assert.equal(config.get('b'), 20);
    assert.equal(config.get('a'), 42);

    assert.end();
}));

test('no opts.dcValue in production', function (assert) {
    var err = catchFn(function () {
        fetchConfig(__dirname, {
            env: { NODE_ENV: 'production' }
        });
    });

    assert.ok(err);
    assert.equal(err.type, 'datacenter.option.required');
    assert.ok(/expected `opts.dcValue`/.test(err.message));
    assert.ok(/`opts.dcValue` is not optional/.test(err.message));

    assert.end();
});

test('blackList feature', function (assert) {
    var config = fetchConfig(__dirname, {
        blackList: ['foo', 'bar'],
        argv: ['--foo', 'foo', '--bar', 'bar', '--baz', 'baz']
    });

    assert.equal(config.get('foo'), undefined);
    assert.equal(config.get('bar'), undefined);
    assert.equal(config.get('baz'), 'baz');

    assert.end();
});

test('blackList unset keys do not break', function (assert) {
    var config = fetchConfig(__dirname, {
        blackList: ['foo', 'bar'],
        argv: ['--baz', 'baz']
    });

    assert.equal(config.get('foo'), undefined);
    assert.equal(config.get('bar'), undefined);
    assert.equal(config.get('baz'), 'baz');

    assert.end();
});

test('config.set()', function (assert) {
    var config = fetchConfig(__dirname);

    config.set('key', 'value');
    config.set('nested.key', 'value2');
    config.set('nested.key3', 'value3');
    config.set(['nested', 'key4'], 'value4');
    config.set(['nested', 'key.with.dots5'], 'value5');

    assert.equal(config.get('key'), 'value', 'flat key');
    assert.equal(config.get('nested.key'), 'value2', 'nested key');
    assert.equal(config.get('nested.key3'), 'value3', 'child nested key');
    assert.equal(config.get('nested.key4'), 'value4', 'array key');
    assert.equal(config.get(['nested', 'key.with.dots5']),
        'value5', 'array key with dots');

    assert.end();
});

test('config.set() deep', function (assert) {
    var config = fetchConfig(__dirname);

    config.set('key', {
        foo: 'bar',
        deep: {
            'thingy': 'thongy'
        }
    });

    config.set('key', {
        newKey: 'woh',
        deep: {
            'other': 'yeah'
        }
    });

    var k = config.get('key');
    assert.deepEqual(k, {
        foo: 'bar',
        newKey: 'woh',
        deep: {
            'thingy': 'thongy',
            'other': 'yeah'
        }
    });

    assert.end();
});

test('config.set(undefined) throws', function (assert) {
    var config = fetchConfig(__dirname);

    assert.throws(function () {
        config.set(undefined, 42);
    }, /invalid keypath/);

    assert.end();

});

test('config({ seed: seed })', function (assert) {
    var argv = [
        '--foo', 'bar',
        '--baz.lulz', 'some value',
        '--baz.foob', 'thingy'
    ];

    var config = fetchConfig(__dirname, {
        argv: argv,
        seed: {
            baz: {
                lulz: 42
            },
            bar: 'foo'
        }
    });

    assert.equal(config.get('foo'), 'bar');
    assert.equal(config.get('baz.lulz'), 42);
    assert.equal(config.get('baz.foob'), 'thingy');
    assert.equal(config.get('bar'), 'foo');

    assert.end();
});

test('config({ defaults: defaults })', function (assert) {
    var argv = [
        '--foo', 'bar',
        '--baz.lulz', 'some value',
        '--baz.foob', 'thingy'
    ];

    var config = fetchConfig(__dirname, {
        argv: argv,
        seed: {
            baz: {
                lulz: 42
            },
            bar: 'foo',
            shouldBeUndefined: undefined,
            shouldBeOverwritten: 'overwrittenValue',
            shouldBeMerged: {
                deep: {
                    foo: 'bar'
                }
            }
        },
        defaults: {
            shouldBeUndefined: 'defined',
            shouldBeFalse: false,
            shouldBeTrue: true,
            shouldBeNested: {
                key: 'value'
            },
            shouldBeOverwritten: 'value',
            shouldBeMerged: {
                deep: {
                    bar: 'baz'
                }
            }
        }
    });

    assert.equal(config.get('foo'), 'bar');
    assert.equal(config.get('baz.lulz'), 42);
    assert.equal(config.get('baz.foob'), 'thingy');
    assert.equal(config.get('shouldBeUndefined'), undefined);
    assert.equal(config.get('shouldBeFalse'), false);
    assert.equal(config.get('shouldBeTrue'), true);
    assert.equal(config.get('shouldBeNested.key'), 'value');
    assert.equal(config.get('shouldBeOverwritten'), 'overwrittenValue');
    assert.equal(config.get('shouldBeMerged.deep.foo'), 'bar');
    assert.equal(config.get('shouldBeMerged.deep.bar'), 'baz');

    assert.end();
});

test('config({ replacements: replacements})', withFixtures(__dirname, {
    config: {
        'development.json': JSON.stringify({
            someKey: 'foo.bar',
            nested: {
                key: 'panic'
            }
        })
    }
}, function (assert) {
    var env = {
        'NODE_ENV': 'development'
    };

    // Utilities for tests
    function fetchPartial(env){
        return function(replacements){
            return fetchConfig(__dirname, {
                env: env,
                replacements: replacements
            });
        };
    }
    var fetchWithReplacements = fetchPartial(env);

    // Simple string replace
    var replacements = [{
        from: 'bar',
        to: 'baz'
    }];
    var config = fetchWithReplacements(replacements);
    assert.equal(config.get('someKey'), 'foo.baz');

    // Regex replacement
    replacements = [{
        from: /([a-z]+)/,
        to: 'dont $1'
    }];
    config = fetchWithReplacements(replacements);
    assert.equal(config.get('nested.key'), 'dont panic');

    // Multiple distinct replacements
    replacements = [{
        from: 'bar',
        to: 'qux'
    },{
        from: 'panic',
        to: 'do panic'
    }];
    config = fetchWithReplacements(replacements);
    assert.equal(config.get('someKey'), 'foo.qux');
    assert.equal(config.get('nested.key'), 'do panic');

    // Multiple consecutive replacements
    replacements = [{
        from: 'bar',
        to: 'foo'
    },{
        from: /foo/g,
        to: 'wat'
    }];
    config = fetchWithReplacements(replacements);
    assert.equal(config.get('someKey'), 'wat.wat');
    assert.equal(config.get('nested.key'), 'panic');

    assert.end();
}));

test('config({ replacements: malformed})', function t(assert){
    var replacements = {
        to: 'this is',
        from: 'not valid'
    };

    var loadConfig = function(){
        fetchConfig(__dirname, {
            replacements: replacements
        });
    };
    assert.throws(loadConfig);
    assert.end();
});

test('config.set(entireObj)', function t(assert) {
    var config = fetchConfig(__dirname);

    config.set('foo', 'bar');
    config.set('baz', { 42: 42 });

    assert.equal(config.get('foo'), 'bar');
    assert.deepEqual(config.get('baz'), { '42': 42 });

    config.set({
        foo: 'new-key',
        baz: { 50: 50 },
        other: 'thing'
    });

    assert.equal(config.get('foo'), 'new-key');
    assert.deepEqual(config.get('baz'), { '42': 42, '50': 50 });
    assert.equal(config.get('other'), 'thing');

    assert.end();
});

test('config.set(weirdValue)', function t(assert) {
    var config = fetchConfig(__dirname);

    assert.throws(function () {
        config.set(42);
    }, /Invalid `config\.set\(obj\)` argument/);

    assert.end();
});

test('config.setRemote()', function t(assert) {
    var config = fetchConfig(__dirname);

    config.setRemote('foo', 'bar');

    assert.deepEqual(config.getRemote(), {
        'foo': 'bar'
    });

    assert.end();
});

test('config.freeze()', function t(assert) {
    var config = fetchConfig(__dirname);

    config.set('foo', 'bar');

    assert.equal(config.get('foo'), 'bar');

    config.freeze();

    assert.throws(function () {
        config.set('foo', 'baz');
    }, /Config is frozen/);

    assert.throws(function () {
        config.set('bar', 'baz');
    }, /Config is frozen/);

    assert.end();
});
