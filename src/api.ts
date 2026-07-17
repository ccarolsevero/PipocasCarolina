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
  status: 'confirmado' | 'preparando' | 'entregando' | 'entregue'
  payment: string
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

export type AdminOrder = Order & {
  customer: Customer | null
}

export type AdminSummary = {
  totalOrders: number
  totalCustomers: number
  preparando: number
  entregando: number
  entregue: number
  revenue: number
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
