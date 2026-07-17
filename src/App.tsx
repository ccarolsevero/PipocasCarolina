import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import {
  ArrowRight, Check, ChevronRight, Clock3, Gift, LockKeyhole, LogOut, Mail,
  MapPin, Menu, MessageCircle, Minus, PackageCheck, PartyPopper, Plus, RefreshCw, Search, ShoppingBag,
  Sparkles, Trash2, UserRound, Wheat, X,
} from 'lucide-react'
import {
  adjustAdminStock,
  adminLogin,
  adminLogout,
  createExpense,
  createOrder,
  fetchAdminCustomers,
  fetchAdminOrders,
  fetchAdminProducts,
  fetchAdminSession,
  fetchAdminSummary,
  fetchExpenses,
  fetchInventoryMovements,
  fetchOrders,
  fetchProducts,
  registerCustomer,
  saveAdminProduct,
  uploadAdminProductImage,
  updateAdminOrderStatus,
  updateAdminPaymentStatus,
} from './api'
import type {
  AdminOrder, AdminSummary, CatalogProduct, Customer, Expense, InventoryMovement, Order,
} from './api'
import './App.css'

type OptionChoice = { label: string; price?: number }

type OptionGroup = {
  id: string
  label: string
  type: 'single' | 'multi'
  choices: OptionChoice[]
  min?: number
  max?: number
  /** When set, selected choice.price replaces the product base price */
  priceMode?: 'replace'
}

type Product = {
  id: number
  name: string
  description: string
  price: number
  category: string
  unit: string
  image: string
  tag?: string
  minQuantity?: number
  options?: OptionGroup[]
}

type CartItem = Product & {
  quantity: number
  cartKey: string
  selectedOptions: Record<string, string[]>
  optionsLabel: string
  price: number
}

const SHIPPING = 8

const FLAVORS = [
  'Ninho', 'Nesquik', 'Nutella', 'Milho Verde', 'Pé de Moleque',
  'Ovomaltine', 'Caramelo', 'Doritos', 'Paçoca', 'Churros',
]

const FILLINGS = ['KitKat', 'Creme', 'Ovomaltine', 'Nutella']

const flavorChoices = FLAVORS.map((label) => ({ label }))
const fillingChoices = FILLINGS.map((label) => ({ label }))

const fallbackProducts: Product[] = [
  {
    id: 1,
    name: 'Pipoca Gourmet',
    description: 'Escolha o tamanho e o sabor. Pipoca caramelizada artesanal.',
    price: 17,
    category: 'Tamanhos',
    unit: 'unidade',
    tag: 'Mais pedida',
    image: 'https://images.unsplash.com/photo-1585647347483-22b66260dfff?auto=format&fit=crop&w=700&q=85',
    options: [
      {
        id: 'size',
        label: 'Tamanho',
        type: 'single',
        priceMode: 'replace',
        choices: [
          { label: '100g', price: 17 },
          { label: '150g', price: 22 },
        ],
      },
      { id: 'flavor', label: 'Sabor', type: 'single', choices: flavorChoices },
    ],
  },
  {
    id: 2,
    name: 'Copo Gourmet',
    description: 'Copo de pipoca caramelizada. Com ou sem Nutella.',
    price: 17,
    category: 'Copos',
    unit: 'unidade',
    tag: 'Queridinho',
    image: 'https://images.unsplash.com/photo-1519869325930-281384150729?auto=format&fit=crop&w=700&q=85',
    options: [
      {
        id: 'type',
        label: 'Tipo',
        type: 'single',
        priceMode: 'replace',
        choices: [
          { label: 'Sem Nutella', price: 17 },
          { label: 'Com Nutella', price: 25 },
        ],
      },
      { id: 'flavor', label: 'Sabor da pipoca', type: 'single', choices: flavorChoices },
    ],
  },
  {
    id: 3,
    name: 'Kit Degustação',
    description: '5 sabores de 30g cada para experimentar várias combinações.',
    price: 25,
    category: 'Kits',
    unit: 'kit',
    tag: 'Degustação',
    image: 'https://images.unsplash.com/photo-1582169296194-e4d644c48063?auto=format&fit=crop&w=700&q=85',
    options: [
      { id: 'flavors', label: 'Escolha 5 sabores', type: 'multi', min: 5, max: 5, choices: flavorChoices },
    ],
  },
  {
    id: 4,
    name: 'Caixa Presente',
    description: 'Caixa com 2 sabores. Perfeita para presentear.',
    price: 30,
    category: 'Presentes',
    unit: 'caixa',
    image: 'https://images.unsplash.com/photo-1576618148400-f54bed99fcfd?auto=format&fit=crop&w=700&q=85',
    options: [
      { id: 'flavors', label: 'Escolha 2 sabores', type: 'multi', min: 2, max: 2, choices: flavorChoices },
    ],
  },
  {
    id: 5,
    name: 'Petisqueira',
    description: 'Monte sua petisqueira com os sabores favoritos.',
    price: 45,
    category: 'Petisqueiras',
    unit: 'unidade',
    tag: 'Família',
    image: 'https://images.unsplash.com/photo-1582293041079-7814c2f12063?auto=format&fit=crop&w=700&q=85',
    options: [
      {
        id: 'size',
        label: 'Tamanho',
        type: 'single',
        priceMode: 'replace',
        choices: [
          { label: 'Pequena (4 sabores)', price: 45 },
          { label: 'Grande (5 sabores)', price: 60 },
        ],
      },
      { id: 'flavors', label: 'Sabores', type: 'multi', min: 4, max: 5, choices: flavorChoices },
    ],
  },
  {
    id: 6,
    name: 'Balde Caramelizado',
    description: 'Pipoca caramelizada com recheios especiais. Escolha até 2 recheios.',
    price: 45,
    category: 'Baldes',
    unit: 'balde',
    tag: 'Novo',
    image: 'https://images.unsplash.com/photo-1563302111-eab4b145e6c9?auto=format&fit=crop&w=700&q=85',
    options: [
      {
        id: 'size',
        label: 'Tamanho',
        type: 'single',
        priceMode: 'replace',
        choices: [
          { label: '1L', price: 45 },
          { label: '1,5L', price: 55 },
        ],
      },
      { id: 'fillings', label: 'Recheios (até 2)', type: 'multi', min: 1, max: 2, choices: fillingChoices },
    ],
  },
  {
    id: 7,
    name: 'Por Kilo',
    description: 'Pegue e monte. 1kg rende cerca de 33 saquinhos. Ideal para festas.',
    price: 170,
    category: 'Festas',
    unit: '1 kg',
    image: 'https://images.unsplash.com/photo-1582169296194-e4d644c48063?auto=format&fit=crop&w=700&q=85',
    options: [
      { id: 'flavors', label: 'Sabores desejados', type: 'multi', min: 1, max: 10, choices: flavorChoices },
    ],
  },
  {
    id: 8,
    name: 'Saquinho Personalizado',
    description: 'Lembrancinha com cor, laço e adesivos. Pedido mínimo: 20 unidades.',
    price: 7,
    category: 'Festas',
    unit: 'unidade',
    tag: 'Festa',
    minQuantity: 20,
    image: 'https://images.unsplash.com/photo-1576618148400-f54bed99fcfd?auto=format&fit=crop&w=700&q=85',
    options: [
      {
        id: 'size',
        label: 'Gramatura',
        type: 'single',
        priceMode: 'replace',
        choices: [
          { label: '30g', price: 7 },
          { label: '50g', price: 8 },
          { label: '60g', price: 9 },
        ],
      },
      { id: 'flavor', label: 'Sabor', type: 'single', choices: flavorChoices },
    ],
  },
]

function buildOptionsLabel(product: Product, selected: Record<string, string[]>) {
  if (!product.options?.length) return ''
  return product.options
    .map((group) => {
      const values = selected[group.id] || []
      if (!values.length) return null
      return `${group.label}: ${values.join(', ')}`
    })
    .filter(Boolean)
    .join(' · ')
}

