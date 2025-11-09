import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { fetchProduct, createOrder } from '../api'
import type { Product } from '../types'

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

export default function Checkout() {
  const [ids, setIds] = useState<number[]>(readCartIds())
  const [items, setItems] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const [customer, setCustomer] = useState<{email:string,name?:string}|null>(null)

  useEffect(() => {
    setLoading(true)
    const uniqueIds = Array.from(new Set(ids))
    Promise.all(uniqueIds.map((id) => fetchProduct(id)))
      .then((prods) => setItems(prods))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [ids])

  useEffect(() => {
    try {
      const raw = localStorage.getItem('customer')
      setCustomer(raw ? JSON.parse(raw) : null)
    } catch { setCustomer(null) }
  }, [])

  const subtotal = useMemo(() => items.reduce((sum, p) => sum + (Number(p.price) || 0), 0), [items])
  const shipping = useMemo(() => (items.length > 0 ? 0 : 0), [items])
  const total = subtotal + shipping

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [postal, setPostal] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [orderError, setOrderError] = useState<string | null>(null)

  useEffect(() => {
    if (customer) {
      setEmail(customer.email || '')
      setName(customer.name || '')
    }
  }, [customer])

  const placeOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (items.length === 0) return
    try {
      setSubmitting(true)
      setOrderError(null)
      const order = await createOrder({
        customer_name: name || email,
        customer_email: email,
        customer_phone: phone || undefined,
        address: address || undefined,
        city: city || undefined,
        postal_code: postal || undefined,
        items: items.map((p) => ({ product: p.id, quantity: 1, price: Number(p.price) })),
      })
      navigate(`/payment?order=${order.id}`, { replace: true })
    } catch (err: any) {
      setOrderError(err?.message || 'Failed to create order. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div>Loading checkout...</div>

  return (
    <div>
      <div className="stepper">
        <div className="step">
          <span className="step-icon">{items.length > 0 ? '✔' : '1'}</span>
          <span className="step-text">Added to Cart</span>
        </div>
        <div className="step-sep" />
        <div className="step step-active">
          <span className="step-icon">✔</span>
          <span className="step-text">Checkout</span>
        </div>
        <div className="step-sep" />
        <div className="step">
          <span className="step-icon">3</span>
          <span className="step-text">Payment</span>
        </div>
      </div>

      <div className="section-header">
        <h2 className="section-title">Checkout</h2>
        <span className="section-sub">{items.length} item(s)</span>
      </div>

      {!customer ? (
        <div className="form-card notice-card" style={{ marginBottom: 12 }}>
          <div>
            <div className="notice-title">Checkout faster by logging in</div>
            <div className="notice-text">Your details will be prefilled and orders saved to your account.</div>
          </div>
          <Link to={`/login?redirect=${encodeURIComponent('/checkout')}`} className="btn btn-outline" style={{ textDecoration: 'none' }}>Login</Link>
        </div>
      ) : (
        <div className="form-card notice-card" style={{ marginBottom: 12 }}>
          <div className="notice-text">Signed in as <strong style={{ color: 'inherit' }}>{customer.name || customer.email}</strong></div>
          <button className="btn btn-sm btn-outline" onClick={() => { localStorage.removeItem('customer'); setCustomer(null) }}>Logout</button>
        </div>
      )}

      {items.length === 0 ? (
        <div>
          <p>Your cart is empty.</p>
          <Link to="/" className="btn" style={{ textDecoration: 'none' }}>Go shopping</Link>
        </div>
      ) : (
        <div className="cart-grid">
          <form onSubmit={placeOrder} className="cart-items form-card checkout-form" style={{ alignSelf: 'start' }}>
            <h3 style={{ margin: 0 }}>Customer details</h3>
            <input className="input" placeholder="Full name" value={name} onChange={(e)=>setName(e.target.value)} required />
            <input className="input" placeholder="Email" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required />
            <input className="input" placeholder="Phone" value={phone} onChange={(e)=>setPhone(e.target.value)} />
            <input className="input" placeholder="Address" value={address} onChange={(e)=>setAddress(e.target.value)} />
            <div className="checkout-two-col">
              <input className="input" placeholder="City" value={city} onChange={(e)=>setCity(e.target.value)} />
              <input className="input" placeholder="Postal code" value={postal} onChange={(e)=>setPostal(e.target.value)} />
            </div>
            <div className="checkout-actions">
              <div>
                <Link to="/cart" className="btn btn-outline" style={{ textDecoration: 'none' }}>Back to Cart</Link>
              </div>
              <div>
                <button className="btn" type="submit" disabled={submitting}>{submitting ? 'Creating order...' : 'Continue to Payment'}</button>
              </div>
            </div>
            {orderError && <div style={{ color: '#b91c1c', fontSize: 13, marginTop: 6 }}>{orderError}</div>}
          </form>

          <div className="cart-summary form-card">
            <div className="summary-row"><span>Subtotal</span><strong>${subtotal.toFixed(2)}</strong></div>
            <div className="summary-row"><span>Shipping</span><span>{shipping === 0 ? 'Free' : `$${shipping.toFixed(2)}`}</span></div>
            <div className="summary-row"><span>Total</span><strong>${total.toFixed(2)}</strong></div>
            <div style={{ height: 1, background: '#e5e7eb', margin: '8px 0' }} />
            <div style={{ display: 'grid', gap: 8 }}>
              {items.map((p) => (
                <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '48px 1fr auto', gap: 8, alignItems: 'center' }}>
                  <img src={p.image_url} alt={p.name} style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover' }} />
                  <div style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                  <div style={{ fontWeight: 700, color: 'var(--primary)' }}>${Number(p.price).toFixed(2)}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12, color: '#64748b' }}>You will enter payment details on the next step.</div>
          </div>
        </div>
      )}
    </div>
  )
}
