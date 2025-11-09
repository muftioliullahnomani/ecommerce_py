import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { apiLogin, apiMe } from '../api'

function useQuery() {
  const { search } = useLocation()
  return new URLSearchParams(search)
}

export default function Login() {
  const navigate = useNavigate()
  const q = useQuery()
  const redirect = q.get('redirect') || '/'

  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // If already logged in, redirect
    try {
      const raw = localStorage.getItem('customer')
      if (raw) {
        navigate(redirect, { replace: true })
      }
    } catch {}
  }, [])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setError('Please enter a valid email')
      return
    }
    if (!password) {
      setError('Please enter your password')
      return
    }
    try {
      setLoading(true)
      await apiLogin({ email, password })
      // fetch user profile
      const user = await apiMe().catch(() => null)
      const customer = user ? { email: user.email || email, name: user.first_name || name || undefined } : { email, name: name || undefined }
      try { localStorage.setItem('customer', JSON.stringify(customer)) } catch {}
      navigate(redirect, { replace: true })
    } catch (err: any) {
      setError(err?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">Login</h2>
      </div>
      <form onSubmit={onSubmit} className="cart-items" style={{ maxWidth: 480, margin: '0 auto' }}>
        <div className="cart-row" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
          <input className="input" placeholder="Name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="input" placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <div className="input-wrap">
            <input className="input" placeholder="Password" type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button type="button" className="pw-toggle" aria-label={showPw ? 'Hide password' : 'Show password'} onClick={() => setShowPw((v) => !v)}>{showPw ? '🙈' : '👁'}</button>
          </div>
          {error && <div style={{ color: '#b91c1c', fontSize: 13 }}>{error}</div>}
        </div>
        <button className="btn" type="submit" disabled={loading}>{loading ? 'Logging in...' : 'Login'}</button>
        <div style={{ marginTop: 8, fontSize: 14 }}>
          New here? <a href={`/register?redirect=${encodeURIComponent(redirect)}`}>Create an account</a>
        </div>
      </form>
    </div>
  )
}
