import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchProduct } from '../api'
import type { Product } from '../types'

export default function ProductPage() {
  const { id } = useParams()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // favorites state (top-level hook)
  const [isFav, setIsFav] = useState<boolean>(false)
  const [inCart, setInCart] = useState<boolean>(false)
  const [cartCount, setCartCount] = useState<number>(0)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    fetchProduct(id)
      .then(setProduct)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  // Initialize favorite state when product changes
  useEffect(() => {
    if (!product) return
    try {
      const raw = localStorage.getItem('favorites')
      const set = new Set<number>(raw ? JSON.parse(raw) : [])
      setIsFav(set.has(product.id))
    } catch {}
    try {
      const raw = localStorage.getItem('cart')
      const set = new Set<number>(raw ? JSON.parse(raw) : [])
      setInCart(set.has(product.id))
      setCartCount(set.size)
    } catch {}
  }, [product])

  useEffect(() => {
    const id = setInterval(() => {
      try {
        const raw = localStorage.getItem('cart')
        const set = new Set<number>(raw ? JSON.parse(raw) : [])
        setCartCount(set.size)
        if (product) setInCart(set.has(product.id))
      } catch {}
    }, 1000)
    return () => clearInterval(id)
  }, [product])

  const toggleFav = () => {
    if (!product) return
    try {
      const raw = localStorage.getItem('favorites')
      const set = new Set<number>(raw ? JSON.parse(raw) : [])
      if (set.has(product.id)) set.delete(product.id); else set.add(product.id)
      localStorage.setItem('favorites', JSON.stringify(Array.from(set)))
      setIsFav(set.has(product.id))
      setCartCount(set.size)
    } catch {}
  }

  // Template-derived styles
  const variant = product?.style_template?.button_variant || 'primary'
  const primary = product?.style_template?.primary_color || '#2563eb'
  const outline = product?.style_template?.outline_color || primary
  const cartBtnStyle = variant === 'outline'
    ? { background: '#fff', color: outline, borderColor: outline }
    : { background: primary, color: '#fff', borderColor: primary }
  const favBtnStyle = cartBtnStyle

  const addToCart = () => {
    if (!product) return
    try {
      const raw = localStorage.getItem('cart')
      const set = new Set<number>(raw ? JSON.parse(raw) : [])
      if (!set.has(product.id)) {
        set.add(product.id)
        localStorage.setItem('cart', JSON.stringify(Array.from(set)))
        setInCart(true)
      }
    } catch {}
  }

  if (loading) return <div>Loading...</div>
  if (error) return <div className="error">{error}</div>
  if (!product) return <div>Not found</div>

  return (
    <div className="product" style={{ position: 'relative', background: product.style_template?.card_bg_color || undefined, borderRadius: product.style_template?.rounded_px }}>
      {cartCount > 0 && (
        <Link to="/cart" className="corner-cart" aria-label={`Open cart (${cartCount})`} title="Go to cart">
          <span className="corner-cart-badge">{cartCount}</span> ➜
        </Link>
      )}
      {(() => {
        const placeholder = 'https://via.placeholder.com/800x800?text=No+Image'
        const src = product.image_url && product.image_url.trim().length > 0 ? product.image_url : placeholder
        const imgH = product.style_template?.image_height_px ?? undefined
        return (
          <img
            src={src}
            alt={product.name}
            className="product-img"
            style={imgH ? { height: imgH } : undefined}
            loading="lazy"
            onError={(e) => {
              const target = e.currentTarget as HTMLImageElement
              if (target.src !== placeholder) target.src = placeholder
            }}
          />
        )
      })()}
      <div className="product-info">
        <h1>{product.name}</h1>
        <div className="product-price" style={{ color: product.style_template?.price_color || undefined }}>${product.price.toFixed(2)}</div>
        <p>{product.description}</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className={`btn ${variant === 'outline' ? 'btn-outline' : ''}`} style={cartBtnStyle} onClick={addToCart} disabled={inCart} title={inCart ? 'Added to cart' : 'Add to cart'}>
            {inCart ? 'Added to Cart' : 'Add to Cart'}
          </button>
          <button className={`btn ${variant === 'outline' ? 'btn-outline' : ''}`} onClick={toggleFav} style={favBtnStyle} aria-label="Add to Favorites">
            {isFav ? '♥' : '♡'} <span className="btn-label">{isFav ? 'Favorited' : 'Favorite'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
