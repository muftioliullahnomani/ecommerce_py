import { useState } from 'react'
import { Link } from 'react-router-dom'
import { listOrdersByEmail, type Order } from '../api'

export default function OrderLookup() {
  const [email, setEmail] = useState('')
  const [orders, setOrders] = useState<Order[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const search = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setError(null)
    const em = email.trim()
    if (!em) { setError('Enter your email'); return }
    setLoading(true)
    try {
      const rows = await listOrdersByEmail(em)
      setOrders(rows)
    } catch (err: any) {
      setError(err?.message || 'Failed to load orders')
      setOrders(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <div className="section">
        <div className="section-header">
          <h2 className="section-title">Find your order</h2>
          <span className="section-sub">Check order status by email</span>
        </div>
        <form className="form-card" onSubmit={search}>
          {error && <div className="error" style={{ marginBottom: 10 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input className="input" type="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <button className="btn" type="submit" disabled={loading}>{loading ? 'Searching…' : 'Search'}</button>
          </div>
        </form>
        {orders && (
          <div className="form-card" style={{ marginTop: 12 }}>
            {orders.length === 0 && <div>No orders found for {email}</div>}
            {orders.length > 0 && (
              <div className="section-grid" style={{ gridTemplateColumns: 'repeat(1, minmax(200px, 1fr))' }}>
                {orders.map((o) => (
                  <div key={o.id} className="cart-row" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>Order #{o.id}</div>
                      <div style={{ color: '#6b7280', fontSize: 13 }}>Status: <b style={{ textTransform: 'capitalize' }}>{o.status}</b> · Total: ${o.total.toFixed(2)}</div>
                    </div>
                    <Link className="btn btn-outline" to={`/order/${o.id}`}>View</Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        <div style={{ marginTop: 12 }}>
          <Link className="btn btn-outline" to="/">Back to Home</Link>
        </div>
      </div>
    </div>
  )
}
