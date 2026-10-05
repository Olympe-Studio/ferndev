export interface Price {
  regular_price: string
  sale_price: string | null
  price: string
  sale_amount: number | null
  is_on_sale: boolean
  currency: string
}

export interface CartItem {
  key: string
  id: number
  product_id: number
  variation_id?: number
  name: string
  short_description: string
  quantity: number
  sku: string
  position: number
  price: Price
  subtotal: string
  total: string
  true_total: string
  variation: CartItemVariation
  image: string | null
  productData?: CartItemData | VariableProductData
  meta_data: Record<string, unknown>
}

export type CartItemVariation = Record<string, string>

export interface CartItemData {
  variations: {
    id: number
    attributes: CartItemVariation
    price: Price
    min_quantity: number | ""
    max_quantity: number | ""
    sku: string
    is_in_stock: boolean
    meta_data: Record<string, unknown>
  }[]
  attributes: Record<string, {
    name: string
    options: string[]
  }>
}

export interface Variation {
  id: number;
  attributes: CartItemVariation;
  price: Price;
  min_quantity: number | "";
  max_quantity: number | "";
  sku: string;
  is_in_stock: boolean;
  meta_data: Record<string, unknown>;
}

export interface VariableProductData {
  variations: Variation[]
}

export interface Cart {
  items: CartItem[]
  subtotal: string
  total: string
  item_count: number
  tax_total: string
  tax_total_numeric?: number
  needs_shipping: boolean
  shipping_total: string
  shipping_total_numeric?: number
  meta_data: Record<string, unknown>
}

export interface InitialStateResponse {
  cart: Cart
  config: WooCommerceConfig
}

export interface AddToCartArgs {
  productId: number
  quantity?: number | undefined
  variationId?: number | undefined
  variation?: CartItemVariation | undefined
  cartItemKey?: string | undefined
}

export interface UpdateCartItemArgs {
  cartItemKey: string
  quantity?: number
  variationId?: number
  variation?: CartItemVariation
}

export interface BatchAddToCartItem {
  productId: number
  quantity?: number | undefined
  variationId?: number | undefined
  variation?: CartItemVariation | undefined
}

export interface BatchAddToCartArgs {
  items: BatchAddToCartItem[]
}

export interface BatchItemResult {
  index: number
  success: boolean
  message: string
  cart_item_key: string | null
}

export interface BatchAddToCartResponse {
  success: boolean
  message: string
  results: BatchItemResult[]
  cart: Cart
}

/**
 * Error payload carried by a failed cart operation. `code` is the backend's machine-readable
 * reason when available (e.g. `'out_of_stock'`, `'invalid_coupon'`).
 */
export interface WooError {
  message: string
  code?: string
}

/**
 * Normalized result of a single cart operation. A discriminated union on `status`: success
 * carries the updated `cart`, failure (transport OR business, e.g. out-of-stock) carries `error`.
 */
export type CartResult =
  | { status: 'ok'; cart: Cart }
  | { status: 'error'; error: WooError }

/**
 * Result of {@link initializeCart}: success carries both the `cart` and shop `config`.
 */
export type InitialStateResult =
  | { status: 'ok'; cart: Cart; config: WooCommerceConfig }
  | { status: 'error'; error: WooError }

/**
 * Result of {@link batchAddToCart}. Preserves per-item `results` on both branches: a partial
 * failure yields `status: 'error'` while still updating the cart with the items that succeeded.
 */
export type BatchCartResult =
  | { status: 'ok'; cart: Cart; results: BatchItemResult[] }
  | { status: 'error'; error: WooError; results?: BatchItemResult[] }

type WooBoolean = 'yes' | 'no';
type CurrencyPosition = 'left' | 'right' | 'left_space' | 'right_space';
type TaxDisplay = 'incl' | 'excl';
type CatalogOrderby = 'menu_order' | 'popularity' | 'rating' | 'date' | 'price' | 'price-desc';
type WeightUnit = 'kg' | 'g' | 'lbs' | 'oz';
type DimensionUnit = 'cm' | 'm' | 'mm' | 'in' | 'yd';
type StockFormat = 'no_amount' | 'low_amount' | 'always';
type ThumbnailCropping = '1:1' | 'custom' | 'uncropped';

export interface WooCommerceConfig {
  // Currency and Price Settings
  currency: string;
  currency_symbol: string;
  currency_position: CurrencyPosition;
  thousand_separator: string;
  decimal_separator: string;
  price_decimals: number;

  // Tax Settings
  tax_enabled: boolean;
  calc_taxes: WooBoolean;
  tax_display_shop: TaxDisplay;
  tax_display_cart: TaxDisplay;
  prices_include_tax: WooBoolean;

  // Important Pages
  cart_page_url: string;
  checkout_page_url: string;
  account_page_url: string;
  shop_page_url: string;
  terms_page_url: string;

  // Store Information
  store_address: string;
  store_city: string;
  store_postcode: string;
  store_country: string;

  // Product Settings
  weight_unit: WeightUnit;
  dimension_unit: DimensionUnit;
  products_per_page: number;
  catalog_orderby: CatalogOrderby;
  review_ratings_enabled: boolean;

  // Inventory Settings
  manage_stock: WooBoolean;
  stock_format: StockFormat;
  notify_low_stock: boolean;
  notify_no_stock: boolean;
  low_stock_amount: number;

  // Checkout Settings
  enable_guest_checkout: boolean;
  enable_checkout_login_reminder: boolean;
  enable_signup_and_login_from_checkout: boolean;
  enable_myaccount_registration: boolean;

  // Email Settings
  admin_email: string;
  email_from_name: string;
  email_from_address: string;

  // Digital Products
  downloads_require_login: boolean;
  downloads_grant_access_after_payment: boolean;

  // Image Sizes
  image_sizes: {
    thumbnail: {
      width: number;
      height: number;
      crop: ThumbnailCropping;
    };
    single: {
      width: number;
      height: number;
    };
  };
}
