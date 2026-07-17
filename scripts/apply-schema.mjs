import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

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

const sql = fs.readFileSync(path.join(root, 'supabase/schema.sql'), 'utf8')
const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL_NON_POOLING

if (!connectionString) {
  console.error('DATABASE_URL não configurada.')
  process.exit(1)
}

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
})
await client.connect()
try {
  await client.query(sql)
  console.log('Schema aplicado com sucesso.')
} finally {
  await client.end()
}
