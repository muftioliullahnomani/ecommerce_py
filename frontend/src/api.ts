import type { Product } from './types'

const API_BASE = 'http://127.0.0.1:8000/api'

export type FetchProductsParams = { q?: string; category_id?: number; min_price?: number; max_price?: number; ordering?: 'newest' | 'oldest' | 'price_asc' | 'price_desc' }

export async function fetchProducts(params?: FetchProductsParams): Promise<Product[]> {
  const url = new URL(API_BASE + '/products/')
  if (params?.q) url.searchParams.set('q', params.q)
  if (params?.category_id != null) url.searchParams.set('category_id', String(params.category_id))
  if (params?.min_price != null) url.searchParams.set('min_price', String(params.min_price))
  if (params?.max_price != null) url.searchParams.set('max_price', String(params.max_price))
  if (params?.ordering) url.searchParams.set('ordering', params.ordering)
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch products')
  const data = await res.json()
  return (data as any[]).map((p) => ({ ...p, price: Number(p.price) })) as Product[]
}

export async function fetchProduct(id: string | number): Promise<Product> {
  const res = await fetch(`${API_BASE}/products/${id}/`)
  if (!res.ok) throw new Error('Product not found')
  const p = await res.json()
  return { ...p, price: Number(p.price) } as Product
}

export type Category = { id: number; name: string; parent: number | null; children?: Category[] }

export async function fetchCategoryTree(): Promise<Category[]> {
  const res = await fetch(`${API_BASE}/categories/tree/`)
  if (!res.ok) throw new Error('Failed to fetch categories')
  return res.json()
}

export type CarouselSlide = { id: number; title: string; image_url: string; link_url: string; order: number }
export type Carousel = { id: number; title: string; animation?: 'none' | 'slide' | 'fade' | 'slide_fade' | 'zoom_in' | 'zoom_out' | 'skew' | 'kenburns'; speed_ms?: number; single_slider?: boolean; slider_height_px?: number; order: number; slides: CarouselSlide[] }
export type CarouselSection = { id: number; order: number; carousel: Carousel }
export type HomeSection = {
  id: number
  title: string
  kind: 'category' | 'newest' | 'popular' | 'trend'
  category: number | null
  category_name?: string
  limit: number
  columns: number
  order: number
  products: Product[]
}
export type HomeConfig = {
  home_product_limit: number
  home_columns: number
  home_order: number
  floating_cart_bg?: string
  floating_cart_text?: string
  floating_cart_border?: string
  floating_cart_position?: 'br' | 'bl'
  floating_cart_radius?: number
  menu_bg_color?: string | null
  menu_text_color?: string | null
  menu_hover_bg_color?: string | null
  menu_hover_text_color?: string | null
  menu_link_gap_px?: number | null
  menu_radius_px?: number | null
  menu_card_enabled?: boolean | null
  menu_card_bg_color?: string | null
  menu_card_border_color?: string | null
  menu_card_border_px?: number | null
  menu_card_padding_px?: number | null
  menu_card_radius_px?: number | null
  menu_card_shadow?: boolean | null
  primary_menu?: {
    id: number
    name: string
    items: { id: number; label: string; url: string; order: number }[]
  } | null
  sections: HomeSection[]
  carousels: Carousel[]
  carousel_sections: CarouselSection[]
}

export async function fetchHome(): Promise<HomeConfig> {
  const res = await fetch(`${API_BASE}/home/`)
  if (!res.ok) throw new Error('Failed to fetch home config')
  const data = await res.json()
  // normalize product prices
  data.sections = (data.sections || []).map((s: any) => ({
    ...s,
    products: (s.products || []).map((p: any) => ({ ...p, price: Number(p.price) })),
  }))
  return data as HomeConfig
}

// Auth
export type User = { id: number; username: string; email: string; first_name?: string; last_name?: string }

function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null
  const m = document.cookie.match(/(?:^|; )csrftoken=([^;]+)/)
  return m ? decodeURIComponent(m[1]) : null
}

async function postJson(path: string, body: any) {
  const csrf = getCsrfToken()
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(csrf ? { 'X-CSRFToken': csrf } : {}) },
    credentials: 'include',
    body: JSON.stringify(body ?? {}),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.detail || 'Request failed')
  return data
}

