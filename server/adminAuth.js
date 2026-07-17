import { createHmac, timingSafeEqual } from 'node:crypto'

const COOKIE_NAME = 'pc_admin_session'
const SESSION_TTL_MS = 12 * 60 * 60 * 1000

function getAdminConfig() {
  const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase()
  const password = String(process.env.ADMIN_PASSWORD || '')
  const secret = String(process.env.ADMIN_SESSION_SECRET || '')
  return { email, password, secret, configured: Boolean(email && password && secret) }
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

export function loginAdmin(email, password) {
  const config = getAdminConfig()
  if (!config.configured) {
    return { ok: false, error: 'Painel administrativo ainda não configurado.' }
  }

  const normalizedEmail = String(email || '').trim().toLowerCase()
  const validEmail = safeEqual(normalizedEmail, config.email)
  const validPassword = safeEqual(String(password || ''), config.password)

  if (!validEmail || !validPassword) {
    return { ok: false, error: 'E-mail ou senha inválidos.' }
  }

  return {
    ok: true,
    token: createSessionToken(config.email, config.secret),
    email: config.email,
  }
}

export function readAdminSession(req) {
  const config = getAdminConfig()
  if (!config.configured) return null

  const cookies = parseCookies(req.headers.cookie)
  const session = verifySessionToken(cookies[COOKIE_NAME], config.secret)
  if (!session || session.email !== config.email) return null
  return session
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