function resolvePrice(product: Product, selected: Record<string, string[]>) {
  let price = product.price
  for (const group of product.options || []) {
    if (group.priceMode !== 'replace') continue
    const chosen = selected[group.id]?.[0]
    const match = group.choices.find((choice) => choice.label === chosen)
    if (match?.price != null) price = match.price
  }
  return price
}

function makeCartKey(productId: number, selected: Record<string, string[]>) {
  return `${productId}::${JSON.stringify(selected)}`
}

function requiredFlavorCount(product: Product, selected: Record<string, string[]>) {
  if (product.id !== 5) return null
  const size = selected.size?.[0] || ''
  return size.includes('Grande') ? 5 : 4
}

const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const statusLabel: Record<Order['status'], string> = {
  confirmado: 'Confirmado',
  preparando: 'Em preparo',
  entregando: 'Saiu para entrega',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
}

function Logo() {
  return (
    <button className="logo" onClick={() => { location.hash = 'inicio' }} aria-label="Pipocas Carolina - início">
      <img src="/logo-navbar.png" alt="Pipocas Carolinas — Pipocas Gourmet" />
    </button>
  )
}

function InstagramIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
      <circle cx="17.4" cy="6.7" r="1.1" fill="currentColor" />
    </svg>
  )
}

function App() {
  const [page, setPage] = useState<'inicio' | 'cardapio' | 'festas' | 'pedidos' | 'admin'>('inicio')
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('pc-cart') || '[]')
      return Array.isArray(saved) ? saved.filter((item) => item?.cartKey && item?.id) : []
    } catch {
      return []
    }
  })
  const [user, setUser] = useState<Customer | null>(() => {
    const saved = JSON.parse(localStorage.getItem('pc-user') || 'null')
    if (!saved?.id || !saved?.email) {
      localStorage.removeItem('pc-user')
      return null
    }
    return saved
  })
  const [orders, setOrders] = useState<Order[]>([])
  const [catalog, setCatalog] = useState<Product[]>(fallbackProducts)
  const [cartOpen, setCartOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [customizeProduct, setCustomizeProduct] = useState<Product | null>(null)
  const [category, setCategory] = useState('Todos')
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const navigate = () => {
      const hash = location.hash.replace('#', '')
      setPage(hash === 'cardapio' || hash === 'festas' || hash === 'pedidos' || hash === 'admin' ? hash : 'inicio')
      setMobileOpen(false)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
    navigate()
    window.addEventListener('hashchange', navigate)
    return () => window.removeEventListener('hashchange', navigate)
  }, [])

  useEffect(() => localStorage.setItem('pc-cart', JSON.stringify(cart)), [cart])

  useEffect(() => {
    fetchProducts()
      .then((items) => {
        if (items.length) setCatalog(items)
      })
      .catch(() => {
        // Keep the local catalog available if the API is temporarily offline.
      })
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(''), 2500)
    return () => clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    if (!user) {
      setOrders([])
      return
    }

    fetchOrders(user.email)
      .then(setOrders)
      .catch(() => setOrders([]))
  }, [user, page])

  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0)
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const filtered = catalog.filter((product) =>
    (category === 'Todos' || product.category === category) &&
    product.name.toLowerCase().includes(search.toLowerCase()),
  )

  function requestAddToCart(product: Product) {
    if (product.options?.length) {
      setCustomizeProduct(product)
      return
    }
    confirmAddToCart(product, {}, product.minQuantity || 1)
  }

  function confirmAddToCart(product: Product, selectedOptions: Record<string, string[]>, quantity = 1) {
    const price = resolvePrice(product, selectedOptions)
    const optionsLabel = buildOptionsLabel(product, selectedOptions)
    const cartKey = makeCartKey(product.id, selectedOptions)
    const qty = Math.max(quantity, product.minQuantity || 1)

    setCart((current) => {
      const found = current.find((item) => item.cartKey === cartKey)
      return found
        ? current.map((item) => item.cartKey === cartKey ? { ...item, quantity: item.quantity + qty } : item)
        : [...current, { ...product, price, quantity: qty, cartKey, selectedOptions, optionsLabel }]
    })
    setCustomizeProduct(null)
    setToast(`${product.name} foi para a sacola!`)
  }

  function changeQuantity(cartKey: string, amount: number) {
    setCart((current) => current
      .map((item) => {
        if (item.cartKey !== cartKey) return item
        const min = item.minQuantity || 1
        const next = item.quantity + amount
        if (next < min) return { ...item, quantity: 0 }
        return { ...item, quantity: next }
      })
      .filter((item) => item.quantity > 0))
  }

  function startCheckout() {
    setCartOpen(false)
    if (!user) {
      setAuthOpen(true)
      setToast('Cadastre-se para continuar o pedido')
      return
    }
    setCheckoutOpen(true)
  }

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setLoading(true)

    try {
      const nextUser = await registerCustomer({
        name: String(data.get('name')),
        email: String(data.get('email')),
        phone: String(data.get('phone')),
      })
      setUser(nextUser)
      localStorage.setItem('pc-user', JSON.stringify(nextUser))
      setAuthOpen(false)
      setToast(`Que bom ter você aqui, ${nextUser.name.split(' ')[0]}!`)
      if (cart.length) setCheckoutOpen(true)
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Erro ao cadastrar')
    } finally {
      setLoading(false)
    }
  }

  async function finishOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!user) return

    const data = new FormData(event.currentTarget)
    setLoading(true)

    try {
      const order = await createOrder({
        customerId: user.id,
        items: cart.map((item) => ({
          productId: item.id,
          name: item.optionsLabel ? `${item.name} (${item.optionsLabel})` : item.name,
          price: item.price,
          quantity: item.quantity,
          image: item.image,
        })),
        address: {
          cep: String(data.get('cep')),
          number: String(data.get('number')),
          street: String(data.get('street')),
          complement: String(data.get('complement') || ''),
        },
        payment: String(data.get('payment') || 'Pix'),
        subtotal,
      })

      setOrders((current) => [order, ...current.filter((item) => item.code !== order.code)])
      setCart([])
      setCheckoutOpen(false)
      setToast(`Pedido #${order.code} confirmado!`)
      location.hash = 'pedidos'
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Erro ao finalizar pedido')
    } finally {
      setLoading(false)
    }
  }

  function logout() {
    setUser(null)
    setOrders([])
    localStorage.removeItem('pc-user')
    setAuthOpen(false)
    setToast('Você saiu da sua conta')
  }

  return (
    <div className="app">
      <header>
        <div className="container nav-wrap">
          <Logo />
          <nav className={mobileOpen ? 'open' : ''}>
            <a className={page === 'inicio' ? 'active' : ''} href="#inicio">Início</a>
            <a className={page === 'cardapio' ? 'active' : ''} href="#cardapio">Cardápio</a>
            <a className={page === 'festas' ? 'active' : ''} href="#festas">Festas</a>
            <a href="#inicio" onClick={() => setTimeout(() => document.querySelector('#historia')?.scrollIntoView({ behavior: 'smooth' }), 50)}>Nossa história</a>
            <a className={page === 'pedidos' ? 'active' : ''} href="#pedidos">Meus pedidos</a>
          </nav>
          <div className="nav-actions">
            <button className="icon-button account-button" onClick={() => setAuthOpen(true)} aria-label="Minha conta">
              <UserRound size={20} /><span>{user ? user.name.split(' ')[0] : 'Entrar'}</span>
            </button>
            <button className="bag-button" onClick={() => setCartOpen(true)} aria-label={`Sacola com ${itemCount} itens`}>
              <ShoppingBag size={20} /><span>Sacola</span>{itemCount > 0 && <b>{itemCount}</b>}
            </button>
            <button className="mobile-menu" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Abrir menu">{mobileOpen ? <X /> : <Menu />}</button>
          </div>
        </div>
      </header>

      <main>
        {page === 'inicio' && <Home products={catalog} addToCart={requestAddToCart} />}
        {page === 'cardapio' && (
          <section className="menu-page">
            <div className="page-hero">
              <span className="eyebrow">Um sabor para cada momento</span>
              <h1>Nosso cardápio</h1>
              <p>Trabalhamos com qualidade e fazemos você se apaixonar por pipocas gourmet.</p>
            </div>
            <div className="container flavors-banner">
              <span className="eyebrow">Sabores disponíveis</span>
              <p>Ninho · Nesquik · Nutella · Milho Verde · Pé de Moleque · Ovomaltine · Caramelo · Doritos · Paçoca · Churros</p>
            </div>
            <div className="container menu-tools">
              <div className="categories">
                {['Todos', 'Tamanhos', 'Copos', 'Kits', 'Presentes', 'Petisqueiras', 'Baldes', 'Festas'].map((item) =>
                  <button className={category === item ? 'active' : ''} key={item} onClick={() => setCategory(item)}>{item}</button>,
                )}
              </div>
              <label className="search"><Search size={18} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar sabor..." /></label>
            </div>
            <div className="container product-grid menu-grid">
              {filtered.map((product) => <ProductCard key={product.id} product={product} onAdd={requestAddToCart} />)}
            </div>
          </section>
        )}
        {page === 'pedidos' && <Orders user={user} orders={orders} onLogin={() => setAuthOpen(true)} />}
        {page === 'festas' && <Festas products={catalog} addToCart={requestAddToCart} />}
        {page === 'admin' && <AdminPage onToast={setToast} />}
      </main>

      <footer>
        <div className="container footer-grid">
          <div><Logo /><p>Pipocas artesanais que transformam momentos simples em memórias deliciosas.</p></div>
          <div><h4>Navegue</h4><a href="#inicio">Início</a><a href="#cardapio">Cardápio</a><a href="#festas">Festas</a><a href="#pedidos">Meus pedidos</a></div>
          <div>
            <h4>Atendimento</h4>
            <a className="contact-link" href="https://wa.me/5519995755409" target="_blank" rel="noreferrer"><MessageCircle size={17} /> (19) 99575-5409</a>
            <a className="contact-link" href="mailto:pipocascarolinas700@gmail.com"><Mail size={17} /> pipocascarolinas700@gmail.com</a>
            <a className="contact-link" href="https://instagram.com/pipocascarolinas" target="_blank" rel="noreferrer"><InstagramIcon size={17} /> @pipocascarolinas</a>
          </div>
        </div>
        <div className="footer-bottom container">© 2026 Pipocas Carolina <span>Feito com carinho em cada detalhe ♥</span></div>
      </footer>

      {cartOpen && <CartDrawer cart={cart} subtotal={subtotal} onClose={() => setCartOpen(false)} onChange={changeQuantity} onCheckout={startCheckout} />}
      {customizeProduct && (
        <ProductOptionsModal
          product={customizeProduct}
          onClose={() => setCustomizeProduct(null)}
          onConfirm={confirmAddToCart}
        />
      )}
      {authOpen && <AuthModal user={user} loading={loading} onClose={() => setAuthOpen(false)} onSubmit={handleAuth} onLogout={logout} />}
      {checkoutOpen && user && <CheckoutModal user={user} subtotal={subtotal} loading={loading} onClose={() => setCheckoutOpen(false)} onSubmit={finishOrder} />}
      {toast && <div className="toast"><Check size={18} />{toast}</div>}
    </div>
  )
}