export async function apiRegister(payload: { email: string; password: string; username?: string; first_name?: string; last_name?: string }): Promise<User> {
  return postJson('/auth/register/', payload)
}

export async function apiLogin(payload: { email?: string; username?: string; password: string }): Promise<User> {
  return postJson('/auth/login/', payload)
}

export async function apiLogout(): Promise<{ ok: boolean }> {
  return postJson('/auth/logout/', {})
}

export async function apiMe(): Promise<User> {
  const res = await fetch(`${API_BASE}/auth/me/`, { credentials: 'include' })
  if (!res.ok) throw new Error('Unauthorized')
  return res.json()
}

// Orders
export type OrderItemInput = { product: number; quantity: number; price?: number }
export type Order = {
  id: number
  status: 'pending' | 'paid' | 'shipped' | 'canceled'
  customer_name: string
  customer_email: string
  customer_phone?: string
  address?: string
  city?: string
  postal_code?: string
  total: number
  items: Array<{ id: number; product: number; product_name?: string; quantity: number; price: number }>
}

export async function createOrder(payload: {
  customer_name: string
  customer_email: string
  customer_phone?: string
  address?: string
  city?: string
  postal_code?: string
  items: OrderItemInput[]
}): Promise<Order> {
  const res = await fetch(`${API_BASE}/orders/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(getCsrfToken() ? { 'X-CSRFToken': getCsrfToken() as string } : {}) },
    credentials: 'include',
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.detail || 'Failed to create order')
  data.total = Number(data.total)
  data.items = (data.items || []).map((it: any) => ({ ...it, price: Number(it.price) }))
  return data as Order
}

export async function getOrder(id: number): Promise<Order> {
  const res = await fetch(`${API_BASE}/orders/${id}/`, { credentials: 'include' })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.detail || 'Order not found')
  data.total = Number(data.total)
  data.items = (data.items || []).map((it: any) => ({ ...it, price: Number(it.price) }))
  return data as Order
}

export async function listOrdersByEmail(email: string): Promise<Order[]> {
  const url = new URL(`${API_BASE}/orders/`)
  url.searchParams.set('email', email)
  const res = await fetch(url.toString(), { credentials: 'include' })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.detail || 'Failed to fetch orders')
  return (data as any[]).map((o) => ({
    ...o,
    total: Number(o.total),
    items: (o.items || []).map((it: any) => ({ ...it, price: Number(it.price) })),
  })) as Order[]
}

export async function updateOrder(id: number, patch: Partial<Pick<Order, 'status'>>): Promise<Order> {
  const res = await fetch(`${API_BASE}/orders/${id}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...(getCsrfToken() ? { 'X-CSRFToken': getCsrfToken() as string } : {}) },
    credentials: 'include',
    body: JSON.stringify(patch),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.detail || 'Failed to update order')
  data.total = Number(data.total)
  data.items = (data.items || []).map((it: any) => ({ ...it, price: Number(it.price) }))
  return data as Order
}

// Payment settings
export type PaymentSetting = {
  title: string
  description: string
  button_label: string
  success_message: string
  enabled: boolean
  require_login: boolean
  test_mode: boolean
  gateway_name: string
  currency: string
  fixed_fee: number
  fee_percent: number
}

export async function fetchPaymentSetting(): Promise<PaymentSetting> {
  const res = await fetch(`${API_BASE}/payment/settings/`, { credentials: 'include' })
  if (!res.ok) throw new Error('Failed to load payment settings')
  const data = await res.json()
  data.fixed_fee = Number(data.fixed_fee || 0)
  data.fee_percent = Number(data.fee_percent || 0)
  return data as PaymentSetting
}

export type PaymentGateway = {
  id: number
  name: string
  display_name: string
  code: string
  enabled: boolean
  test_mode: boolean
  button_label: string
  order: number
}

export async function fetchPaymentGateways(): Promise<PaymentGateway[]> {
  const res = await fetch(`${API_BASE}/payment/gateways/`, { credentials: 'include' })
  if (!res.ok) throw new Error('Failed to load payment gateways')
  return res.json()
}
