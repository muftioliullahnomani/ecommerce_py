import { Outlet, Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { fetchHome, type HomeConfig } from './api'
import FloatingCart from './components/FloatingCart'

export default function App() {
  const [home, setHome] = useState<HomeConfig | null>(null)

  useEffect(() => {
    fetchHome().then(setHome).catch(() => setHome(null))
  }, [])

  const items = home?.primary_menu?.items || []
  const navStyle: React.CSSProperties = {
    // Apply CSS variables for menu styling if provided
    ...(home?.menu_bg_color ? { ['--menu-bg' as any]: home.menu_bg_color } : {}),
    ...(home?.menu_text_color ? { ['--menu-text' as any]: home.menu_text_color } : {}),
    ...(home?.menu_hover_bg_color ? { ['--menu-hover-bg' as any]: home.menu_hover_bg_color } : {}),
    ...(home?.menu_hover_text_color ? { ['--menu-hover-text' as any]: home.menu_hover_text_color } : {}),
    ...(home?.menu_link_gap_px != null ? { ['--menu-gap' as any]: `${home.menu_link_gap_px}px` } : {}),
    ...(home?.menu_radius_px != null ? { ['--menu-radius' as any]: `${home.menu_radius_px}px` } : {}),
  }

  return (
    <div className="container">
      <header className="header">
        <Link to="/" className="logo">Ecommerce</Link>
        {items.length > 0 && (
          home?.menu_card_enabled ? (
            <div
              style={{
                background: home.menu_card_bg_color || undefined,
                border: home.menu_card_border_color ? `${home.menu_card_border_px ?? 1}px solid ${home.menu_card_border_color}` : undefined,
                padding: `${home.menu_card_padding_px ?? 8}px`,
                borderRadius: `${home.menu_card_radius_px ?? 12}px`,
                boxShadow: home.menu_card_shadow ? '0 6px 18px rgba(0,0,0,.06)' : undefined,
              }}
            >
              <nav className="header-nav" style={navStyle}>
                {items.sort((a, b) => (a.order || 0) - (b.order || 0)).map(it => {
                  const isInternal = it.url && it.url.startsWith('/')
                  return isInternal ? (
                    <Link key={it.id} to={it.url} className="nav-link">{it.label}</Link>
                  ) : (
                    <a key={it.id} href={it.url || '#'} className="nav-link">{it.label}</a>
                  )
                })}
              </nav>
            </div>
          ) : (
            <nav className="header-nav" style={navStyle}>
              {items.sort((a, b) => (a.order || 0) - (b.order || 0)).map(it => {
                const isInternal = it.url && it.url.startsWith('/')
                return isInternal ? (
                  <Link key={it.id} to={it.url} className="nav-link">{it.label}</Link>
                ) : (
                  <a key={it.id} href={it.url || '#'} className="nav-link">{it.label}</a>
                )
              })}
            </nav>
          )
        )}
      </header>
      <main className="main">
        <Outlet />
      </main>
      <FloatingCart />
      <footer className="footer">© {new Date().getFullYear()} Ecommerce</footer>
    </div>
  )
}
