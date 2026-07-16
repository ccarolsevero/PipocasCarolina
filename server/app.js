import cors from 'cors'
import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  createOrder,
  findCustomerByEmail,
  findCustomerById,
  listOrdersByCustomer,
  upsertCustomer,
} from './db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isProd = process.env.NODE_ENV === 'production'
const isVercel = Boolean(process.env.VERCEL)
const SHIPPING = 8

const app = express()

app.disable('x-powered-by')
app.set('trust proxy', 1)
app.use(express.json({ limit: '100kb' }))

if (!isProd || !isVercel) {
  app.use(cors())
}

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    env: isProd ? 'production' : 'development',
    platform: isVercel ? 'vercel' : 'node',
  })
})

app.post('/api/customers', async (req, res) => {
  try {
    const { name, email, phone } = req.body || {}

    if (!name?.trim() || !email?.trim() || !phone?.trim()) {
      return res.status(400).json({ error: 'Nome, e-mail e telefone são obrigatórios.' })
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ error: 'Informe um e-mail válido.' })
    }

    const customer = await upsertCustomer({ name, email, phone })
    res.status(201).json(customer)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: error.message || 'Erro ao salvar cliente.' })
  }
})

app.get('/api/customers/:email', async (req, res) => {
  try {
    const customer = await findCustomerByEmail(req.params.email)
    if (!customer) return res.status(404).json({ error: 'Cliente não encontrado.' })
    res.json(customer)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Erro ao buscar cliente.' })
  }
})

app.post('/api/orders', async (req, res) => {
  try {
    const { customerId, items, address, payment, subtotal } = req.body || {}

    if (!customerId || !(await findCustomerById(customerId))) {
      return res.status(400).json({ error: 'Cliente inválido.' })
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Pedido inválido.' })
    }

    const invalidItem = items.some(
      (item) => !item?.name || !Number(item.price) || !Number(item.quantity) || Number(item.quantity) < 1,
    )
    if (invalidItem) {
      return res.status(400).json({ error: 'Itens do pedido inválidos.' })
    }

    if (!address?.cep || !address?.number || !address?.street) {
      return res.status(400).json({ error: 'Endereço incompleto.' })
    }

    const allowedPayments = ['Pix', 'Cartão na entrega', 'Dinheiro']
    const selectedPayment = allowedPayments.includes(payment) ? payment : 'Pix'
    const shipping = SHIPPING
    const safeSubtotal = Number(subtotal) || 0

    const order = await createOrder({
      customerId,
      items: items.map((item) => ({
        productId: Number(item.productId) || 0,
        name: String(item.name),
        price: Number(item.price),
        quantity: Number(item.quantity),
        image: String(item.image || ''),
      })),
      address: {
        cep: String(address.cep).trim(),
        number: String(address.number).trim(),
        street: String(address.street).trim(),
        complement: String(address.complement || '').trim(),
      },
      payment: selectedPayment,
      subtotal: safeSubtotal,
      shipping,
      total: safeSubtotal + shipping,
    })

    res.status(201).json(order)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: error.message || 'Erro ao criar pedido.' })
  }
})

app.get('/api/orders', async (req, res) => {
  try {
    const email = String(req.query.email || '')
    if (!email) return res.status(400).json({ error: 'Informe o e-mail do cliente.' })

    const customer = await findCustomerByEmail(email)
    if (!customer) return res.json([])

    res.json(await listOrdersByCustomer(customer.id))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Erro ao listar pedidos.' })
  }
})

if (isProd && !isVercel) {
  const distPath = path.join(__dirname, '..', 'dist')
  app.use(express.static(distPath, { maxAge: '1y', index: false }))
  app.get(/.*/, (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: 'Erro interno do servidor.' })
})

export default app
