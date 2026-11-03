# @ferndev/core

## 2.1.1

### Patch Changes

- A failed request now carries what the backend said. On a non-2xx response, `callAction` reads the JSON body and returns `error.message` and the new `error.code` from it (for example `{ message: 'You cannot add "ML-040" to the cart because the product is out of stock.', status: 400, code: 'out_of_stock' }`). Without a JSON `message`, the message stays `HTTP error <status>`.

## 2.1.0

### Minor Changes

- [#8](https://github.com/Olympe-Studio/ferndev/pull/8) [`baf3690`](https://github.com/Olympe-Studio/ferndev/commit/baf36902833b90a0e309cad1ead1c009752c27f1) Thanks [@Tanguy-Magnaudet](https://github.com/Tanguy-Magnaudet)! - `nanostores` is now a peer dependency of `@ferndev/woo` (`^0.11.4 || ^1.0.0`) instead of a bundled `^0.11.4` dependency, so an app on nanostores 1.x shares one copy with the cart stores without an `overrides` entry.
