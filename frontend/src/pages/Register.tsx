import { useEffect, useState } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { apiRegister, apiLogin, apiMe } from '../api'

function useQuery() {
  const { search } = useLocation()
  return new URLSearchParams(search)
}

export default function Register() {
  const navigate = useNavigate()
  const q = useQuery()
  const redirect = q.get('redirect') || '/'

  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showPw1, setShowPw1] = useState(false)
  const [showPw2, setShowPw2] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('customer')
      if (raw) navigate(redirect, { replace: true })
    } catch {}
  }, [])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setError('Please enter a valid email')
      return
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    if (password !== password2) {
      setError('Passwords do not match')
      return
    }
    try {
      setLoading(true)
      const [first_name, ...rest] = (name || '').trim().split(' ')
      const last_name = rest.join(' ')
      await apiRegister({ email, password, first_name, last_name })
      // Auto-login after register
      await apiLogin({ email, password })
      const user = await apiMe().catch(() => null)
      const customer = user ? { email: user.email || email, name: user.first_name || name || undefined } : { email, name: name || undefined }
      try { localStorage.setItem('customer', JSON.stringify(customer)) } catch {}
      navigate(redirect, { replace: true })
    } catch (err: any) {
      setError(err?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">Create account</h2>
      </div>
      <form onSubmit={onSubmit} className="cart-items" style={{ maxWidth: 480, margin: '0 auto' }}>
        <div className="cart-row" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
          <input className="input" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="input" placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <div className="input-wrap">
            <input className="input" placeholder="Password" type={showPw1 ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button type="button" className="pw-toggle" aria-label={showPw1 ? 'Hide password' : 'Show password'} onClick={() => setShowPw1((v) => !v)}>{showPw1 ? '🙈' : '👁'}</button>
          </div>
          <div className="input-wrap">
            <input className="input" placeholder="Confirm password" type={showPw2 ? 'text' : 'password'} value={password2} onChange={(e) => setPassword2(e.target.value)} required />
            <button type="button" className="pw-toggle" aria-label={showPw2 ? 'Hide password' : 'Show password'} onClick={() => setShowPw2((v) => !v)}>{showPw2 ? '🙈' : '👁'}</button>
          </div>
          {error && <div style={{ color: '#b91c1c', fontSize: 13 }}>{error}</div>}
        </div>
        <button className="btn" type="submit" disabled={loading}>{loading ? 'Creating account...' : 'Create account'}</button>
        <div style={{ marginTop: 8, fontSize: 14 }}>
          Already have an account? <Link to={`/login?redirect=${encodeURIComponent(redirect)}`}>Login</Link>
        </div>
      </form>
    </div>
  )
}
