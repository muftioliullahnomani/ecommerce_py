import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getOrder, type Order } from '../api'

export default function OrderStatus() {
  const { id } = useParams()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    if (!id || !/^\d+$/.test(id)) {
      setError('Invalid order id')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const o = await getOrder(Number(id))
      setOrder(o)
    } catch (e: any) {
      setError(e?.message || 'Failed to load order')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  return (
    <div className="container">
      <div className="section">
        <div className="section-header">
          <h2 className="section-title">Order Status</h2>
          {order && <span className="section-sub">Order #{order.id}</span>}
        </div>
        <div className="form-card">
          {loading && <div>Loading...</div>}
          {error && <div className="error" style={{ marginBottom: 12 }}>{error}</div>}
          {order && !loading && (
            <div style={{ display: 'grid', gap: 12 }}>
              <div className="summary-row"><span>Status</span><strong style={{ textTransform: 'capitalize' }}>{order.status}</strong></div>
              <div className="summary-row"><span>Customer</span><span>{order.customer_name} &lt;{order.customer_email}&gt;</span></div>
              {order.address && <div className="summary-row"><span>Address</span><span>{order.address}</span></div>}
              <div className="summary-row"><span>Total</span><strong>${order.total.toFixed(2)}</strong></div>
              <div>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Items</div>
                <div className="section-grid" style={{ gridTemplateColumns: 'repeat(1, minmax(160px, 1fr))' }}>
                  {order.items.map((it) => (
                    <div key={it.id} className="cart-row" style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div>{it.product_name || `#${it.product}`}</div>
                      <div>x{it.quantity}</div>
                      <div>${it.price.toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn" onClick={load} disabled={loading}>Refresh</button>
            <Link className="btn btn-outline" to="/">Back to Home</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
