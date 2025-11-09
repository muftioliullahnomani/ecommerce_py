import { Link } from 'react-router-dom'
import { useMemo, useState } from 'react'
import type { Product } from '../types'

function useLocalSet(key: string) {
  const read = (): Set<number> => {
    try {
      const raw = localStorage.getItem(key)
      if (!raw) return new Set()
      const arr = JSON.parse(raw) as number[]
      return new Set(arr)
    } catch {
      return new Set()
    }
  }
  const [setState, setSetState] = useState<Set<number>>(read)
  const api = useMemo(() => ({
    has: (id: number) => setState.has(id),
    add: (id: number) => {
      if (!setState.has(id)) {
        const next = new Set(setState)
        next.add(id)
        localStorage.setItem(key, JSON.stringify(Array.from(next)))
        setSetState(next)
      }
    },
    remove: (id: number) => {
      if (setState.has(id)) {
        const next = new Set(setState)
        next.delete(id)
        localStorage.setItem(key, JSON.stringify(Array.from(next)))
        setSetState(next)
      }
    }
  }), [setState])
  return api
}

export default function ProductCard({ product }: { product: Product }) {
  const placeholder = 'https://via.placeholder.com/600x600?text=No+Image'
  const src = product.image_url && product.image_url.trim().length > 0 ? product.image_url : placeholder
  const cart = useLocalSet('cart')
  const favs = useLocalSet('favorites')
  const inCart = cart.has(product.id)
  const isFav = favs.has(product.id)
  const isAvailable = product.is_available ?? (product.in_stock && (product.stock_qty == null || product.stock_qty > 0))
  const isLowStock = product.is_low_stock ?? (product.stock_qty != null && product.stock_qty > 0 && product.stock_qty <= Math.max(0, product.low_stock_threshold || 0))
  const tpl = product.style_template || null
  const radius = tpl?.rounded_px ?? 10
  const imgH = tpl?.image_height_px ?? 200
  const priceColor = tpl?.price_color || undefined
  const showBadges = tpl?.show_badges !== false
  const cartBtnOutline = tpl?.button_variant === 'outline'
  const favBtnOutline = tpl?.button_variant === 'outline'
  const primaryColor = tpl?.primary_color || '#2563eb'
  const outlineColor = tpl?.outline_color || primaryColor
  const cartBtnStyle: React.CSSProperties = cartBtnOutline
    ? { background: '#fff', color: outlineColor, borderColor: outlineColor }
    : { background: primaryColor, color: '#fff', borderColor: primaryColor }
  const favBtnStyle: React.CSSProperties = favBtnOutline
    ? { background: '#fff', color: outlineColor, borderColor: outlineColor }
    : { background: primaryColor, color: '#fff', borderColor: primaryColor }

  return (
    <div className="card" style={{ background: tpl?.card_bg_color || undefined, borderRadius: radius }}>
      <Link to={`/product/${product.id}`}>
        <img
          src={src}
          alt={product.name}
          className="card-img"
          style={{ height: imgH }}
          loading="lazy"
          onError={(e) => {
            const target = e.currentTarget as HTMLImageElement
            if (target.src !== placeholder) target.src = placeholder
          }}
        />
      </Link>
      <div className="card-body">
        <Link to={`/product/${product.id}`} className="card-title">{product.name}</Link>
        <div className="card-price" style={{ color: priceColor }}>${product.price.toFixed(2)}</div>
        {showBadges && (
          <div className="card-meta">
            {!isAvailable && <span className="badge badge-danger">Out of stock</span>}
            {isAvailable && isLowStock && <span className="badge badge-warning">Low stock ({product.stock_qty})</span>}
            {isAvailable && !isLowStock && product.stock_qty != null && <span className="badge badge-ok">In stock ({product.stock_qty})</span>}
          </div>
        )}
        <div className="card-actions">
          <button
            className={`btn btn-sm ${cartBtnOutline ? 'btn-outline' : ''} ${inCart || !isAvailable ? 'btn-disabled' : ''}`}
            disabled={inCart || !isAvailable}
            onClick={() => cart.add(product.id)}
            aria-label="Add to Cart"
            title={!isAvailable ? 'Out of stock' : (inCart ? 'Added to cart' : 'Add to cart')}
            style={cartBtnStyle}
          >
            🛒 <span className="btn-label">{!isAvailable ? 'Out of Stock' : (inCart ? 'Added' : 'Add to Cart')}</span>
          </button>
          <button
            className={`btn btn-sm ${favBtnOutline ? 'btn-outline' : ''} ${isFav ? 'btn-active' : ''}`}
            onClick={() => (isFav ? favs.remove(product.id) : favs.add(product.id))}
            aria-label="Add to Favorites"
            title={isFav ? 'Remove from favorites' : 'Add to favorites'}
            style={favBtnStyle}
          >
            {isFav ? '♥' : '♡'} <span className="btn-label">{isFav ? 'Favorited' : 'Favorite'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
