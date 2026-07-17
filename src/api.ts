export type Customer = {
  id: number
  name: string
  email: string
  phone: string
  createdAt: string
}

export type OrderItem = {
  productId: number
  name: string
  price: number
  quantity: number
  image: string
}

export type Order = {
  id: number
  code: string
  customerId: number
  status: 'confirmado' | 'preparando' | 'entregando' | 'entregue' | 'cancelado'
  payment: string
  paymentStatus?: 'pendente' | 'pago' | 'cancelado'
  address: {
    cep: string
    number: string
    street: string
    complement: string
  }
  items: OrderItem[]
  subtotal: number
  shipping: number
  total: number
  createdAt: string
  updatedAt?: string
}

export type CatalogProduct = {
  id: number
  name: string
  description: string
  price: number
  category: string
  unit: string
  tag?: string
  image: string
  minQuantity: number
  options: Array<{
    id: string
    label: string
    type: 'single' | 'multi'
    choices: Array<{ label: string; price?: number }>
    min?: number
    max?: number
    priceMode?: 'replace'
  }>
  active: boolean
  stockQty: number
  minStock: number
  createdAt: string
  updatedAt: string
}

export type InventoryMovement = {
  id: number
  productId: number
  productName: string
  type: 'entrada' | 'venda' | 'ajuste' | 'perda'
  quantity: number
  note?: string
  orderId?: number
  createdAt: string
}

export type Expense = {
  id: number
  description: string
  amount: number
  category: string
  spentAt: string
  createdAt: string
}

export type AdminOrder = Order & {
  customer: Customer | null
}

export type AdminSummary = {
  totalOrders: number
  totalCustomers: number
  preparando: number
  entregando: number
  entregue: number
  cancelado: number
  revenue: number
  paidRevenue: number
  pendingPayments: number
  expensesTotal: number
  profitEstimate: number
  lowStock: number
  activeProducts: number
}

export function fetchProducts() {
  return request<CatalogProduct[]>('/api/products')
}

export type AdminSession = {
  email: string
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
    ...options,
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || 'Não foi possível concluir a operação.')
  }

  return data as T
}

export function registerCustomer(payload: { name: string; email: string; phone: string }) {
  return request<Customer>('/api/customers', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function fetchOrders(email: string) {
  return request<Order[]>(`/api/orders?email=${encodeURIComponent(email)}`)
}

export function createOrder(payload: {
  customerId: number
  items: OrderItem[]
  address: Order['address']
  payment: string
  subtotal: number
}) {
  return request<Order>('/api/orders', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function adminLogin(payload: { email: string; password: string }) {
  return request<AdminSession>('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function adminLogout() {
  return request<{ ok: boolean }>('/api/admin/logout', { method: 'POST' })
}

export function fetchAdminSession() {
  return request<AdminSession>('/api/admin/session')
}

export function fetchAdminSummary() {
  return request<AdminSummary>('/api/admin/summary')
}

export function fetchAdminOrders() {
  return request<AdminOrder[]>('/api/admin/orders')
}

export function updateAdminOrderStatus(orderId: number, status: Order['status']) {
  return request<AdminOrder>(`/api/admin/orders/${orderId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

export function updateAdminPaymentStatus(orderId: number, paymentStatus: NonNullable<Order['paymentStatus']>) {
  return request<AdminOrder>(`/api/admin/orders/${orderId}/payment`, {
    method: 'PATCH',
    body: JSON.stringify({ paymentStatus }),
  })
}

export function fetchAdminCustomers() {
  return request<Customer[]>('/api/admin/customers')
}

export function fetchAdminProducts() {
  return request<CatalogProduct[]>('/api/admin/products')
}

export function saveAdminProduct(product: Partial<CatalogProduct> & Pick<CatalogProduct, 'name' | 'price'>) {
  const path = product.id ? `/api/admin/products/${product.id}` : '/api/admin/products'
  return request<CatalogProduct>(path, {
    method: product.id ? 'PATCH' : 'POST',
    body: JSON.stringify(product),
  })
}

export function adjustAdminStock(payload: {
  productId: number
  quantity: number
  type: 'entrada' | 'ajuste' | 'perda'
  note?: string
}) {
  return request<CatalogProduct>('/api/admin/inventory', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function fetchInventoryMovements() {
  return request<InventoryMovement[]>('/api/admin/inventory')
}

export function fetchExpenses() {
  return request<Expense[]>('/api/admin/expenses')
}

export function createExpense(payload: {
  description: string
  amount: number
  category: string
  spentAt: string
}) {
  return request<Expense>('/api/admin/expenses', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