function Festas({ products, addToCart }: { products: Product[]; addToCart: (product: Product) => void }) {
  const favorProduct = products.find((product) => product.id === 8)
  const kiloProduct = products.find((product) => product.id === 7)
  const whatsOrcamento = 'https://wa.me/5519995755409?text=Ol%C3%A1!%20Gostaria%20de%20solicitar%20um%20or%C3%A7amento%20para%20festas%20e%20eventos%20da%20Pipocas%20Carolinas.'
  const whatsLembrancinhas = 'https://wa.me/5519995755409?text=Ol%C3%A1!%20Gostaria%20de%20um%20or%C3%A7amento%20de%20lembrancinhas%20personalizadas.'
  const whatsCarrinho = 'https://wa.me/5519995755409?text=Ol%C3%A1!%20Gostaria%20de%20solicitar%20um%20or%C3%A7amento%20do%20carrinho%20para%20festas%20e%20eventos.'

  return (
    <section className="festas-page">
      <div className="page-hero">
        <span className="eyebrow">Para festas e eventos</span>
        <h1>Sabor que celebra</h1>
        <p>Lembrancinhas personalizadas e o carrinho da Pipocas Carolinas para tornar cada ocasião inesquecível.</p>
        <a className="primary-button festas-hero-cta" href={whatsOrcamento} target="_blank" rel="noreferrer">
          Pedir orçamento no WhatsApp <MessageCircle size={18} />
        </a>
      </div>

      <div className="container festas-block">
        <div className="festas-copy">
          <span className="festas-icon"><Gift size={22} /></span>
          <span className="eyebrow">Lembrancinhas</span>
          <h2>Lembrancinhas Personalizadas</h2>
          <p>Personalizamos cada detalhe, desde os adesivos até os laços, criando uma lembrança exclusiva para a sua ocasião.</p>
          <p>Disponíveis em opções de 30g, 50g e 60g, são perfeitas para aniversários, casamentos, chás de bebê, chá revelação, eventos corporativos e muito mais.</p>
          <p>Cada lembrancinha é feita com pipocas gourmet de alta qualidade e um acabamento que encanta à primeira vista.</p>
          <p>Personalize do seu jeito e surpreenda seus convidados!</p>
          <ul className="festas-highlights">
            <li>30g · R$ 7,00</li>
            <li>50g · R$ 8,00</li>
            <li>60g · R$ 9,00</li>
            <li>Pedido mínimo: 20 unidades</li>
          </ul>
          <a className="primary-button" href={whatsLembrancinhas} target="_blank" rel="noreferrer">
            Orçamento de lembrancinhas <MessageCircle size={18} />
          </a>
        </div>
        <div className="festas-side">
          {favorProduct && <ProductCard product={favorProduct} onAdd={addToCart} />}
          {kiloProduct && <ProductCard product={kiloProduct} onAdd={addToCart} />}
        </div>
      </div>

      <div className="container festas-block festas-block-alt">
        <div className="festas-visual">
          <img src="/nossa-historia.webp" alt="Carrinho da Pipocas Carolinas para festas e eventos" />
        </div>
        <div className="festas-copy">
          <span className="festas-icon"><PartyPopper size={22} /></span>
          <span className="eyebrow">Carrinho no evento</span>
          <h2>Carrinho para Festas e Eventos</h2>
          <p>Transforme seu evento em uma experiência ainda mais especial com o carrinho da Pipocas Carolinas. Atendemos aniversários, casamentos, eventos corporativos, confraternizações e diversas celebrações, oferecendo um atendimento personalizado e pipocas gourmet feitas na hora.</p>
          <p>Nosso carrinho conta com até 3 sabores de pipoca à sua escolha, além de cones personalizados que deixam o momento ainda mais bonito e exclusivo. O orçamento é realizado de acordo com a quantidade de convidados, garantindo um atendimento ideal para o seu evento.</p>
          <p>Solicite um orçamento e leve mais sabor para a sua comemoração!</p>
          <ul className="festas-highlights">
            <li>Até 3 sabores à escolha</li>
            <li>Cones personalizados</li>
            <li>Pipocas gourmet feitas na hora</li>
            <li>Orçamento por quantidade de convidados</li>
          </ul>
          <a className="primary-button" href={whatsCarrinho} target="_blank" rel="noreferrer">
            Orçamento do carrinho <MessageCircle size={18} />
          </a>
        </div>
      </div>

      <div className="festas-quote-bar">
        <div className="container festas-quote-inner">
          <div>
            <strong>Vamos planejar sua festa?</strong>
            <p>Fale conosco no WhatsApp e receba um orçamento personalizado.</p>
          </div>
          <a className="primary-button" href={whatsOrcamento} target="_blank" rel="noreferrer">
            Pedir orçamento <MessageCircle size={18} />
          </a>
        </div>
      </div>
    </section>
  )
}

