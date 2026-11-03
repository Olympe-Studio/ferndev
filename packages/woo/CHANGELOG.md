# @ferndev/woo

## 2.1.1

### Patch Changes

- `addToCart` and `batchAddToCart` report the reason WooCommerce gave for refusing a product. `WooError` gains `httpStatus`, and keeps the backend's `message` and `code` (`out_of_stock`, `insufficient_stock`, `invalid_quantity`, `variation_required`, `not_purchasable`, `add_failed`) for a failed request. When no item of a batch was added, the error is the first refused item's reason; every refused item keeps its `message` and `code` in `results` (`BatchItemResult.code`). Needs `fern/core` 2.0.4 on the PHP side and `@ferndev/core` 2.1.1.
- Updated dependencies
  - @ferndev/core@2.1.1

## 2.1.0

### Minor Changes

- [#8](https://github.com/Olympe-Studio/ferndev/pull/8) [`baf3690`](https://github.com/Olympe-Studio/ferndev/commit/baf36902833b90a0e309cad1ead1c009752c27f1) Thanks [@Tanguy-Magnaudet](https://github.com/Tanguy-Magnaudet)! - `nanostores` is now a peer dependency of `@ferndev/woo` (`^0.11.4 || ^1.0.0`) instead of a bundled `^0.11.4` dependency, so an app on nanostores 1.x shares one copy with the cart stores without an `overrides` entry.
