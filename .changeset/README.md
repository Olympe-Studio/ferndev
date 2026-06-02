# Changesets

This folder is managed by [Changesets](https://github.com/changesets/changesets). It holds the
intent to release: each change that should ship adds a markdown file here describing the bump
(`patch` / `minor` / `major`) per package and a human-readable summary.

`@ferndev/core` and `@ferndev/woo` are a **fixed** group — they always version and publish in
lockstep.

## Workflow

```bash
# After making a change, record its release intent:
bun changeset

# Maintainers / CI: apply pending changesets to versions + CHANGELOG:
bun run version

# Publish the bumped packages to npm (CI does this with provenance):
bun run release
```

See the [Changesets docs](https://github.com/changesets/changesets/blob/main/docs/intro-to-using-changesets.md).
