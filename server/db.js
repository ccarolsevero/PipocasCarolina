import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isVercel = Boolean(process.env.VERCEL)
const hasUpstash = Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)

const dataDir = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : isVercel
    ? '/tmp'
    : path.join(__dirname, '..', 'data')

const dbPath = path.join(dataDir, 'pipocas.json')
const emptyDb = () => ({ customers: [], orders: [], nextCustomerId: 1, nextOrderId: 1 })

function ensureDb() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })
  if (!fs.existsSync(dbPath)) {
    writeDbSync(emptyDb())
  }
}

function writeDbSync(db) {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })
  const tempPath = `${dbPath}.tmp`
  fs.writeFileSync(tempPath, JSON.stringify(db, null, 2))
  fs.renameSync(tempPath, dbPath)
}

async function getRedis() {
  const { Redis } = await import('@upstash/redis')
  return Redis.fromEnv()
}

async function readDb() {
  if (hasUpstash) {
    const redis = await getRedis()
    return (await redis.get('pipocas-db')) || emptyDb()
  }

  ensureDb()
  return JSON.parse(fs.readFileSync(dbPath, 'utf8'))
}

async function writeDb(db) {
  if (hasUpstash) {
    const redis = await getRedis()
    await redis.set('pipocas-db', db)
    return
  }

  writeDbSync(db)
}

export async function upsertCustomer({ name, email, phone }) {
  const db = await readDb()
  const normalized = email.trim().toLowerCase()
  let customer = db.customers.find((c) => c.email === normalized)

  if (customer) {
    customer = { ...customer, name: name.trim(), phone: phone.trim() }
    db.customers = db.customers.map((c) => (c.id === customer.id ? customer : c))
  } else {
    customer = {
      id: db.nextCustomerId++,
      name: name.trim(),
      email: normalized,
      phone: phone.trim(),
      createdAt: new Date().toISOString(),
    }
    db.customers.push(customer)
  }

  await writeDb(db)
  return customer
}

export async function findCustomerByEmail(email) {
  const db = await readDb()
  return db.customers.find((c) => c.email === email.trim().toLowerCase()) || null
}

export async function findCustomerById(id) {
  const db = await readDb()
  return db.customers.find((c) => c.id === Number(id)) || null
}

export async function createOrder({ customerId, items, address, payment, subtotal, shipping, total }) {
  const db = await readDb()
  const code = `PC${String(db.nextOrderId).padStart(4, '0')}`

  const order = {
    id: db.nextOrderId++,
    code,
    customerId,
    status: 'preparando',
    payment,
    address,
    items,
    subtotal,
    shipping,
    total,
    createdAt: new Date().toISOString(),
  }

  db.orders.unshift(order)
  await writeDb(db)
  return order
}

export async function listOrdersByCustomer(customerId) {
  const db = await readDb()
  return db.orders.filter((o) => o.customerId === customerId)
}

export async function listAllOrdersWithCustomers() {
  const db = await readDb()
  const customersById = new Map(db.customers.map((customer) => [customer.id, customer]))

  return db.orders.map((order) => ({
    ...order,
    customer: customersById.get(order.customerId) || null,
  }))
}

export async function getAdminSummary() {
  const db = await readDb()
  const summary = {
    totalOrders: db.orders.length,
    totalCustomers: db.customers.length,
    preparando: 0,
    entregando: 0,
    entregue: 0,
    revenue: 0,
  }

  for (const order of db.orders) {
    if (order.status in summary) summary[order.status] += 1
    summary.revenue += Number(order.total) || 0
  }

  return summary
}

const ALLOWED_STATUSES = new Set(['preparando', 'entregando', 'entregue'])

export async function updateOrderStatus(orderId, status) {
  if (!ALLOWED_STATUSES.has(status)) {
    throw new Error('Status inválido.')
  }

  const db = await readDb()
  const index = db.orders.findIndex((order) => order.id === Number(orderId))
  if (index < 0) return null

  db.orders[index] = {
    ...db.orders[index],
    status,
    updatedAt: new Date().toISOString(),
  }

  await writeDb(db)

  const customer = db.customers.find((item) => item.id === db.orders[index].customerId) || null
  return { ...db.orders[index], customer }
}
