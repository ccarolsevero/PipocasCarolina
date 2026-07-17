import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const envPath = path.join(root, '.env')

if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const index = trimmed.indexOf('=')
    if (index < 0) continue
    const key = trimmed.slice(0, index).trim()
    let value = trimmed.slice(index + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (!(key in process.env)) process.env[key] = value
  }
}

const FLAVORS = [
  'Ninho', 'Nesquik', 'Nutella', 'Milho Verde', 'Pé de Moleque',
  'Ovomaltine', 'Caramelo', 'Doritos', 'Paçoca', 'Churros',
]
const FILLINGS = ['KitKat', 'Creme', 'Ovomaltine', 'Nutella']
const flavorChoices = FLAVORS.map((label) => ({ label }))
const fillingChoices = FILLINGS.map((label) => ({ label }))

const products = [
  {
    name: 'Pipoca Gourmet',
    description: 'Escolha o tamanho e o sabor. Pipoca caramelizada artesanal.',
    price: 17,
    category: 'Tamanhos',
    unit: 'unidade',
    tag: 'Mais pedida',
    image: 'https://images.unsplash.com/photo-1585647347483-22b66260dfff?auto=format&fit=crop&w=700&q=85',
    min_quantity: 1,
    stock_qty: 100,
    min_stock: 10,
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
    name: 'Copo Gourmet',
    description: 'Copo de pipoca caramelizada. Com ou sem Nutella.',
    price: 17,
    category: 'Copos',
    unit: 'unidade',
    tag: 'Queridinho',
    image: 'https://images.unsplash.com/photo-1519869325930-281384150729?auto=format&fit=crop&w=700&q=85',
    min_quantity: 1,
    stock_qty: 80,
    min_stock: 10,
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
    name: 'Kit Degustação',
    description: '5 sabores de 30g cada para experimentar várias combinações.',
    price: 25,
    category: 'Kits',
    unit: 'kit',
    tag: 'Degustação',
    image: 'https://images.unsplash.com/photo-1582169296194-e4d644c48063?auto=format&fit=crop&w=700&q=85',
    min_quantity: 1,
    stock_qty: 50,
    min_stock: 5,
    options: [
      { id: 'flavors', label: 'Escolha 5 sabores', type: 'multi', min: 5, max: 5, choices: flavorChoices },
    ],
  },
  {
    name: 'Caixa Presente',
    description: 'Caixa com 2 sabores. Perfeita para presentear.',
    price: 30,
    category: 'Presentes',
    unit: 'caixa',
    image: 'https://images.unsplash.com/photo-1576618148400-f54bed99fcfd?auto=format&fit=crop&w=700&q=85',
    min_quantity: 1,
    stock_qty: 40,
    min_stock: 5,
    options: [
      { id: 'flavors', label: 'Escolha 2 sabores', type: 'multi', min: 2, max: 2, choices: flavorChoices },
    ],
  },
  {
    name: 'Petisqueira',
    description: 'Monte sua petisqueira com os sabores favoritos.',
    price: 45,
    category: 'Petisqueiras',
    unit: 'unidade',
    tag: 'Família',
    image: 'https://images.unsplash.com/photo-1582293041079-7814c2f12063?auto=format&fit=crop&w=700&q=85',
    min_quantity: 1,
    stock_qty: 30,
    min_stock: 5,
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
    name: 'Balde Caramelizado',
    description: 'Pipoca caramelizada com recheios especiais. Escolha até 2 recheios.',
    price: 45,
    category: 'Baldes',
    unit: 'balde',
    tag: 'Novo',
    image: 'https://images.unsplash.com/photo-1563302111-eab4b145e6c9?auto=format&fit=crop&w=700&q=85',
    min_quantity: 1,
    stock_qty: 35,
    min_stock: 5,
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
    name: 'Por Kilo',
    description: 'Pegue e monte. 1kg rende cerca de 33 saquinhos. Ideal para festas.',
    price: 170,
    category: 'Festas',
    unit: '1 kg',
    image: 'https://images.unsplash.com/photo-1582169296194-e4d644c48063?auto=format&fit=crop&w=700&q=85',
    min_quantity: 1,
    stock_qty: 20,
    min_stock: 3,
    options: [
      { id: 'flavors', label: 'Sabores desejados', type: 'multi', min: 1, max: 10, choices: flavorChoices },
    ],
  },
  {
    name: 'Saquinho Personalizado',
    description: 'Lembrancinha com cor, laço e adesivos. Pedido mínimo: 20 unidades.',
    price: 7,
    category: 'Festas',
    unit: 'unidade',
    tag: 'Festa',
    image: 'https://images.unsplash.com/photo-1576618148400-f54bed99fcfd?auto=format&fit=crop&w=700&q=85',
    min_quantity: 20,
    stock_qty: 200,
    min_stock: 40,
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

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
)

const { count } = await supabase.from('products').select('*', { count: 'exact', head: true })
if ((count || 0) > 0) {
  console.log(`Já existem ${count} produtos. Seed ignorado.`)
  process.exit(0)
}

const { data, error } = await supabase.from('products').insert(products).select('id, name, stock_qty')
if (error) {
  console.error(error)
  process.exit(1)
}

const movements = (data || []).map((product) => ({
  product_id: product.id,
  type: 'entrada',
  quantity: product.stock_qty,
  note: 'Estoque inicial',
}))

if (movements.length) {
  const { error: movementError } = await supabase.from('inventory_movements').insert(movements)
  if (movementError) {
    console.error(movementError)
    process.exit(1)
  }
}

console.log(`Seed concluído: ${data.length} produtos.`)
