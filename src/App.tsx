import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import {
  ArrowRight, AtSign, Check, ChevronRight, Clock3, LockKeyhole,
  MapPin, Menu, Minus, PackageCheck, Plus, Search, ShoppingBag,
  Sparkles, Star, Trash2, UserRound, Wheat, X,
} from 'lucide-react'
import { createOrder, fetchOrders, registerCustomer } from './api'
import type { Customer, Order } from './api'
import './App.css'

type Product = {
  id: number
  name: string
  description: string
  price: number
  category: string
  image: string
  tag?: string
}

type CartItem = Product & { quantity: number }

const SHIPPING = 8

const products: Product[] = [
  { id: 1, name: 'Caramelo Carolina', description: 'Nossa clássica pipoca caramelizada, crocante e douradinha.', price: 18, category: 'Doces', tag: 'Mais pedida', image: 'https://images.unsplash.com/photo-1585647347483-22b66260dfff?auto=format&fit=crop&w=700&q=85' },
  { id: 2, name: 'Leite Ninho', description: 'Coberta com chocolate branco e uma chuva de leite em pó.', price: 22, category: 'Gourmet', tag: 'Queridinha', image: 'https://images.unsplash.com/photo-1578849278619-e73505e9610f?auto=format&fit=crop&w=700&q=85' },
  { id: 3, name: 'Choco Crocante', description: 'Chocolate ao leite, cacau e crocância em cada mordida.', price: 22, category: 'Gourmet', image: 'https://images.unsplash.com/photo-1563302111-eab4b145e6c9?auto=format&fit=crop&w=700&q=85' },
  { id: 4, name: 'Paçoca Cremosa', description: 'O sabor brasileiro da paçoca com toque de chocolate branco.', price: 24, category: 'Especiais', tag: 'Novo', image: 'https://images.unsplash.com/photo-1576618148400-f54bed99fcfd?auto=format&fit=crop&w=700&q=85' },
  { id: 5, name: 'Morango Encantado', description: 'Chocolate sabor morango com confeitos delicados.', price: 24, category: 'Especiais', image: 'https://images.unsplash.com/photo-1519869325930-281384150729?auto=format&fit=crop&w=700&q=85' },
  { id: 6, name: 'Salgada da Casa', description: 'Manteiga, ervas finas e o tempero secreto da Carolina.', price: 16, category: 'Salgadas', image: 'https://images.unsplash.com/photo-1578849278619-e73505e9610f?auto=format&fit=crop&w=700&q=85' },
  { id: 7, name: 'Kit Degustação', description: 'Quatro sabores em tamanhos perfeitos para compartilhar.', price: 48, category: 'Kits', tag: 'Economize', image: 'https://images.unsplash.com/photo-1582169296194-e4d644c48063?auto=format&fit=crop&w=700&q=85' },
  { id: 8, name: 'Festa Carolina', description: 'Dez porções individuais personalizadas para a sua festa.', price: 75, category: 'Kits', image: 'https://images.unsplash.com/photo-1582293041079-7814c2f12063?auto=format&fit=crop&w=700&q=85' },
]

const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const statusLabel: Record<Order['status'], string> = {
  confirmado: 'Confirmado',
  preparando: 'Em preparo',
  entregando: 'Saiu para entrega',
  entregue: 'Entregue',
}

function Logo() {
  return (
    <button className="logo" onClick={() => { location.hash = 'inicio' }} aria-label="Pipocas Carolina - início">
      <img src="/logo-pipocas-carolinas-red.png" alt="Pipocas Carolinas — Pipocas Gourmet" />
    </button>
  )
}

