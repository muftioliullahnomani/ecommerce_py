import { useEffect, useMemo, useState } from 'react'
import { fetchProduct } from '../api'
import type { Product } from '../types'
import { Link } from 'react-router-dom'

function readCartIds(): number[] {
  try {
    const raw = localStorage.getItem('cart')
    if (!raw) return []
    const arr = JSON.parse(raw) as number[]
    return Array.from(new Set(arr))
  } catch {
    return []
  }
}

function writeCartIds(ids: number[]) {
  localStorage.setItem('cart', JSON.stringify(Array.from(new Set(ids))))
}

export default function Cart() {
  const [ids, setIds] = useState<number[]>(readCartIds())
  const [items, setItems] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    const uniqueIds = Array.from(new Set(ids))
    Promise.all(uniqueIds.map((id) => fetchProduct(id)))
      .then((prods) => setItems(prods))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [ids])

  const total = useMemo(() => items.reduce((sum, p) => sum + (Number(p.price) || 0), 0), [items])

  const remove = (id: number) => {
    const next = ids.filter((x) => x !== id)
    setIds(next)
    writeCartIds(next)
  }

  const clear = () => {
    setIds([])
    writeCartIds([])
  }

  if (loading) return <div>Loading cart...</div>

  return (
    <div>
      <div className="stepper">
        <div className="step step-active">
          <span className="step-icon">✔</span>
          <span className="step-text">Added to Cart</span>
        </div>
        <div className="step-sep" />
        <div className="step">
          <span className="step-icon">2</span>
          <span className="step-text">Checkout</span>
        </div>
        <div className="step-sep" />
        <div className="step">
          <span className="step-icon">3</span>
          <span className="step-text">Payment</span>
        </div>
      </div>
      <div className="section-header">
        <h2 className="section-title">Your Cart</h2>
        <span className="section-sub">{items.length} item(s)</span>
      </div>
      {items.length === 0 ? (
        <div>
          <p>Your cart is empty.</p>
          <Link to="/" className="btn" style={{ textDecoration: 'none' }}>Go shopping</Link>
        </div>
      ) : (
        <div className="cart-grid">
          <div className="cart-items">
            {items.map((p) => (
              <div key={p.id} className="cart-row">
                <Link to={`/product/${p.id}`} className="cart-thumb-link">
                  <img src={p.image_url} alt={p.name} className="cart-thumb" />
                </Link>
                <div className="cart-info">
                  <Link to={`/product/${p.id}`} className="cart-title">{p.name}</Link>
                  <div className="cart-price">${Number(p.price).toFixed(2)}</div>
                </div>
                <button className="btn btn-sm btn-outline" onClick={() => remove(p.id)}>Remove</button>
              </div>
            ))}
            <button className="btn btn-outline" onClick={clear}>Clear cart</button>
          </div>
          <div className="cart-summary">
            <div className="summary-row"><span>Subtotal</span><strong>${total.toFixed(2)}</strong></div>
            <div className="summary-row"><span>Shipping</span><span>Calculated at checkout</span></div>
            <Link to="/checkout" className="btn" style={{ width: '100%', textDecoration: 'none' }}>Checkout</Link>
          </div>
        </div>
      )}
    </div>
  )
}
