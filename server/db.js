import { getSupabaseAdmin, hasSupabase } from './supabase.js'

function mapCustomer(row) {
  if (!row) return null
  return {
    id: Number(row.id),
    name: row.name,
    email: row.email,
    phone: row.phone,
    birthDate: row.birth_date || null,
    createdAt: row.created_at,
  }
}

function mapProduct(row) {
  if (!row) return null
  return {
    id: Number(row.id),
    name: row.name,
    description: row.description || '',
    price: Number(row.price),
    category: row.category,
    unit: row.unit,
    tag: row.tag || undefined,
    image: row.image || '',
    minQuantity: Number(row.min_quantity) || 1,
    options: Array.isArray(row.options) ? row.options : [],
    active: Boolean(row.active),
    featured: Boolean(row.featured),
    stockQty: Number(row.stock_qty) || 0,
    minStock: Number(row.min_stock) || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapOrder(row, customer = null, items = null) {
  if (!row) return null
  return {
    id: Number(row.id),
    code: row.code,
    customerId: Number(row.customer_id),
    status: row.status,
    payment: row.payment,
    paymentStatus: row.payment_status,
    address: row.address || {},
    items: (items || []).map((item) => ({
      productId: Number(item.product_id) || 0,
      name: item.name,
      price: Number(item.price),
      quantity: Number(item.quantity),
      image: item.image || '',
    })),
    subtotal: Number(row.subtotal),
    shipping: Number(row.shipping),
    total: Number(row.total),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    customer: customer ? mapCustomer(customer) : null,
  }
}

function requireSupabase() {
  if (!hasSupabase()) {
    throw new Error('Supabase não configurado.')
  }
  return getSupabaseAdmin()
}

export async function upsertCustomer({ name, email, phone, birthDate }) {
  const supabase = requireSupabase()
  const normalized = email.trim().toLowerCase()
  const existing = await findCustomerByEmail(normalized)
  const payload = {
    name: name.trim(),
    phone: phone.trim(),
    birth_date: birthDate || null,
  }

  if (existing) {
    const { data, error } = await supabase
      .from('customers')
      .update(payload)
      .eq('id', existing.id)
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    return mapCustomer(data)
  }

  const { data, error } = await supabase
    .from('customers')
    .insert({ ...payload, email: normalized })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return mapCustomer(data)
}

export async function findCustomerByEmail(email) {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle()
  if (error) throw new Error(error.message)
  return mapCustomer(data)
}

export async function findCustomerById(id) {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', Number(id))
    .maybeSingle()
  if (error) throw new Error(error.message)
  return mapCustomer(data)
}

export async function listCustomers() {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data || []).map(mapCustomer)
}

export async function listProducts({ activeOnly = false } = {}) {
  const supabase = requireSupabase()
  let query = supabase.from('products').select('*').order('id', { ascending: true })
  if (activeOnly) query = query.eq('active', true)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data || []).map(mapProduct)
}

export async function createProduct(payload) {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('products')
    .insert({
      name: payload.name.trim(),
      description: String(payload.description || '').trim(),
      price: Number(payload.price),
      category: String(payload.category || 'Geral').trim(),
      unit: String(payload.unit || 'unidade').trim(),
      tag: payload.tag ? String(payload.tag).trim() : null,
      image: String(payload.image || '').trim(),
      min_quantity: Number(payload.minQuantity) || 1,
      options: payload.options || [],
      active: payload.active !== false,
      featured: payload.featured === true,
      stock_qty: Number(payload.stockQty) || 0,
      min_stock: Number(payload.minStock) || 5,
    })
    .select('*')
    .single()
  if (error) throw new Error(error.message)

  if (Number(payload.stockQty) > 0) {
    await supabase.from('inventory_movements').insert({
      product_id: data.id,
      type: 'entrada',
      quantity: Number(payload.stockQty),
      note: 'Estoque inicial',
    })
  }

  return mapProduct(data)
}

export async function updateProduct(id, payload) {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('products')
    .update({
      name: payload.name.trim(),
      description: String(payload.description || '').trim(),
      price: Number(payload.price),
      category: String(payload.category || 'Geral').trim(),
      unit: String(payload.unit || 'unidade').trim(),
      tag: payload.tag ? String(payload.tag).trim() : null,
      image: String(payload.image || '').trim(),
      min_quantity: Number(payload.minQuantity) || 1,
      options: payload.options || [],
      active: payload.active !== false,
      featured: payload.featured === true,
      min_stock: Number(payload.minStock) || 0,
    })
    .eq('id', Number(id))
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return mapProduct(data)
}

export async function adjustStock({ productId, quantity, type, note }) {
  const supabase = requireSupabase()
  const qty = Number(quantity)
  if (!Number.isFinite(qty) || qty === 0) throw new Error('Quantidade inválida.')

  const allowed = new Set(['entrada', 'ajuste', 'perda'])
  if (!allowed.has(type)) throw new Error('Tipo de movimentação inválido.')

  const { data: product, error: productError } = await supabase
    .from('products')
    .select('*')
    .eq('id', Number(productId))
    .single()
  if (productError) throw new Error(productError.message)

  let nextStock = Number(product.stock_qty)
  if (type === 'entrada') nextStock += Math.abs(qty)
  else if (type === 'perda') nextStock -= Math.abs(qty)
  else nextStock = qty

  if (nextStock < 0) throw new Error('Estoque não pode ficar negativo.')

  const movementQty = type === 'ajuste'
    ? nextStock - Number(product.stock_qty)
    : type === 'entrada'
      ? Math.abs(qty)
      : -Math.abs(qty)

  const { data: updated, error: updateError } = await supabase
    .from('products')
    .update({ stock_qty: nextStock })
    .eq('id', Number(productId))
    .select('*')
    .single()
  if (updateError) throw new Error(updateError.message)

  await supabase.from('inventory_movements').insert({
    product_id: Number(productId),
    type,
    quantity: movementQty,
    note: note || null,
  })

  return mapProduct(updated)
}