function App() {
  const [page, setPage] = useState<'inicio' | 'cardapio' | 'pedidos'>('inicio')
  const [cart, setCart] = useState<CartItem[]>(() => JSON.parse(localStorage.getItem('pc-cart') || '[]'))
  const [user, setUser] = useState<Customer | null>(() => {
    const saved = JSON.parse(localStorage.getItem('pc-user') || 'null')
    if (!saved?.id || !saved?.email) {
      localStorage.removeItem('pc-user')
      return null
    }
    return saved
  })
  const [orders, setOrders] = useState<Order[]>([])
  const [cartOpen, setCartOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [category, setCategory] = useState('Todos')
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const navigate = () => {
      const hash = location.hash.replace('#', '')
      setPage(hash === 'cardapio' || hash === 'pedidos' ? hash : 'inicio')
      setMobileOpen(false)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
    navigate()
    window.addEventListener('hashchange', navigate)
    return () => window.removeEventListener('hashchange', navigate)
  }, [])

  useEffect(() => localStorage.setItem('pc-cart', JSON.stringify(cart)), [cart])

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
  const filtered = products.filter((product) =>
    (category === 'Todos' || product.category === category) &&
    product.name.toLowerCase().includes(search.toLowerCase()),
  )

  function addToCart(product: Product) {
    setCart((current) => {
      const found = current.find((item) => item.id === product.id)
      return found
        ? current.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
        : [...current, { ...product, quantity: 1 }]
    })
    setToast(`${product.name} foi para a sacola!`)
  }

  function changeQuantity(id: number, amount: number) {
    setCart((current) => current
      .map((item) => item.id === id ? { ...item, quantity: item.quantity + amount } : item)
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
          name: item.name,
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
      <div className="topbar"><Sparkles size={14} /> Feitas artesanalmente, com afeto e ingredientes selecionados <Sparkles size={14} /></div>
      <header>
        <div className="container nav-wrap">
          <Logo />
          <nav className={mobileOpen ? 'open' : ''}>
            <a className={page === 'inicio' ? 'active' : ''} href="#inicio">Início</a>
            <a className={page === 'cardapio' ? 'active' : ''} href="#cardapio">Cardápio</a>
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
        {page === 'inicio' && <Home addToCart={addToCart} />}
        {page === 'cardapio' && (
          <section className="menu-page">
            <div className="page-hero">
              <span className="eyebrow">Um sabor para cada momento</span>
              <h1>Nosso cardápio</h1>
              <p>Escolha suas favoritas. Cada pacote é preparado fresquinho especialmente para você.</p>
            </div>
            <div className="container menu-tools">
              <div className="categories">
                {['Todos', 'Doces', 'Gourmet', 'Especiais', 'Salgadas', 'Kits'].map((item) =>
                  <button className={category === item ? 'active' : ''} key={item} onClick={() => setCategory(item)}>{item}</button>,
                )}
              </div>
              <label className="search"><Search size={18} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar sabor..." /></label>
            </div>
            <div className="container product-grid menu-grid">
              {filtered.map((product) => <ProductCard key={product.id} product={product} onAdd={addToCart} />)}
            </div>
          </section>
        )}
        {page === 'pedidos' && <Orders user={user} orders={orders} onLogin={() => setAuthOpen(true)} />}
      </main>

      <footer>
        <div className="container footer-grid">
          <div><Logo /><p>Pipocas artesanais que transformam momentos simples em memórias deliciosas.</p><a className="social" href="https://instagram.com" target="_blank" rel="noreferrer"><AtSign size={18} /> @pipocascarolina</a></div>
          <div><h4>Navegue</h4><a href="#inicio">Início</a><a href="#cardapio">Cardápio</a><a href="#pedidos">Meus pedidos</a></div>
          <div><h4>Atendimento</h4><span>Terça a domingo</span><span>14h às 21h</span><span>(11) 99999-0000</span></div>
          <div><h4>Receba novidades</h4><p>Sabores novos e promoções no seu e-mail.</p><form className="newsletter" onSubmit={(e) => { e.preventDefault(); setToast('E-mail cadastrado com sucesso!') }}><input type="email" required placeholder="Seu melhor e-mail" /><button aria-label="Cadastrar e-mail"><ArrowRight size={18} /></button></form></div>
        </div>
        <div className="footer-bottom container">© 2026 Pipocas Carolina <span>Feito com carinho em cada detalhe ♥</span></div>
      </footer>

      {cartOpen && <CartDrawer cart={cart} subtotal={subtotal} onClose={() => setCartOpen(false)} onChange={changeQuantity} onCheckout={startCheckout} />}
      {authOpen && <AuthModal user={user} loading={loading} onClose={() => setAuthOpen(false)} onSubmit={handleAuth} onLogout={logout} />}
      {checkoutOpen && user && <CheckoutModal user={user} subtotal={subtotal} loading={loading} onClose={() => setCheckoutOpen(false)} onSubmit={finishOrder} />}
      {toast && <div className="toast"><Check size={18} />{toast}</div>}
    </div>
  )
}

function Home({ addToCart }: { addToCart: (product: Product) => void }) {
  return (
    <>
      <section className="hero-section">
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="eyebrow"><Sparkles size={15} /> Felicidade em forma de pipoca</span>
            <h1>Pequenos grãos,<br /><em>grandes momentos.</em></h1>
            <p>Pipocas gourmet feitas à mão, com ingredientes especiais e uma dose generosa de carinho.</p>
            <div className="hero-actions"><a className="primary-button" href="#cardapio">Ver cardápio <ArrowRight size={19} /></a><a className="text-link" href="#historia">Conheça nossa história <ChevronRight size={18} /></a></div>
            <div className="hero-proof"><div className="avatars"><span>CA</span><span>MP</span><span>LU</span></div><div><div className="stars"><Star size={14} fill="currentColor" /><Star size={14} fill="currentColor" /><Star size={14} fill="currentColor" /><Star size={14} fill="currentColor" /><Star size={14} fill="currentColor" /></div><small>+500 clientes apaixonados</small></div></div>
          </div>
          <div className="hero-visual">
            <div className="hero-blob"></div>
            <img src="https://images.unsplash.com/photo-1585647347483-22b66260dfff?auto=format&fit=crop&w=1000&q=90" alt="Pipoca gourmet caramelizada Pipocas Carolina" />
            <div className="floating-card float-one"><span>Feito à mão</span><Wheat size={19} /></div>
            <div className="floating-card float-two"><b>100%</b><span>artesanal</span></div>
            <i className="pop pop-1"></i><i className="pop pop-2"></i><i className="pop pop-3"></i>
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
          <div className="product-grid">{products.slice(0, 4).map((product) => <ProductCard key={product.id} product={product} onAdd={addToCart} />)}</div>
        </div>
      </section>

      <section id="historia" className="story"><div className="container story-grid">
        <div className="story-images"><img className="story-main" src="https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=900&q=85" alt="Produção artesanal na cozinha" /><div className="story-note"><em>“</em><p>Tudo fica mais gostoso quando é feito com amor.</p></div></div>
        <div className="story-copy"><span className="eyebrow">A nossa história</span><h2>De uma receita de família para a sua casa</h2><p>A Pipocas Carolina nasceu na cozinha de casa, entre conversas, risadas e aquela vontade de transformar uma receita querida em algo para compartilhar.</p><p>Hoje, cada pacote ainda é preparado do mesmo jeito: em pequenos lotes, com atenção aos detalhes e aquele toque caseiro que faz toda diferença.</p><div className="signature">Carolina <span>fundadora & pipoqueira</span></div></div>
      </div></section>

      <section className="cta"><div className="container cta-inner"><div><span className="eyebrow">Já escolheu a sua?</span><h2>Seu momento merece mais sabor.</h2><p>Monte seu pedido agora e receba suas pipocas fresquinhas em casa.</p></div><a className="light-button" href="#cardapio">Quero minhas pipocas <ArrowRight size={19} /></a></div></section>
    </>
  )
}

function ProductCard({ product, onAdd }: { product: Product; onAdd: (product: Product) => void }) {
  return (
    <article className="product-card">
      <div className="product-image"><img src={product.image} alt={product.name} />{product.tag && <span>{product.tag}</span>}<button onClick={() => onAdd(product)} aria-label={`Adicionar ${product.name}`}><Plus size={20} /></button></div>
      <div className="product-info"><small>{product.category}</small><h3>{product.name}</h3><p>{product.description}</p><div><strong>{money(product.price)}</strong><span>pacote 150g</span></div></div>
    </article>
  )
}

function CartDrawer({ cart, subtotal, onClose, onChange, onCheckout }: { cart: CartItem[]; subtotal: number; onClose: () => void; onChange: (id: number, amount: number) => void; onCheckout: () => void }) {
  return (
    <div className="overlay" onMouseDown={onClose}>
      <aside className="drawer" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head"><div><span className="eyebrow">Sua seleção</span><h2>Minha sacola</h2></div><button onClick={onClose}><X /></button></div>
        {cart.length === 0 ? (
          <div className="empty"><span><ShoppingBag /></span><h3>Sua sacola está vazia</h3><p>Que tal escolher um sabor para deixar o dia mais gostoso?</p><button className="primary-button" onClick={() => { onClose(); location.hash = 'cardapio' }}>Explorar cardápio</button></div>
        ) : (
          <>
            <div className="cart-list">{cart.map((item) => (
              <div className="cart-item" key={item.id}>
                <img src={item.image} alt="" />
                <div className="cart-item-info">
                  <h4>{item.name}</h4>
                  <span>{money(item.price)}</span>
                  <div className="quantity">
                    <button onClick={() => onChange(item.id, -1)}>{item.quantity === 1 ? <Trash2 size={14} /> : <Minus size={14} />}</button>
                    <b>{item.quantity}</b>
                    <button onClick={() => onChange(item.id, 1)}><Plus size={14} /></button>
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

export default App
