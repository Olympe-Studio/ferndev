---
"@ferndev/core": minor
"@ferndev/woo": minor
---

`nanostores` is now a peer dependency of `@ferndev/woo` (`^0.11.4 || ^1.0.0`) instead of a bundled `^0.11.4` dependency, so an app on nanostores 1.x shares one copy with the cart stores without an `overrides` entry.
