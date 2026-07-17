import { randomUUID } from 'node:crypto'
import { getSupabaseAdmin } from './supabase.js'

const BUCKET = 'product-images'
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

async function ensureProductBucket(supabase) {
  const { data, error } = await supabase.storage.getBucket(BUCKET)
  if (data) return
  if (error && !String(error.message).toLowerCase().includes('not found')) {
    throw new Error(error.message)
  }

  const { error: createError } = await supabase.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: 5 * 1024 * 1024,
    allowedMimeTypes: [...ALLOWED_TYPES],
  })

  if (createError && !String(createError.message).toLowerCase().includes('already exists')) {
    throw new Error(createError.message)
  }
}

export function isAllowedProductImage(mimetype) {
  return ALLOWED_TYPES.has(mimetype)
}

export async function uploadProductImage(file) {
  if (!file?.buffer || !isAllowedProductImage(file.mimetype)) {
    throw new Error('Selecione uma imagem JPG, PNG, WEBP ou GIF.')
  }

  const supabase = getSupabaseAdmin()
  await ensureProductBucket(supabase)

  const extension = EXTENSIONS[file.mimetype]
  const objectPath = `${new Date().getFullYear()}/${randomUUID()}.${extension}`
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(objectPath, file.buffer, {
      contentType: file.mimetype,
      cacheControl: '31536000',
      upsert: false,
    })

  if (error) throw new Error(error.message)

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(objectPath)
  return {
    url: data.publicUrl,
    path: objectPath,
  }
}