export async function listInventoryMovements(limit = 50) {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('inventory_movements')
    .select('*, products(name)')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(error.message)
  return (data || []).map((row) => ({
    id: Number(row.id),
    productId: Number(row.product_id),
    productName: row.products?.name || '',
    type: row.type,
    quantity: Number(row.quantity),
    note: row.note,
    orderId: row.order_id ? Number(row.order_id) : null,
    createdAt: row.created_at,
  }))
}

export async function createOrder({ customerId, items, address, payment, subtotal, shipping, total }) {
  const supabase = requireSupabase()
  const { data, error } = await supabase.rpc('create_order_with_stock', {
    p_customer_id: Number(customerId),
    p_items: items.map((item) => ({
      productId: Number(item.productId) || 0,
      name: String(item.name),
      price: Number(item.price),
      quantity: Number(item.quantity),
      image: String(item.image || ''),
    })),
    p_address: address,
    p_payment: payment,
    p_subtotal: Number(subtotal) || 0,
    p_shipping: Number(shipping) || 0,
    p_total: Number(total) || 0,
  })

  if (error) throw new Error(error.message)
  const order = await getOrderById(data.id)
  return order
}

async function getOrderById(id) {
  const supabase = requireSupabase()
  const { data: order, error } = await supabase
    .from('orders')
    .select('*, customers(*), order_items(*)')
    .eq('id', Number(id))
    .single()
  if (error) throw new Error(error.message)
  return mapOrder(order, order.customers, order.order_items)
}

export async function listOrdersByCustomer(customerId) {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('customer_id', Number(customerId))
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data || []).map((row) => mapOrder(row, null, row.order_items))
}

export async function listAllOrdersWithCustomers() {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('orders')
    .select('*, customers(*), order_items(*)')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data || []).map((row) => mapOrder(row, row.customers, row.order_items))
}

export async function updateOrderStatus(orderId, status) {
  const allowed = new Set(['preparando', 'entregando', 'entregue', 'cancelado'])
  if (!allowed.has(status)) throw new Error('Status inválido.')

  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', Number(orderId))
    .select('*, customers(*), order_items(*)')
    .single()
  if (error) throw new Error(error.message)
  return mapOrder(data, data.customers, data.order_items)
}

export async function updatePaymentStatus(orderId, paymentStatus) {
  const allowed = new Set(['pendente', 'pago', 'cancelado'])
  if (!allowed.has(paymentStatus)) throw new Error('Status de pagamento inválido.')

  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('orders')
    .update({ payment_status: paymentStatus, updated_at: new Date().toISOString() })
    .eq('id', Number(orderId))
    .select('*, customers(*), order_items(*)')
    .single()
  if (error) throw new Error(error.message)
  return mapOrder(data, data.customers, data.order_items)
}

export async function listExpenses() {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .order('spent_at', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data || []).map((row) => ({
    id: Number(row.id),
    description: row.description,
    amount: Number(row.amount),
    category: row.category,
    spentAt: row.spent_at,
    createdAt: row.created_at,
  }))
}

export async function createExpense({ description, amount, category, spentAt }) {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('expenses')
    .insert({
      description: description.trim(),
      amount: Number(amount),
      category: String(category || 'Geral').trim(),
      spent_at: spentAt || new Date().toISOString().slice(0, 10),
    })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return {
    id: Number(data.id),
    description: data.description,
    amount: Number(data.amount),
    category: data.category,
    spentAt: data.spent_at,
    createdAt: data.created_at,
  }
}

export async function getAdminSummary() {
  const supabase = requireSupabase()
  const [{ data: orders, error: ordersError }, { count: customersCount, error: customersError }, { data: products, error: productsError }, { data: expenses, error: expensesError }] = await Promise.all([
    supabase.from('orders').select('status, payment_status, total'),
    supabase.from('customers').select('*', { count: 'exact', head: true }),
    supabase.from('products').select('id, stock_qty, min_stock, active'),
    supabase.from('expenses').select('amount'),
  ])

  if (ordersError) throw new Error(ordersError.message)
  if (customersError) throw new Error(customersError.message)
  if (productsError) throw new Error(productsError.message)
  if (expensesError) throw new Error(expensesError.message)

  const summary = {
    totalOrders: orders?.length || 0,
    totalCustomers: customersCount || 0,
    preparando: 0,
    entregando: 0,
    entregue: 0,
    cancelado: 0,
    revenue: 0,
    paidRevenue: 0,
    pendingPayments: 0,
    expensesTotal: 0,
    lowStock: 0,
    activeProducts: 0,
  }

  for (const order of orders || []) {
    if (order.status in summary) summary[order.status] += 1
    const total = Number(order.total) || 0
    if (order.status !== 'cancelado') summary.revenue += total
    if (order.payment_status === 'pago') summary.paidRevenue += total
    if (order.payment_status === 'pendente' && order.status !== 'cancelado') summary.pendingPayments += total
  }

  for (const expense of expenses || []) {
    summary.expensesTotal += Number(expense.amount) || 0
  }

  for (const product of products || []) {
    if (product.active) summary.activeProducts += 1
    if (product.active && Number(product.stock_qty) <= Number(product.min_stock)) summary.lowStock += 1
  }

  summary.profitEstimate = summary.paidRevenue - summary.expensesTotal
  return summary
}
