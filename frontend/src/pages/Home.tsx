import { useEffect, useRef, useState } from 'react'
import { fetchProducts, fetchCategoryTree, fetchHome, type Category, type FetchProductsParams, type HomeConfig, type Carousel } from '../api'
import type { Product } from '../types'
import ProductCard from '../components/ProductCard'
import CategoryTree from '../components/CategoryTree'

type Ordering = 'newest' | 'oldest' | 'price_asc' | 'price_desc'

export default function Home() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
  const [minPrice, setMinPrice] = useState<string>('')
  const [maxPrice, setMaxPrice] = useState<string>('')
  const [ordering, setOrdering] = useState<Ordering>('newest')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [home, setHome] = useState<HomeConfig | null>(null)
  const [slideIndex, setSlideIndex] = useState(0)

  useEffect(() => {
    setLoading(true)
    const params: FetchProductsParams = {}
    if (q) params.q = q
    if (selectedCategory != null) params.category_id = selectedCategory
    if (minPrice) params.min_price = Number(minPrice)
    if (maxPrice) params.max_price = Number(maxPrice)
    params.ordering = ordering
    fetchProducts(params)
      .then(setProducts)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [q, selectedCategory, minPrice, maxPrice, ordering])

  useEffect(() => {
    fetchCategoryTree().then(setCategories).catch(() => {})
  }, [])

  useEffect(() => {
    fetchHome().then(setHome).catch(() => setHome(null))
  }, [])

  // Per-carousel animated view
  function CarouselView({ carousel }: { carousel: Carousel }) {
    const ref = useRef<HTMLDivElement | null>(null)
    const [pageIdx, setPageIdx] = useState(0)
    const [perView, setPerView] = useState(1)
    // responsive perView: 1 (mobile), 2 (sm), 3 (lg+) unless single slider
    useEffect(() => {
      if (carousel.single_slider) {
        setPerView(1)
        return
      }
      const calc = () => {
        const w = window.innerWidth
        if (w >= 1024) setPerView(3)
        else if (w >= 640) setPerView(2)
        else setPerView(1)
      }
      calc()
      window.addEventListener('resize', calc)
      return () => window.removeEventListener('resize', calc)
    }, [carousel.single_slider])
    useEffect(() => {
      if (!carousel || !carousel.slides || carousel.slides.length <= 1) return
      const anim = carousel.animation || 'slide'
      const speed = Math.max(1000, carousel.speed_ms || 3000)
      let timer: any
      if (anim !== 'none') {
        timer = setInterval(() => {
          setPageIdx((prev) => {
            const pages = Math.max(1, Math.ceil((carousel.slides?.length || 0) / perView))
            return (prev + 1) % pages
          })
        }, speed)
      }
      return () => timer && clearInterval(timer)
    }, [carousel, perView])

    // Scroll when pageIdx changes for sliding variants
    useEffect(() => {
      const anim = carousel.animation || 'slide'
      if (anim === 'slide' || anim === 'slide_fade' || anim === 'fade' || anim === 'zoom_in' || anim === 'zoom_out' || anim === 'skew' || anim === 'kenburns') {
        const el = ref.current
        if (el) {
          const w = el.clientWidth
          try {
            el.scrollTo({ left: pageIdx * w, behavior: 'smooth' })
          } catch {
            el.scrollLeft = pageIdx * w
          }
        }
      }
    }, [pageIdx, carousel])

    const totalSlides = (carousel.slides || []).length
    const pages = Math.max(1, Math.ceil(totalSlides / perView))
    const goTo = (i: number) => {
      if (pages <= 0) return
      const next = ((i % pages) + pages) % pages
      setPageIdx(next)
    }
    const prev = () => goTo(pageIdx - 1)
    const next = () => goTo(pageIdx + 1)

    if (!carousel.slides || carousel.slides.length === 0) return null
    const anim = carousel.animation || 'slide'
    const withFade = anim === 'slide_fade'
    const effectClass = (
      anim === 'zoom_in' ? ' effect-zoom_in'
      : anim === 'zoom_out' ? ' effect-zoom_out'
      : anim === 'skew' ? ' effect-skew'
      : anim === 'kenburns' ? ' effect-kenburns'
      : ''
    )
    const animDur = Math.max(1, Math.round((carousel.speed_ms || 3000) / 1000))
    return (
      <div className={"carousel" + (carousel.single_slider ? ' single' : '') + effectClass} role="region" aria-label={carousel.title || 'Carousel'} style={carousel.single_slider ? { overflow: 'hidden', height: carousel.slider_height_px || 360, ['--animDur' as any]: animDur + 's' } : (effectClass ? { ['--animDur' as any]: animDur + 's' } : undefined)}>
        <div
          className={"carousel-track" + (withFade ? ' with-fade' : '') + ` pv-${perView}`}
          ref={ref}
          style={{ gridAutoColumns: `${100 / perView}%`, ...(carousel.single_slider ? { gap: 0, padding: 0, height: (carousel.slider_height_px || 360) + 'px' } : {}) }}
        >
          {carousel.slides.map((it, i) => {
            const start = pageIdx * perView
            const end = start + perView
            const isActive = i >= start && i < end
            return (
              <a key={it.id} className={"carousel-item" + (isActive ? ' active' : '')} href={it.link_url || '#'}>
                <img src={it.image_url} alt={it.title || 'Slide'} style={carousel.single_slider ? { height: carousel.slider_height_px || 360, objectFit: 'cover', width: '100%' } : undefined} />
                {it.title && <div className="carousel-caption">{it.title}</div>}
              </a>
            )
          })}
        </div>
        {pages > 1 && (
          <>
            <div className="carousel-nav">
              <button className="carousel-btn" aria-label="Previous" onClick={prev}>‹</button>
              <button className="carousel-btn" aria-label="Next" onClick={next}>›</button>
            </div>
            <div className="carousel-dots">
              {Array.from({ length: pages }).map((_, i) => (
                <span key={i} className={"dot" + (i === pageIdx ? ' active' : '')} onClick={() => goTo(i)} />
              ))}
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="container">
      <div className="layout">
      <aside className="sidebar">
        <CategoryTree
          tree={categories}
          onSelect={(id) => setSelectedCategory(id)}
          onClear={() => setSelectedCategory(null)}
        />
        <div className="price-filter">
          <div className="tree-title">Price</div>
          <div className="price-grid">
            <input
              className="input-sm"
              type="number"
              placeholder="Min"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
            />
            <input
              className="input-sm"
              type="number"
              placeholder="Max"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
            />
          </div>
        </div>
        <div className="price-filter">
          <div className="tree-title">Sort</div>
          <select className="input-sm" value={ordering} onChange={(e) => setOrdering(e.target.value as Ordering)}>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="price_asc">Low to High</option>
            <option value="price_desc">High to Low</option>
          </select>
        </div>
      </aside>
      <main className="content">
        <div className="toolbar">
          <input
            placeholder="Search products..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        {home && (
          <div className="home-config">
            <div className="sections">
              {[
                ...home.sections.map((s) => ({ type: 'section', data: s, order: (s as any).order })),
                ...((home.carousel_sections || []).map((cs: any) => ({ type: 'carousel', data: cs.carousel, order: cs.order }))),
                { type: 'main', data: null, order: home.home_order } as any,
              ]
                .sort((a: any, b: any) => ((a.order ?? 9999) - (b.order ?? 9999)))
                .map((item: any, idx: number) => {
                  if (item.type === 'main') {
                    return (
                      <section key={`main-${idx}`} className="section">
                        <div className="section-header">
                          <h2 className="section-title">Products</h2>
                        </div>
                        <div className="section-grid" style={{ gridTemplateColumns: `repeat(${Math.max(1, home.home_columns || 1)}, minmax(160px, 1fr))` }}>
                          {products
                            .slice(0, home.home_product_limit || products.length)
                            .map((p) => (
                              <ProductCard key={p.id} product={p} />
                            ))}
                        </div>
                      </section>
                    )
                  }
                  if (item.type === 'carousel') {
                    const c = item.data
                    return (
                      <section key={`carousel-${c.id}`} className="section">
                        {c.title && (
                          <div className="section-header">
                            <h2 className="section-title">{c.title}</h2>
                          </div>
                        )}
                        <CarouselView carousel={c} />
                      </section>
                    )
                  }
                  const sec = item.data as any
                  return (
                    <section key={sec.id} className="section">
                      <div className="section-header">
                        <h2 className="section-title">{sec.title}</h2>
                        {sec.kind === 'category' && sec.category_name && (
                          <span className="section-sub">{sec.category_name}</span>
                        )}
                      </div>
                      <div className="section-grid" style={{ gridTemplateColumns: `repeat(${Math.max(1, sec.columns || 1)}, minmax(160px, 1fr))` }}>
                        {sec.products.map((p: Product) => (
                          <ProductCard key={p.id} product={p} />
                        ))}
                      </div>
                    </section>
                  )
                })}
            </div>
          </div>
        )}
        <div className="toolbar">
          <input
            placeholder="Search products..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        {loading && <div>Loading...</div>}
        {error && <div className="error">{error}</div>}
        {!home && (
          <div className="grid">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </main>
      </div>
    </div>
  )
}