function Home({ products, addToCart }: { products: Product[]; addToCart: (product: Product) => void }) {
  return (
    <>
      <section className="hero-section">
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="eyebrow"><Sparkles size={15} /> Felicidade em forma de pipoca</span>
            <h1>Pequenos grãos,<br /><em>grandes momentos.</em></h1>
            <p>Pipocas gourmet feitas à mão, com ingredientes especiais e uma dose generosa de carinho.</p>
            <div className="hero-actions"><a className="primary-button" href="#cardapio">Ver cardápio <ArrowRight size={19} /></a><a className="text-link" href="#historia">Conheça nossa história <ChevronRight size={18} /></a></div>
          </div>
          <div className="hero-visual">
            <div className="hero-blob"></div>
            <video
              src="/hero-pipocas-carolinas.mp4"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              aria-label="Pipocas gourmet da Pipocas Carolinas"
            />
          </div>
        </div>
      </section>

      <section className="benefits"><div className="container benefits-grid">
        <div><span><Wheat /></span><p><b>Ingredientes especiais</b><small>Selecionados com cuidado</small></p></div>
        <div><span><Sparkles /></span><p><b>Produção artesanal</b><small>Feitas em pequenos lotes</small></p></div>
        <div><span><Clock3 /></span><p><b>Sempre fresquinhas</b><small>Produzidas no dia do envio</small></p></div>
        <div><span><MapPin /></span><p><b>Entrega local</b><small>Frete fixo por R$ 8,00</small></p></div>
      </div></section>

      <section className="featured">
        <div className="container">
          <div className="section-heading"><div><span className="eyebrow">As favoritas da Carolina</span><h2>Sabores que conquistam</h2></div><a href="#cardapio">Ver cardápio completo <ArrowRight size={18} /></a></div>
          <div className="product-grid">{products.filter((p) => [1, 2, 3, 5].includes(p.id)).map((product) => <ProductCard key={product.id} product={product} onAdd={addToCart} />)}</div>
        </div>
      </section>

      <section id="historia" className="story">
        <div className="container">
          <div className="story-grid">
            <div className="story-images">
              <img className="story-main" src="/nossa-historia.webp" alt="Andressa Neves e Paloma Carolina com o carrinho da Pipocas Carolinas" />
            </div>
            <div className="story-copy">
              <span className="eyebrow">Nossa história 🍿🤎</span>
              <h2>Uma empresa familiar feita de sonhos</h2>
              <p>A Pipocas Carolinas nasceu do sonho de levar mais do que um doce para as pessoas: criar momentos especiais, transformar comemorações em lembranças e espalhar carinho em cada detalhe.</p>
              <p>Somos uma empresa familiar, construída com dedicação, amor e muito trabalho. Cada pedido que sai da nossa cozinha carrega um pedacinho da nossa história e do cuidado que temos com cada cliente.</p>
            </div>
          </div>
          <div className="story-people">
            <article className="person-card">
              <div>
                <small>Produção & qualidade</small>
                <h3>Andressa Neves</h3>
                <p>Andressa é o coração da produção da Pipocas Carolinas. É ela quem transforma ingredientes selecionados em pipocas gourmet irresistíveis, cuidando de cada etapa: do preparo à caramelização, da finalização à embalagem.</p>
                <p>Seu carinho e atenção garantem que cada cliente receba um produto feito com qualidade, capricho e muito amor.</p>
              </div>
            </article>
            <article className="person-card">
              <div>
                <small>Marketing & comunicação</small>
                <h3>Paloma Carolina</h3>
                <p>Paloma é quem dá voz à Pipocas Carolinas. Ela cuida das redes sociais, da identidade visual, do relacionamento com os clientes e de cada detalhe que faz a experiência começar antes mesmo da primeira mordida.</p>
                <p>É através da criatividade e do olhar atento que a marca continua crescendo e conquistando novos momentos para adoçar.</p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="cta"><div className="container cta-inner"><div><span className="eyebrow">Já escolheu a sua?</span><h2>Seu momento merece mais sabor.</h2><p>Monte seu pedido agora e receba suas pipocas fresquinhas em casa.</p></div><a className="light-button" href="#cardapio">Quero minhas pipocas <ArrowRight size={19} /></a></div></section>
    </>
  )
}

function ProductCard({ product, onAdd }: { product: Product; onAdd: (product: Product) => void }) {
  return (
    <article className="product-card">
      <div className="product-image"><img src={product.image} alt={product.name} />{product.tag && <span>{product.tag}</span>}<button onClick={() => onAdd(product)} aria-label={`Adicionar ${product.name}`}><Plus size={20} /></button></div>
      <div className="product-info">
        <small>{product.category}</small>
        <h3>{product.name}</h3>
        <p>{product.description}</p>
        <div>
          <strong>{product.options?.some((o) => o.priceMode === 'replace') ? `a partir de ${money(product.price)}` : money(product.price)}</strong>
          <span>{product.options?.length ? 'escolha opções' : product.unit}</span>
        </div>
      </div>
    </article>
  )
}

