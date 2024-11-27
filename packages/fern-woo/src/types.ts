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
  meta_data: {
    [key: string]: any
  }
  product_id: number
  variation_id?: number
  name: string
  short_description: string
  quantity: number
  price: Price
  subtotal: string
  total: string
  variation: CartItemVariation
  image?: string
  productData: CartItemData
}

export interface CartItemVariation {
  [key: string]: string
}

export interface CartItemData {
  variations: {
    id: number
    attributes: CartItemVariation
    price: Price
    min_quantity: number | ""
    max_quantity: number | ""
    is_in_stock: boolean
    meta_data: {
      [key: string]: any
    }
  }[]
  attributes: {
    [key: string]: {
      name: string
      options: string[]
    }
  }
}

export interface Cart {
  items: CartItem[]
  subtotal: string
  total: string
  item_count: number
  tax_total: string
  needs_shipping: boolean
  shipping_total: string
}

export interface InitialStateResponse {
  cart: Cart
  config: WooCommerceConfig
}

export interface AddToCartArgs {
  productId: number
  quantity?: number
  variationId?: number
  variation?: CartItemVariation
  cartItemKey?: string
}

export interface UpdateCartItemArgs {
  cartItemKey: string
  quantity?: number
  variationId?: number
  variation?: CartItemVariation
}


type WooBoolean = 'yes' | 'no';
type CurrencyPosition = 'left' | 'right' | 'left_space' | 'right_space';
type TaxDisplay = 'incl' | 'excl';
type CatalogOrderby = 'menu_order' | 'popularity' | 'rating' | 'date' | 'price' | 'price-desc';
type WeightUnit = 'kg' | 'g' | 'lbs' | 'oz';
type DimensionUnit = 'cm' | 'm' | 'mm' | 'in' | 'yd';
type StockFormat = 'no_amount' | 'low_amount' | 'always';
type ThumbnailCropping = '1:1' | 'custom' | 'uncropped';

export type WooCommerceConfig = {
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
};
