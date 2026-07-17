import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { getSupabaseAdmin, hasSupabase } from './supabase.js'

const COOKIE_NAME = 'pc_admin_session'
const SESSION_TTL_MS = 12 * 60 * 60 * 1000

function getSessionSecret() {
  return (
    process.env.ADMIN_SESSION_SECRET ||
    process.env.SUPABASE_JWT_SECRET ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    ''
  )
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a))
  const right = Buffer.from(String(b))
  if (left.length !== right.length) {
    timingSafeEqual(left, left)
    return false
  }
  return timingSafeEqual(left, right)
}

function sign(value, secret) {
  return createHmac('sha256', secret).update(value).digest('base64url')
}

function createSessionToken(email, secret) {
  const payload = Buffer.from(JSON.stringify({
    email,
    exp: Date.now() + SESSION_TTL_MS,
  })).toString('base64url')
  return `${payload}.${sign(payload, secret)}`
}

function verifySessionToken(token, secret) {
  if (!token || !secret) return null
  const [payload, signature] = String(token).split('.')
  if (!payload || !signature) return null
  if (!safeEqual(signature, sign(payload, secret))) return null

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (!data?.email || !data?.exp || Date.now() > Number(data.exp)) return null
    return { email: String(data.email).toLowerCase() }
  } catch {
    return null
  }
}

function parseCookies(header = '') {
  return Object.fromEntries(
    String(header)
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf('=')
        if (index < 0) return [part, '']
        return [part.slice(0, index), decodeURIComponent(part.slice(index + 1))]
      }),
  )
}

function buildCookie(value, { clear = false, secure = false } = {}) {
  const parts = [
    `${COOKIE_NAME}=${clear ? '' : encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
  ]

  if (clear) parts.push('Max-Age=0')
  else parts.push(`Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`)

  if (secure) parts.push('Secure')
  return parts.join('; ')
}

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(String(password), salt, 64).toString('hex')
  return `scrypt$${salt}$${hash}`
}

export function verifyPassword(password, stored) {
  const [algo, salt, hash] = String(stored || '').split('$')
  if (algo !== 'scrypt' || !salt || !hash) return false
  const next = scryptSync(String(password), salt, 64).toString('hex')
  return safeEqual(next, hash)
}

async function findAdminByEmail(email) {
  if (!hasSupabase()) return null
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('admins')
    .select('*')
    .eq('email', email.trim().toLowerCase())
    .eq('active', true)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data
}

function envAdminLogin(email, password) {
  const envEmail = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase()
  const envPassword = String(process.env.ADMIN_PASSWORD || '')
  const secret = getSessionSecret()

  if (!envEmail || !envPassword || !secret) return null

  const normalizedEmail = String(email || '').trim().toLowerCase()
  const validEmail = safeEqual(normalizedEmail, envEmail)
  const validPassword = safeEqual(String(password || ''), envPassword)
  if (!validEmail || !validPassword) {
    return { ok: false, error: 'E-mail ou senha inválidos.' }
  }

  return {
    ok: true,
    token: createSessionToken(envEmail, secret),
    email: envEmail,
  }
}

export async function loginAdmin(email, password) {
  const secret = getSessionSecret()
  if (!secret) {
    return { ok: false, error: 'Painel administrativo ainda não configurado.' }
  }

  const normalizedEmail = String(email || '').trim().toLowerCase()
  const envResult = envAdminLogin(email, password)
  if (envResult?.ok) return envResult

  try {
    const admin = await findAdminByEmail(normalizedEmail)
    if (admin && verifyPassword(password, admin.password_hash)) {
      return {
        ok: true,
        token: createSessionToken(admin.email, secret),
        email: admin.email,
      }
    }
  } catch (error) {
    console.error(error)
  }

  if (envResult && !envResult.ok) return envResult
  return { ok: false, error: 'E-mail ou senha inválidos.' }
}

export async function upsertAdminUser({ email, password, name = 'Administrador' }) {
  const supabase = getSupabaseAdmin()
  const normalizedEmail = String(email).trim().toLowerCase()
  const passwordHash = hashPassword(password)

  const { data, error } = await supabase
    .from('admins')
    .upsert(
      {
        email: normalizedEmail,
        name: String(name).trim() || 'Administrador',
        password_hash: passwordHash,
        active: true,
      },
      { onConflict: 'email' },
    )
    .select('id, email, name, active, created_at')
    .single()

  if (error) throw new Error(error.message)
  return data
}

export function readAdminSession(req) {
  const secret = getSessionSecret()
  if (!secret) return null

  const cookies = parseCookies(req.headers.cookie)
  return verifySessionToken(cookies[COOKIE_NAME], secret)
}

export function setAdminSessionCookie(res, token, isProd) {
  res.setHeader('Set-Cookie', buildCookie(token, { secure: isProd }))
}

export function clearAdminSessionCookie(res, isProd) {
  res.setHeader('Set-Cookie', buildCookie('', { clear: true, secure: isProd }))
}

export function requireAdmin(req, res, next) {
  const session = readAdminSession(req)
  if (!session) {
    return res.status(401).json({ error: 'Acesso administrativo não autorizado.' })
  }
  req.admin = session
  next()
}

export function fingerprintSecret() {
  const secret = getSessionSecret()
  if (!secret) return null
  return createHash('sha256').update(secret).digest('hex').slice(0, 12)
}
