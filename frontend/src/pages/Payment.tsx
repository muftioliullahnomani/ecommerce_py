import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { fetchProduct, getOrder, updateOrder, fetchPaymentSetting, type PaymentSetting, fetchPaymentGateways, type PaymentGateway } from '../api'
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

export default function Payment() {
  const [ids] = useState<number[]>(readCartIds())
  const [items, setItems] = useState<Product[]>([])
  const [orderId, setOrderId] = useState<number | null>(null)
  const [orderTotal, setOrderTotal] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [ps, setPs] = useState<PaymentSetting | null>(null)
  const [gateways, setGateways] = useState<PaymentGateway[]>([])
  const [gwCode, setGwCode] = useState<string | null>(null)
  const [customer, setCustomer] = useState<{email:string,name?:string}|null>(null)
  const navigate = useNavigate()
  const loc = useLocation()

  useEffect(() => {
    fetchPaymentSetting().then(setPs).catch(() => setPs(null))
    fetchPaymentGateways().then((gs) => { setGateways(gs); if (gs.length) setGwCode(gs[0].code) }).catch(() => setGateways([]))
    const params = new URLSearchParams(loc.search)
    const idStr = params.get('order')
    if (idStr && /^\d+$/.test(idStr)) {
      const oid = Number(idStr)
      setOrderId(oid)
      getOrder(oid)
        .then((o) => setOrderTotal(Number(o.total)))
        .catch(() => setOrderTotal(null))
        .finally(() => setLoading(false))
    } else {
      // Fallback: compute from cart
      const unique = Array.from(new Set(ids))
      Promise.all(unique.map((id) => fetchProduct(id)))
        .then(setItems)
        .catch(() => setItems([]))
        .finally(() => setLoading(false))
    }
  }, [loc.search])

  useEffect(() => {
    try { setCustomer(localStorage.getItem('customer') ? JSON.parse(localStorage.getItem('customer') as string) : null) } catch {}
  }, [])

  useEffect(() => {
    if (ps?.require_login && !customer) {
      navigate(`/login?redirect=${encodeURIComponent(loc.pathname + loc.search)}`, { replace: true })
    }
  }, [ps, customer])

  const total = useMemo(() => {
    if (orderTotal != null) return orderTotal
    return items.reduce((sum, p) => sum + (Number(p.price) || 0), 0)
  }, [orderTotal, items])

  const pay = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSubmitting(true)
      if (orderId != null) {
        await updateOrder(orderId, { status: 'paid' })
      }
      localStorage.setItem('cart', JSON.stringify([]))
      navigate('/', { replace: true })
      alert(ps?.success_message || 'Payment successful! Thank you for your order.')
    } catch (err) {
      // no-op
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <div className="stepper">
        <div className="step">
          <span className="step-icon">✔</span>
          <span className="step-text">Added to Cart</span>
        </div>
        <div className="step-sep" />
        <div className="step">
          <span className="step-icon">✔</span>
          <span className="step-text">Checkout</span>
        </div>
        <div className="step-sep" />
        <div className="step step-active">
          <span className="step-icon">✔</span>
          <span className="step-text">Payment</span>
        </div>
      </div>

      <div className="section-header">
        <h2 className="section-title">{ps?.title || 'Payment'}</h2>
        <span className="section-sub">{loading ? 'Calculating…' : `Total $${total.toFixed(2)}`}</span>
      </div>

      <div className="cart-grid">
        <form onSubmit={pay} className="cart-items" style={{ alignSelf: 'start' }}>
          <div className="cart-row" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
            <h3 style={{ margin: 0 }}>Card details</h3>
            <input className="input" placeholder="Cardholder name" required />
            <input className="input" placeholder="Card number" inputMode="numeric" required />
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="input" placeholder="MM/YY" required />
              <input className="input" placeholder="CVC" required />
            </div>
            {gateways.length > 0 && (
              <div>
                <div style={{ fontWeight: 700, marginTop: 4, marginBottom: 6 }}>Payment method</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {gateways.map(g => (
                    <label key={g.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: '1px solid #e5e7eb', borderRadius: 8, padding: '6px 10px', background: gwCode === g.code ? '#eff6ff' : '#fff' }}>
                      <input type="radio" name="gateway" value={g.code} checked={gwCode === g.code} onChange={() => setGwCode(g.code)} />
                      <span>{g.display_name || g.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button className="btn" type="submit" disabled={submitting || loading}>{submitting ? 'Processing…' : `${(gateways.find(g=>g.code===gwCode)?.button_label || ps?.button_label || 'Pay')} $${total.toFixed(2)}`}</button>
          <Link to="/checkout" className="btn btn-outline" style={{ textDecoration: 'none' }}>Back to Checkout</Link>
        </form>

        <div className="cart-summary">
          <div className="summary-row"><span>Items</span><span>{items.length}</span></div>
          <div className="summary-row"><span>Total</span><strong>${total.toFixed(2)}</strong></div>
          <div style={{ fontSize: 12, color: '#64748b' }}>{ps?.description || 'Demo payment form. Integrate your gateway later.'}</div>
        </div>
      </div>
    </div>
  )
}
