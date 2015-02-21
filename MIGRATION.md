## Migration from v4 to v5

The secrets loading algorithm has changed. We previously always loaded
`config/secrets/secrets.json` and loaded `config/secrets-ENV.json`.

The new loading algorithm is to treat `config/secrets/secrets.json`
as production only. This means it only gets loaded when `NODE_ENV` is
the string `"production"`

The `config/secrets-ENV.json` files moved to `config/secrets/secrets-ENV.json`
and will only be loaded when `NODE_ENV` is not `"production"`.
