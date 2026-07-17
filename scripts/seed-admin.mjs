import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import { upsertAdminUser } from '../server/adminAuth.js'

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

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL_NON_POOLING
if (!connectionString) {
  console.error('DATABASE_URL não configurada.')
  process.exit(1)
}

const sql = fs.readFileSync(path.join(root, 'supabase/admins.sql'), 'utf8')
const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } })
await client.connect()
try {
  await client.query(sql)
  console.log('Tabela admins pronta.')
} finally {
  await client.end()
}

const email = process.env.ADMIN_EMAIL || 'admin@pipocascarolinas.com'
const password = process.env.ADMIN_PASSWORD || 'PipocasAdmin2026!'
const name = process.env.ADMIN_NAME || 'Administrador Pipocas'

const admin = await upsertAdminUser({ email, password, name })
console.log(`Admin cadastrado: ${admin.email}`)
