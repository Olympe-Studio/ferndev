
export interface CartItem {
  key: string
  id: number
  product_id: number
  variation_id?: number
  name: string
  price: number
  quantity: number
  subtotal: number
  total: number
  variation: CartItemVariation
  image?: string
  productData: CartItemData
}

export interface CartItemVariation {
  [key: string]: string
}

export interface CartItemData {
  variations: {
    id: number,
    attributes: CartItemVariation,
    price: string,
    min_quantity: number | "",
    max_quantity: number | "",
    is_in_stock: boolean,
  }[],
  attributes: {
    [key: string]: {
      name: string
      options: string[]
    }
  }
}

export interface Cart {
  items: CartItem[]
  subtotal: number
  total: number
  item_count: number
  tax_total: number
  needs_shipping: boolean
  shipping_total: number
}

export interface ShopConfig {
  currency: string
  currency_symbol: string
  currency_position: string
  thousand_separator: string
  decimal_separator: string
  price_decimals: number
  tax_enabled: boolean
  calc_taxes: boolean
}

export interface InitialStateResponse {
  cart: Cart
  config: ShopConfig
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
