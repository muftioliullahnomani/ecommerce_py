import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { fetchHome } from '../api'
import type { HomeConfig } from '../api'

function readCartCount(): number {
  try {
    const raw = localStorage.getItem('cart')
    if (!raw) return 0
    const arr = JSON.parse(raw) as number[]
    return Array.from(new Set(arr)).length
  } catch {
    return 0
  }
}

export default function FloatingCart() {
  const [count, setCount] = useState<number>(readCartCount())
  const loc = useLocation()
  const [cfg, setCfg] = useState<HomeConfig | null>(null)

  useEffect(() => {
    // Update on route change
    setCount(readCartCount())
  }, [loc.pathname])

  useEffect(() => {
    // Polling to catch same-tab localStorage changes
    const id = setInterval(() => {
      setCount((prev) => {
        const next = readCartCount()
        return next !== prev ? next : prev
      })
    }, 800)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    // Fetch site styling config
    fetchHome().then(setCfg).catch(() => setCfg(null))
  }, [])

  if (count <= 0) return null

  const posLeft = cfg?.floating_cart_position === 'bl'
  const style: React.CSSProperties = {
    background: cfg?.floating_cart_bg || undefined,
    color: cfg?.floating_cart_text || undefined,
    borderColor: cfg?.floating_cart_border || undefined,
    borderRadius: cfg?.floating_cart_radius != null ? cfg.floating_cart_radius : undefined,
    left: posLeft ? 20 : undefined,
    right: posLeft ? undefined : 20,
  }

  return (
    <Link to="/cart" className={`floating-cart${posLeft ? ' left' : ''}`} aria-label={`Open cart with ${count} item${count>1?'s':''}`} style={style}>
      <span className="floating-cart-icon">🛒</span>
      <span className="floating-cart-text">Cart</span>
      <span className="floating-cart-badge">{count}</span>
    </Link>
  )
}
