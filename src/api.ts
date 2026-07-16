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
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
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
