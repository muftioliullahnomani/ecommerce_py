export interface ProductStyleTemplate {
  id: number
  name: string
  card_bg_color: string
  price_color: string
  primary_color: string
  outline_color: string
  button_variant: 'primary' | 'outline'
  rounded_px: number
  image_height_px: number
  show_badges: boolean
}

export interface Product {
  id: number
  name: string
  description: string
  price: number
  image_url: string
  category: string
  in_stock: boolean
  stock_qty: number
  low_stock_threshold: number
  notify_on_low_stock: boolean
  is_available?: boolean
  is_low_stock?: boolean
  style_template?: ProductStyleTemplate | null
}