function ProductOptionsModal({
  product,
  onClose,
  onConfirm,
}: {
  product: Product
  onClose: () => void
  onConfirm: (product: Product, selected: Record<string, string[]>, quantity?: number) => void
}) {
  const [selected, setSelected] = useState<Record<string, string[]>>(() => {
    const initial: Record<string, string[]> = {}
    for (const group of product.options || []) {
      if (group.type === 'single' && group.choices[0]) initial[group.id] = [group.choices[0].label]
      else initial[group.id] = []
    }
    return initial
  })
  const [quantity, setQuantity] = useState(product.minQuantity || 1)
  const [error, setError] = useState('')

  const price = resolvePrice(product, selected)
  const flavorNeed = requiredFlavorCount(product, selected)

  useEffect(() => {
    if (flavorNeed == null) return
    setSelected((current) => ({
      ...current,
      flavors: (current.flavors || []).slice(0, flavorNeed),
    }))
  }, [flavorNeed])

  function toggleChoice(group: OptionGroup, label: string) {
    setError('')
    setSelected((current) => {
      const currentValues = current[group.id] || []
      if (group.type === 'single') return { ...current, [group.id]: [label] }

      const exists = currentValues.includes(label)
      if (exists) return { ...current, [group.id]: currentValues.filter((item) => item !== label) }

      const max = group.id === 'flavors' && flavorNeed ? flavorNeed : (group.max || group.choices.length)
      if (currentValues.length >= max) {
        setError(`Você pode escolher no máximo ${max} ${group.label.toLowerCase()}.`)
        return current
      }
      return { ...current, [group.id]: [...currentValues, label] }
    })
  }

  function submit() {
    for (const group of product.options || []) {
      const values = selected[group.id] || []
      const min = group.id === 'flavors' && flavorNeed ? flavorNeed : (group.min ?? (group.type === 'single' ? 1 : 0))
      const max = group.id === 'flavors' && flavorNeed ? flavorNeed : (group.max || group.choices.length)

      if (values.length < min) {
        setError(`Selecione ${min === 1 ? 'uma opção de' : `${min}`} ${group.label.toLowerCase()}.`)
        return
      }
      if (values.length > max) {
        setError(`Selecione no máximo ${max} em ${group.label.toLowerCase()}.`)
        return
      }
    }

    if (product.minQuantity && quantity < product.minQuantity) {
      setError(`Quantidade mínima: ${product.minQuantity} unidades.`)
      return
    }

    onConfirm(product, selected, quantity)
  }

  return (
    <div className="overlay centered" onMouseDown={onClose}>
      <div className="modal options-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <span className="eyebrow">Personalize</span>
            <h2>{product.name}</h2>
          </div>
          <button onClick={onClose}><X /></button>
        </div>

        <div className="options-body">
          <div className="options-product">
            <img src={product.image} alt="" />
            <div>
              <p>{product.description}</p>
              <strong>{money(price)}</strong>
            </div>
          </div>

          {(product.options || []).map((group) => {
            const max = group.id === 'flavors' && flavorNeed ? flavorNeed : group.max
            const values = selected[group.id] || []
            return (
              <div className="option-group" key={group.id}>
                <div className="option-group-head">
                  <h4>{group.label}</h4>
                  {group.type === 'multi' && (
                    <small>{values.length}/{max || group.choices.length}</small>
                  )}
                </div>
                <div className="option-chips">
                  {group.choices.map((choice) => {
                    const active = values.includes(choice.label)
                    return (
                      <button
                        type="button"
                        key={choice.label}
                        className={active ? 'active' : ''}
                        onClick={() => toggleChoice(group, choice.label)}
                      >
                        {choice.label}
                        {choice.price != null ? ` · ${money(choice.price)}` : ''}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}

          <div className="option-qty">
            <h4>Quantidade</h4>
            <div className="quantity">
              <button type="button" onClick={() => setQuantity((q) => Math.max(product.minQuantity || 1, q - 1))}><Minus size={14} /></button>
              <b>{quantity}</b>
              <button type="button" onClick={() => setQuantity((q) => q + 1)}><Plus size={14} /></button>
            </div>
            {product.minQuantity ? <small>Mínimo de {product.minQuantity} unidades</small> : null}
          </div>

          {error && <p className="option-error">{error}</p>}
          <button className="primary-button full" onClick={submit}>
            Adicionar · {money(price * quantity)} <Plus size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}

function CartDrawer({ cart, subtotal, onClose, onChange, onCheckout }: { cart: CartItem[]; subtotal: number; onClose: () => void; onChange: (cartKey: string, amount: number) => void; onCheckout: () => void }) {
  return (
    <div className="overlay" onMouseDown={onClose}>
      <aside className="drawer" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head"><div><span className="eyebrow">Sua seleção</span><h2>Minha sacola</h2></div><button onClick={onClose}><X /></button></div>
        {cart.length === 0 ? (
          <div className="empty"><span><ShoppingBag /></span><h3>Sua sacola está vazia</h3><p>Que tal escolher um sabor para deixar o dia mais gostoso?</p><button className="primary-button" onClick={() => { onClose(); location.hash = 'cardapio' }}>Explorar cardápio</button></div>
        ) : (
          <>
            <div className="cart-list">{cart.map((item) => (
              <div className="cart-item" key={item.cartKey}>
                <img src={item.image} alt="" />
                <div className="cart-item-info">
                  <h4>{item.name}</h4>
                  {item.optionsLabel && <p className="cart-options">{item.optionsLabel}</p>}
                  <span>{money(item.price)}</span>
                  <div className="quantity">
                    <button onClick={() => onChange(item.cartKey, -1)}>{item.quantity === (item.minQuantity || 1) ? <Trash2 size={14} /> : <Minus size={14} />}</button>
                    <b>{item.quantity}</b>
                    <button onClick={() => onChange(item.cartKey, 1)}><Plus size={14} /></button>
                  </div>
                </div>
              </div>
            ))}</div>
            <div className="cart-summary">
              <div><span>Subtotal</span><b>{money(subtotal)}</b></div>
              <div><span>Frete fixo</span><b>{money(SHIPPING)}</b></div>
              <div className="cart-total"><span>Total</span><strong>{money(subtotal + SHIPPING)}</strong></div>
              <button className="primary-button full" onClick={onCheckout}>Finalizar pedido <ArrowRight size={18} /></button>
              <small><LockKeyhole size={13} /> Compra segura e protegida</small>
            </div>
          </>
        )}
      </aside>
    </div>
  )
}

function AuthModal({ user, loading, onClose, onSubmit, onLogout }: { user: Customer | null; loading: boolean; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onLogout: () => void }) {
  return (
    <div className="overlay centered" onMouseDown={onClose}>
      <div className="modal auth-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head"><div><span className="eyebrow">Minha conta</span><h2>{user ? `Olá, ${user.name.split(' ')[0]}!` : 'Entre para pedir'}</h2></div><button onClick={onClose}><X /></button></div>
        {user ? (
          <div className="profile"><span><UserRound size={34} /></span><h3>{user.name}</h3><p>{user.email}</p><p>{user.phone}</p><a className="primary-button full" href="#pedidos" onClick={onClose}>Ver meus pedidos</a><button className="logout" onClick={onLogout}>Sair da conta</button></div>
        ) : (
          <form onSubmit={onSubmit} className="form">
            <p>Faça seu cadastro rapidinho para acompanhar e receber seus pedidos.</p>
            <label>Nome completo<input name="name" required placeholder="Como podemos te chamar?" /></label>
            <label>E-mail<input name="email" type="email" required placeholder="voce@email.com" /></label>
            <label>Celular<input name="phone" required placeholder="(00) 00000-0000" /></label>
            <button className="primary-button full" disabled={loading}>{loading ? 'Salvando...' : 'Criar minha conta'} <ArrowRight size={18} /></button>
            <small>Seus dados ficam salvos no servidor da loja.</small>
          </form>
        )}
      </div>
    </div>
  )
}

function CheckoutModal({ user, subtotal, loading, onClose, onSubmit }: { user: Customer; subtotal: number; loading: boolean; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return (
    <div className="overlay centered" onMouseDown={onClose}>
      <div className="modal checkout-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head"><div><span className="eyebrow">Último passo</span><h2>Finalizar pedido</h2></div><button onClick={onClose}><X /></button></div>
        <form className="form" onSubmit={onSubmit}>
          <div className="checkout-user"><UserRound size={20} /><span><b>{user.name}</b><small>{user.phone}</small></span></div>
          <h4>Endereço de entrega</h4>
          <div className="form-row"><label>CEP<input name="cep" required placeholder="00000-000" /></label><label>Número<input name="number" required placeholder="123" /></label></div>
          <label>Rua e bairro<input name="street" required placeholder="Rua das Flores, Centro" /></label>
          <label>Complemento<input name="complement" placeholder="Apto, bloco ou referência (opcional)" /></label>
          <h4>Forma de pagamento</h4>
          <div className="payment-options">
            <label><input type="radio" name="payment" value="Pix" defaultChecked /> Pix</label>
            <label><input type="radio" name="payment" value="Cartão na entrega" /> Cartão na entrega</label>
            <label><input type="radio" name="payment" value="Dinheiro" /> Dinheiro</label>
          </div>
          <div className="checkout-total"><span>Total com frete</span><b>{money(subtotal + SHIPPING)}</b></div>
          <button className="primary-button full" disabled={loading}>{loading ? 'Enviando...' : 'Confirmar pedido'} <PackageCheck size={18} /></button>
        </form>
      </div>
    </div>
  )
}

function Orders({ user, orders, onLogin }: { user: Customer | null; orders: Order[]; onLogin: () => void }) {
  return (
    <section className="orders-page">
      <div className="container">
        <div className="page-hero"><span className="eyebrow">Tudo em um só lugar</span><h1>Meus pedidos</h1><p>Acompanhe o preparo e relembre seus sabores favoritos.</p></div>
        {!user ? (
          <div className="orders-empty"><span><UserRound /></span><h2>Entre na sua conta</h2><p>Você precisa estar conectado para visualizar seus pedidos.</p><button className="primary-button" onClick={onLogin}>Entrar ou criar conta</button></div>
        ) : orders.length === 0 ? (
          <div className="orders-empty"><span><ShoppingBag /></span><h2>Nenhum pedido ainda</h2><p>Quando você fizer seu primeiro pedido, ele aparecerá aqui.</p><a className="primary-button" href="#cardapio">Escolher minhas pipocas</a></div>
        ) : (
          <div className="orders-list">
            {orders.map((order) => (
              <div className="order-card" key={order.code}>
                <div className="order-top">
                  <div>
                    <span>Pedido</span>
                    <h3>#{order.code}</h3>
                    <small className="order-date">{new Date(order.createdAt).toLocaleString('pt-BR')}</small>
                  </div>
                  <span className="order-status"><Clock3 size={16} /> {statusLabel[order.status]}</span>
                </div>
                <div className="order-progress">
                  <span className="done"><Check /></span><i></i>
                  <span className={order.status === 'preparando' || order.status === 'entregando' || order.status === 'entregue' ? 'active' : ''}><PackageCheck /></span><i></i>
                  <span className={order.status === 'entregando' || order.status === 'entregue' ? 'active' : ''}><MapPin /></span>
                </div>
                <div className="progress-labels"><span>Confirmado</span><span>Em preparo</span><span>Saiu para entrega</span></div>
                <div className="order-items">
                  {order.items.map((item) => (
                    <div className="order-item" key={`${order.code}-${item.productId}`}>
                      <img src={item.image} alt="" />
                      <div>
                        <b>{item.name}</b>
                        <small>{item.quantity}x · {money(item.price)}</small>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="order-footer">
                  <span>{order.payment} · Frete {money(order.shipping)}</span>
                  <strong>{money(order.total)}</strong>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

const adminStatuses: Order['status'][] = ['preparando', 'entregando', 'entregue', 'cancelado']

function AdminPage({ onToast }: { onToast: (message: string) => void }) {
  const [session, setSession] = useState<string | null>(null)
  const [checking, setChecking] = useState(true)
  const [loading, setLoading] = useState(false)
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [summary, setSummary] = useState<AdminSummary | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'todos' | Order['status']>('todos')
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const [tab, setTab] = useState<'pedidos' | 'produtos' | 'clientes' | 'financeiro'>('pedidos')
  const [adminProducts, setAdminProducts] = useState<CatalogProduct[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [movements, setMovements] = useState<InventoryMovement[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [editingProduct, setEditingProduct] = useState<CatalogProduct | null>(null)
  const [productFormOpen, setProductFormOpen] = useState(false)
  const [productImagePreview, setProductImagePreview] = useState('')
  const [productOptions, setProductOptions] = useState<OptionGroup[]>([])

  async function loadDashboard() {
    const [nextOrders, nextSummary, nextProducts, nextCustomers, nextMovements, nextExpenses] = await Promise.all([
      fetchAdminOrders(),
      fetchAdminSummary(),
      fetchAdminProducts(),
      fetchAdminCustomers(),
      fetchInventoryMovements(),
      fetchExpenses(),
    ])
    setOrders(nextOrders)
    setSummary(nextSummary)
    setAdminProducts(nextProducts)
    setCustomers(nextCustomers)
    setMovements(nextMovements)
    setExpenses(nextExpenses)
  }

  useEffect(() => {
    let active = true
    fetchAdminSession()
      .then(async (result) => {
        if (!active) return
        setSession(result.email)
        await loadDashboard()
      })
      .catch(() => {
        if (active) setSession(null)
      })
      .finally(() => {
        if (active) setChecking(false)
      })
    return () => { active = false }
  }, [])

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setLoading(true)
    try {
      const result = await adminLogin({
        email: String(data.get('email')),
        password: String(data.get('password')),
      })
      setSession(result.email)
      await loadDashboard()
      onToast('Acesso administrativo liberado')
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'Falha no login administrativo')
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    try {
      await adminLogout()
    } catch {
      // ignore network errors on logout
    }
    setSession(null)
    setOrders([])
    setSummary(null)
    onToast('Sessão administrativa encerrada')
  }

  async function handleRefresh() {
    setLoading(true)
    try {
      await loadDashboard()
      onToast('Painel atualizado')
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'Erro ao atualizar painel')
    } finally {
      setLoading(false)
    }
  }

  async function handleStatusChange(orderId: number, status: Order['status']) {
    setUpdatingId(orderId)
    try {
      const updated = await updateAdminOrderStatus(orderId, status)
      setOrders((current) => current.map((order) => (order.id === orderId ? updated : order)))
      setSummary(await fetchAdminSummary())
      onToast(`Pedido #${updated.code} atualizado`)
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'Erro ao atualizar status')
    } finally {
      setUpdatingId(null)
    }
  }

  async function handlePaymentChange(orderId: number, paymentStatus: NonNullable<Order['paymentStatus']>) {
    setUpdatingId(orderId)
    try {
      const updated = await updateAdminPaymentStatus(orderId, paymentStatus)
      setOrders((current) => current.map((order) => (order.id === orderId ? updated : order)))
      setSummary(await fetchAdminSummary())
      onToast(`Pagamento do pedido #${updated.code} atualizado`)
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'Erro ao atualizar pagamento')
    } finally {
      setUpdatingId(null)
    }
  }

  async function handleStock(event: FormEvent<HTMLFormElement>, product: CatalogProduct) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    setUpdatingId(product.id)
    try {
      await adjustAdminStock({
        productId: product.id,
        quantity: Number(data.get('quantity')),
        type: String(data.get('type')) as 'entrada' | 'ajuste' | 'perda',
        note: String(data.get('note') || ''),
      })
      await loadDashboard()
      form.reset()
      onToast(`Estoque de ${product.name} atualizado`)
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'Erro ao atualizar estoque')
    } finally {
      setUpdatingId(null)
    }
  }

  async function handleProductSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setLoading(true)
    try {
      const imageFile = data.get('imageFile')
      let image = editingProduct?.image || ''
      if (imageFile instanceof File && imageFile.size > 0) {
        image = (await uploadAdminProductImage(imageFile)).url
      }

      await saveAdminProduct({
        ...(editingProduct || {}),
        name: String(data.get('name')),
        description: String(data.get('description') || ''),
        price: Number(data.get('price')),
        category: String(data.get('category') || 'Geral'),
        unit: String(data.get('unit') || 'unidade'),
        image,
        tag: String(data.get('tag') || ''),
        minQuantity: Number(data.get('minQuantity')) || 1,
        minStock: Number(data.get('minStock')) || 0,
        stockQty: editingProduct ? editingProduct.stockQty : Number(data.get('stockQty')) || 0,
        active: data.get('active') === 'on',
        options: productOptions
          .map((group) => ({
            ...group,
            label: group.label.trim(),
            choices: group.choices.filter((choice) => choice.label.trim()),
          }))
          .filter((group) => group.label && group.choices.length),
      })
      setProductFormOpen(false)
      setEditingProduct(null)
      setProductImagePreview('')
      setProductOptions([])
      await loadDashboard()
      onToast('Produto salvo com sucesso')
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'Erro ao salvar produto')
    } finally {
      setLoading(false)
    }
  }

  function openNewProduct() {
    setEditingProduct(null)
    setProductImagePreview('')
    setProductOptions([])
    setProductFormOpen(true)
  }

  function openProductEditor(product: CatalogProduct) {
    setEditingProduct(product)
    setProductImagePreview(product.image)
    setProductOptions(product.options.map((group) => ({
      ...group,
      choices: group.choices.map((choice) => ({ ...choice })),
    })))
    setProductFormOpen(true)
  }

  function addOptionGroup(kind: 'size' | 'flavor' | 'custom') {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    if (kind === 'size') {
      setProductOptions((current) => [...current, {
        id: `size-${suffix}`,
        label: 'Peso / tamanho',
        type: 'single',
        priceMode: 'replace',
        choices: [{ label: '100g', price: 0 }],
      }])
      return
    }
    if (kind === 'flavor') {
      setProductOptions((current) => [...current, {
        id: `flavor-${suffix}`,
        label: 'Sabor',
        type: 'single',
        choices: FLAVORS.map((label) => ({ label })),
      }])
      return
    }
    setProductOptions((current) => [...current, {
      id: `option-${suffix}`,
      label: 'Nova opção',
      type: 'single',
      choices: [{ label: '' }],
    }])
  }

  function updateOptionGroup(index: number, patch: Partial<OptionGroup>) {
    setProductOptions((current) => current.map((group, groupIndex) =>
      groupIndex === index ? { ...group, ...patch } : group,
    ))
  }

  function updateOptionChoice(groupIndex: number, choiceIndex: number, patch: Partial<OptionChoice>) {
    setProductOptions((current) => current.map((group, index) => index === groupIndex ? {
      ...group,
      choices: group.choices.map((choice, itemIndex) =>
        itemIndex === choiceIndex ? { ...choice, ...patch } : choice,
      ),
    } : group))
  }

  async function handleExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    setLoading(true)
    try {
      await createExpense({
        description: String(data.get('description')),
        amount: Number(data.get('amount')),
        category: String(data.get('category') || 'Geral'),
        spentAt: String(data.get('spentAt')),
      })
      form.reset()
      await loadDashboard()
      onToast('Despesa registrada')
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'Erro ao registrar despesa')
    } finally {
      setLoading(false)
    }
  }

  const filtered = orders.filter((order) => {
    const matchesStatus = statusFilter === 'todos' || order.status === statusFilter
    const query = search.trim().toLowerCase()
    if (!query) return matchesStatus
    const haystack = [
      order.code,
      order.customer?.name,
      order.customer?.email,
      order.customer?.phone,
      order.address.street,
      order.payment,
    ].join(' ').toLowerCase()
    return matchesStatus && haystack.includes(query)
  })

  if (checking) {
    return (
      <section className="admin-page">
        <div className="container admin-loading">Carregando painel...</div>
      </section>
    )
  }

  if (!session) {
    return (
      <section className="admin-page">
        <div className="container admin-login-wrap">
          <form className="admin-login" onSubmit={handleLogin}>
            <span className="eyebrow">Área restrita</span>
            <h1>Painel administrativo</h1>
            <p>Entre com o e-mail e a senha configurados no servidor.</p>
            <label>
              E-mail
              <input name="email" type="email" required autoComplete="username" placeholder="admin@exemplo.com" />
            </label>
            <label>
              Senha
              <input name="password" type="password" required autoComplete="current-password" placeholder="••••••••" />
            </label>
            <button className="primary-button full" disabled={loading}>
              <LockKeyhole size={18} />
              {loading ? 'Entrando...' : 'Entrar no painel'}
            </button>
          </form>
        </div>
      </section>
    )
  }

  return (
    <section className="admin-page">
      <div className="container">
        <div className="admin-top">
          <div>
            <span className="eyebrow">Gestão da loja</span>
            <h1>Painel administrativo</h1>
            <p>Conectado como {session}</p>
          </div>
          <div className="admin-top-actions">
            <button className="ghost-button" onClick={handleRefresh} disabled={loading}>
              <RefreshCw size={16} /> Atualizar
            </button>
            <button className="ghost-button danger" onClick={handleLogout}>
              <LogOut size={16} /> Sair
            </button>
          </div>
        </div>

        <div className="admin-stats">
          <article><span>Pedidos</span><strong>{summary?.totalOrders ?? 0}</strong></article>
          <article><span>Clientes</span><strong>{summary?.totalCustomers ?? 0}</strong></article>
          <article><span>Produtos ativos</span><strong>{summary?.activeProducts ?? 0}</strong></article>
          <article><span>Estoque baixo</span><strong>{summary?.lowStock ?? 0}</strong></article>
          <article><span>Recebido</span><strong>{money(summary?.paidRevenue ?? 0)}</strong></article>
          <article><span>Lucro estimado</span><strong>{money(summary?.profitEstimate ?? 0)}</strong></article>
        </div>

        <div className="admin-tabs">
          {([
            ['pedidos', 'Pedidos'],
            ['produtos', 'Produtos e estoque'],
            ['clientes', 'Clientes'],
            ['financeiro', 'Financeiro'],
          ] as const).map(([value, label]) => (
            <button key={value} className={tab === value ? 'active' : ''} onClick={() => setTab(value)}>
              {label}
            </button>
          ))}
        </div>

        {tab === 'produtos' && (
          <div className="admin-module">
            <div className="admin-module-head">
              <div><h2>Produtos e estoque</h2><p>Cadastre produtos e registre entradas, perdas ou ajustes.</p></div>
              <button className="primary-button" onClick={openNewProduct}>Novo produto</button>
            </div>

            {productFormOpen && (
              <form className="admin-form-card" onSubmit={handleProductSave}>
                <div className="admin-form-grid">
                  <label>Nome<input name="name" required defaultValue={editingProduct?.name} /></label>
                  <label>Preço<input name="price" type="number" min="0" step="0.01" required defaultValue={editingProduct?.price} /></label>
                  <label>Categoria<input name="category" required defaultValue={editingProduct?.category || 'Geral'} /></label>
                  <label>Unidade<input name="unit" required defaultValue={editingProduct?.unit || 'unidade'} /></label>
                  <label>Estoque mínimo<input name="minStock" type="number" min="0" defaultValue={editingProduct?.minStock ?? 5} /></label>
                  {!editingProduct && <label>Estoque inicial<input name="stockQty" type="number" min="0" defaultValue="0" /></label>}
                  <label>Quantidade mínima<input name="minQuantity" type="number" min="1" defaultValue={editingProduct?.minQuantity ?? 1} /></label>
                  <label>Etiqueta<input name="tag" defaultValue={editingProduct?.tag} /></label>
                  <label className="wide admin-image-field">
                    Imagem do produto
                    <input
                      name="imageFile"
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={(event) => {
                        const file = event.target.files?.[0]
                        setProductImagePreview(file ? URL.createObjectURL(file) : editingProduct?.image || '')
                      }}
                    />
                    <small>JPG, PNG, WEBP ou GIF · máximo de 5 MB</small>
                  </label>
                  {(productImagePreview || editingProduct?.image) && (
                    <div className="admin-image-preview">
                      <img src={productImagePreview || editingProduct?.image} alt="Pré-visualização do produto" />
                      <span>Pré-visualização</span>
                    </div>
                  )}
                  <label className="wide">Descrição<textarea name="description" defaultValue={editingProduct?.description} /></label>
                  <label className="admin-check"><input name="active" type="checkbox" defaultChecked={editingProduct?.active ?? true} /> Produto ativo</label>
                </div>
                <div className="product-options-editor">
                  <div className="product-options-head">
                    <div>
                      <h3>Pesos, tamanhos e sabores</h3>
                      <p>Adicione quantas opções precisar. Pesos e tamanhos podem ter preços diferentes.</p>
                    </div>
                    <div>
                      <button type="button" className="ghost-button" onClick={() => addOptionGroup('size')}>+ Peso / tamanho</button>
                      <button type="button" className="ghost-button" onClick={() => addOptionGroup('flavor')}>+ Sabores</button>
                      <button type="button" className="ghost-button" onClick={() => addOptionGroup('custom')}>+ Outra opção</button>
                    </div>
                  </div>

                  {productOptions.length === 0 && (
                    <div className="product-options-empty">Este produto ainda não possui pesos, tamanhos ou sabores cadastrados.</div>
                  )}

                  {productOptions.map((group, groupIndex) => (
                    <div className="product-option-group" key={group.id}>
                      <div className="product-option-group-head">
                        <label>
                          Nome da opção
                          <input
                            value={group.label}
                            onChange={(event) => updateOptionGroup(groupIndex, { label: event.target.value })}
                            placeholder="Ex.: Peso, tamanho ou sabor"
                          />
                        </label>
                        <label>
                          Escolha
                          <select
                            value={group.type}
                            onChange={(event) => updateOptionGroup(groupIndex, { type: event.target.value as 'single' | 'multi' })}
                          >
                            <option value="single">Uma opção</option>
                            <option value="multi">Várias opções</option>
                          </select>
                        </label>
                        {group.type === 'multi' && (
                          <>
                            <label>Mínimo<input type="number" min="0" value={group.min ?? 0} onChange={(event) => updateOptionGroup(groupIndex, { min: Number(event.target.value) })} /></label>
                            <label>Máximo<input type="number" min="1" value={group.max ?? 1} onChange={(event) => updateOptionGroup(groupIndex, { max: Number(event.target.value) })} /></label>
                          </>
                        )}
                        <label className="option-price-toggle">
                          <input
                            type="checkbox"
                            checked={group.priceMode === 'replace'}
                            onChange={(event) => updateOptionGroup(groupIndex, { priceMode: event.target.checked ? 'replace' : undefined })}
                          />
                          Preço por opção
                        </label>
                        <button
                          type="button"
                          className="remove-option"
                          onClick={() => setProductOptions((current) => current.filter((_, index) => index !== groupIndex))}
                        >
                          Remover grupo
                        </button>
                      </div>

                      <div className="product-option-choices">
                        {group.choices.map((choice, choiceIndex) => (
                          <div key={`${group.id}-${choiceIndex}`}>
                            <input
                              value={choice.label}
                              onChange={(event) => updateOptionChoice(groupIndex, choiceIndex, { label: event.target.value })}
                              placeholder="Ex.: 100g, 1L ou Ninho"
                              aria-label="Nome da opção"
                            />
                            {group.priceMode === 'replace' && (
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={choice.price ?? ''}
                                onChange={(event) => updateOptionChoice(groupIndex, choiceIndex, {
                                  price: event.target.value === '' ? undefined : Number(event.target.value),
                                })}
                                placeholder="Preço"
                                aria-label="Preço da opção"
                              />
                            )}
                            <button
                              type="button"
                              aria-label="Remover opção"
                              onClick={() => updateOptionGroup(groupIndex, {
                                choices: group.choices.filter((_, index) => index !== choiceIndex),
                              })}
                            >
                              <X size={15} />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          className="add-choice"
                          onClick={() => updateOptionGroup(groupIndex, {
                            choices: [...group.choices, { label: '', price: group.priceMode === 'replace' ? 0 : undefined }],
                          })}
                        >
                          + Adicionar item
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="admin-form-actions">
                  <button type="button" className="ghost-button" onClick={() => { setProductFormOpen(false); setProductImagePreview(''); setProductOptions([]) }}>Cancelar</button>
                  <button className="primary-button" disabled={loading}>{loading ? 'Salvando...' : 'Salvar produto'}</button>
                </div>
              </form>
            )}

            <div className="admin-product-list">
              {adminProducts.map((product) => (
                <article className={product.stockQty <= product.minStock ? 'admin-product low' : 'admin-product'} key={product.id}>
                  <img src={product.image} alt="" />
                  <div className="admin-product-info">
                    <strong>{product.name}</strong>
                    <span>{product.category} · {money(product.price)} · {product.active ? 'Ativo' : 'Inativo'}</span>
                    <b>Estoque: {product.stockQty} {product.unit}{product.stockQty <= product.minStock ? ' · Estoque baixo' : ''}</b>
                  </div>
                  <button className="ghost-button" onClick={() => openProductEditor(product)}>Editar</button>
                  <form className="stock-form" onSubmit={(event) => handleStock(event, product)}>
                    <select name="type" aria-label="Tipo de movimentação">
                      <option value="entrada">Entrada</option>
                      <option value="perda">Perda</option>
                      <option value="ajuste">Definir saldo</option>
                    </select>
                    <input name="quantity" type="number" min="0" required placeholder="Qtd." aria-label="Quantidade" />
                    <input name="note" placeholder="Observação" aria-label="Observação" />
                    <button className="primary-button" disabled={updatingId === product.id}>Aplicar</button>
                  </form>
                </article>
              ))}
            </div>

            <div className="admin-history">
              <h3>Últimas movimentações</h3>
              {movements.slice(0, 12).map((movement) => (
                <div key={movement.id}>
                  <span><b>{movement.productName}</b><small>{movement.type} · {movement.note || 'Sem observação'}</small></span>
                  <strong className={movement.quantity >= 0 ? 'positive' : 'negative'}>{movement.quantity > 0 ? '+' : ''}{movement.quantity}</strong>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'clientes' && (
          <div className="admin-module">
            <div className="admin-module-head"><div><h2>Clientes</h2><p>{customers.length} clientes cadastrados no banco.</p></div></div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead><tr><th>Nome</th><th>E-mail</th><th>Telefone</th><th>Cadastro</th></tr></thead>
                <tbody>{customers.map((customer) => (
                  <tr key={customer.id}>
                    <td><b>{customer.name}</b></td><td>{customer.email}</td><td>{customer.phone}</td>
                    <td>{new Date(customer.createdAt).toLocaleDateString('pt-BR')}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'financeiro' && (
          <div className="admin-module">
            <div className="admin-module-head"><div><h2>Financeiro</h2><p>Valores recebidos, pendentes e despesas registradas.</p></div></div>
            <div className="finance-cards">
              <article><span>Vendas</span><strong>{money(summary?.revenue ?? 0)}</strong></article>
              <article><span>Recebido</span><strong>{money(summary?.paidRevenue ?? 0)}</strong></article>
              <article><span>A receber</span><strong>{money(summary?.pendingPayments ?? 0)}</strong></article>
              <article><span>Despesas</span><strong>{money(summary?.expensesTotal ?? 0)}</strong></article>
              <article><span>Lucro estimado</span><strong>{money(summary?.profitEstimate ?? 0)}</strong></article>
            </div>
            <form className="expense-form" onSubmit={handleExpense}>
              <h3>Registrar despesa</h3>
              <input name="description" required placeholder="Descrição" />
              <input name="amount" type="number" min="0" step="0.01" required placeholder="Valor" />
              <input name="category" required placeholder="Categoria" />
              <input name="spentAt" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
              <button className="primary-button" disabled={loading}>Adicionar</button>
            </form>
            <div className="admin-history">
              <h3>Despesas</h3>
              {expenses.map((expense) => (
                <div key={expense.id}>
                  <span><b>{expense.description}</b><small>{expense.category} · {new Date(`${expense.spentAt}T12:00:00`).toLocaleDateString('pt-BR')}</small></span>
                  <strong className="negative">-{money(expense.amount)}</strong>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'pedidos' && (<>
        <div className="admin-tools">
          <label className="search">
            <Search size={18} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por pedido, cliente, telefone..."
            />
          </label>
          <div className="admin-filters">
            {(['todos', ...adminStatuses] as const).map((item) => (
              <button
                key={item}
                className={statusFilter === item ? 'active' : ''}
                onClick={() => setStatusFilter(item)}
              >
                {item === 'todos' ? 'Todos' : statusLabel[item]}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="orders-empty admin-empty">
            <span><ShoppingBag /></span>
            <h2>Nenhum pedido encontrado</h2>
            <p>Quando houver novos pedidos, eles aparecerão aqui para gestão.</p>
          </div>
        ) : (
          <div className="admin-orders">
            {filtered.map((order) => (
              <article className="admin-order-card" key={order.code}>
                <div className="admin-order-head">
                  <div>
                    <span>Pedido #{order.code}</span>
                    <h3>{order.customer?.name || 'Cliente não encontrado'}</h3>
                    <small>{new Date(order.createdAt).toLocaleString('pt-BR')}</small>
                  </div>
                  <div className="admin-order-selects">
                    <label className="admin-status-select">
                      Status do pedido
                      <select
                        value={order.status === 'confirmado' ? 'preparando' : order.status}
                        disabled={updatingId === order.id}
                        onChange={(e) => handleStatusChange(order.id, e.target.value as Order['status'])}
                      >
                        {adminStatuses.map((status) => (
                          <option key={status} value={status}>{statusLabel[status]}</option>
                        ))}
                      </select>
                    </label>
                    <label className="admin-status-select">
                      Pagamento
                      <select
                        value={order.paymentStatus || 'pendente'}
                        disabled={updatingId === order.id}
                        onChange={(e) => handlePaymentChange(order.id, e.target.value as NonNullable<Order['paymentStatus']>)}
                      >
                        <option value="pendente">Pendente</option>
                        <option value="pago">Pago</option>
                        <option value="cancelado">Cancelado</option>
                      </select>
                    </label>
                  </div>
                </div>

                <div className="admin-order-grid">
                  <div>
                    <h4>Cliente</h4>
                    <p>{order.customer?.email || '—'}</p>
                    <p>{order.customer?.phone || '—'}</p>
                  </div>
                  <div>
                    <h4>Entrega</h4>
                    <p>{order.address.street}, {order.address.number}</p>
                    <p>CEP {order.address.cep}{order.address.complement ? ` · ${order.address.complement}` : ''}</p>
                  </div>
                  <div>
                    <h4>Pagamento</h4>
                    <p>{order.payment}</p>
                    <p>Frete {money(order.shipping)}</p>
                  </div>
                </div>

                <div className="admin-order-items">
                  {order.items.map((item) => (
                    <div className="order-item" key={`${order.code}-${item.productId}-${item.name}`}>
                      <img src={item.image} alt="" />
                      <div>
                        <b>{item.name}</b>
                        <small>{item.quantity}x · {money(item.price)}</small>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="order-footer">
                  <span>{order.items.reduce((sum, item) => sum + item.quantity, 0)} itens</span>
                  <strong>{money(order.total)}</strong>
                </div>
              </article>
            ))}
          </div>
        )}
        </>)}
      </div>
    </section>
  )
}

export default App
