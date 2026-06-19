import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const SESSION_DURATION_HOURS = 8
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

type CouponRow = {
  id: string
  submission_id: string
  code: string
  prefix: string
  status: string
  generated_at: string | null
  sent_at: string | null
  redeemed_at: string | null
}

type SubmissionRow = {
  id: string
  google_maps_name: string
  email: string
  status: string
  created_at?: string | null
}

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: corsHeaders,
  })
}

function getRequiredEnv(name: string) {
  const value = Deno.env.get(name)

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

function getOptionalEnv(name: string) {
  return Deno.env.get(name) || null
}

function getSupabaseServiceKey() {
  const secretKeys = getOptionalEnv('SUPABASE_SECRET_KEYS')

  if (secretKeys) {
    const parsedKeys = JSON.parse(secretKeys)

    if (parsedKeys.default) {
      return parsedKeys.default
    }
  }

  return getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY')
}

function getSupabaseAdmin() {
  return createClient(getRequiredEnv('SUPABASE_URL'), getSupabaseServiceKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

function normalizeCouponCode(value: string | null | undefined) {
  return String(value || '').trim().toUpperCase()
}

function toBase64Url(value: Uint8Array) {
  let binary = ''

  for (const byte of value) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function fromBase64Url(value: string) {
  let normalized = value.replace(/-/g, '+').replace(/_/g, '/')

  while (normalized.length % 4 !== 0) {
    normalized += '='
  }

  return atob(normalized)
}

async function signValue(value: string, secret: string) {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    {
      name: 'HMAC',
      hash: 'SHA-256',
    },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value))

  return toBase64Url(new Uint8Array(signature))
}

async function createAdminSessionToken(username: string) {
  const now = Date.now()
  const expiresAtMs = now + SESSION_DURATION_HOURS * 60 * 60 * 1000
  const header = toBase64Url(
    new TextEncoder().encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })),
  )
  const payload = toBase64Url(
    new TextEncoder().encode(
      JSON.stringify({
        sub: username,
        role: 'admin',
        iat: Math.floor(now / 1000),
        exp: Math.floor(expiresAtMs / 1000),
      }),
    ),
  )
  const unsigned = `${header}.${payload}`
  const signature = await signValue(unsigned, getRequiredEnv('ADMIN_PANEL_SESSION_SECRET'))

  return {
    token: `${unsigned}.${signature}`,
    expiresAt: new Date(expiresAtMs).toISOString(),
  }
}

async function verifyAdminSessionToken(token: string) {
  const parts = String(token || '').split('.')

  if (parts.length !== 3) {
    return null
  }

  const [header, payload, signature] = parts
  const unsigned = `${header}.${payload}`
  const expectedSignature = await signValue(
    unsigned,
    getRequiredEnv('ADMIN_PANEL_SESSION_SECRET'),
  )

  if (signature !== expectedSignature) {
    return null
  }

  try {
    const decodedPayload = JSON.parse(fromBase64Url(payload))

    if (
      decodedPayload?.role !== 'admin' ||
      typeof decodedPayload?.exp !== 'number' ||
      decodedPayload.exp * 1000 <= Date.now()
    ) {
      return null
    }

    return decodedPayload
  } catch {
    return null
  }
}

function assertAdminCredentials(username: string, password: string) {
  return (
    username === getRequiredEnv('ADMIN_PANEL_USERNAME') &&
    password === getRequiredEnv('ADMIN_PANEL_PASSWORD')
  )
}

async function fetchSubmission(supabase: ReturnType<typeof getSupabaseAdmin>, submissionId: string) {
  const { data, error } = await supabase
    .from('review_submissions')
    .select('id, google_maps_name, email, status, created_at')
    .eq('id', submissionId)
    .maybeSingle()

  if (error) {
    throw new Error(`Could not fetch submission: ${error.message}`)
  }

  return data as SubmissionRow | null
}

async function fetchCouponWithSubmission(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  code: string,
) {
  const { data, error } = await supabase
    .from('coupons')
    .select('id, submission_id, code, prefix, status, generated_at, sent_at, redeemed_at')
    .eq('code', code)
    .maybeSingle()

  if (error) {
    throw new Error(`Could not fetch coupon: ${error.message}`)
  }

  if (!data) {
    return null
  }

  const submission = await fetchSubmission(supabase, data.submission_id)

  return {
    coupon: data as CouponRow,
    submission,
  }
}

function serializeCoupon(coupon: CouponRow, submission: SubmissionRow | null) {
  return {
    code: coupon.code,
    prefix: coupon.prefix,
    status: coupon.status,
    generatedAt: coupon.generated_at,
    sentAt: coupon.sent_at,
    redeemedAt: coupon.redeemed_at,
    submission: submission
      ? {
          id: submission.id,
          googleMapsName: submission.google_maps_name,
          email: submission.email,
          status: submission.status,
          createdAt: submission.created_at || null,
        }
      : null,
  }
}

async function requireAdminToken(token: string) {
  const session = await verifyAdminSessionToken(token)

  if (!session) {
    return null
  }

  return session
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return jsonResponse({ ok: false, code: 'method_not_allowed', message: 'Use POST.' }, 405)
  }

  try {
    const body = await request.json()
    const action = String(body?.action || '')

    if (action === 'login') {
      const username = String(body?.username || '').trim()
      const password = String(body?.password || '')

      if (!username || !password) {
        return jsonResponse(
          { ok: false, code: 'invalid_request', message: 'Completa usuario y contrasena.' },
          400,
        )
      }

      if (!assertAdminCredentials(username, password)) {
        return jsonResponse(
          { ok: false, code: 'invalid_credentials', message: 'Credenciales invalidas.' },
          401,
        )
      }

      const session = await createAdminSessionToken(username)
      return jsonResponse({ ok: true, ...session }, 200)
    }

    if (action !== 'lookup' && action !== 'redeem') {
      return jsonResponse(
        { ok: false, code: 'invalid_action', message: 'Accion no soportada.' },
        400,
      )
    }

    const session = await requireAdminToken(String(body?.token || ''))

    if (!session) {
      return jsonResponse(
        { ok: false, code: 'invalid_session', message: 'La sesion admin no es valida.' },
        401,
      )
    }

    const code = normalizeCouponCode(body?.code)

    if (!code) {
      return jsonResponse(
        { ok: false, code: 'invalid_request', message: 'Ingresa un codigo de cupon.' },
        400,
      )
    }

    const supabase = getSupabaseAdmin()
    const found = await fetchCouponWithSubmission(supabase, code)

    if (!found) {
      return jsonResponse(
        { ok: false, code: 'not_found', message: 'Cupon no encontrado.' },
        404,
      )
    }

    if (action === 'lookup') {
      return jsonResponse(
        { ok: true, coupon: serializeCoupon(found.coupon, found.submission) },
        200,
      )
    }

    if (found.coupon.status === 'void') {
      return jsonResponse(
        { ok: false, code: 'coupon_void', message: 'Este cupon no se puede canjear.' },
        409,
      )
    }

    if (found.coupon.status === 'redeemed') {
      return jsonResponse(
        {
          ok: true,
          message: 'Este cupon ya estaba canjeado.',
          coupon: serializeCoupon(found.coupon, found.submission),
        },
        200,
      )
    }

    const redeemedAt = new Date().toISOString()
    const { data: updatedCoupon, error: updateError } = await supabase
      .from('coupons')
      .update({
        status: 'redeemed',
        redeemed_at: redeemedAt,
      })
      .eq('id', found.coupon.id)
      .select('id, submission_id, code, prefix, status, generated_at, sent_at, redeemed_at')
      .single()

    if (updateError) {
      throw new Error(`Could not redeem coupon: ${updateError.message}`)
    }

    return jsonResponse(
      {
        ok: true,
        message: 'Cupon marcado como canjeado.',
        coupon: serializeCoupon(updatedCoupon as CouponRow, found.submission),
      },
      200,
    )
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        code: 'server_error',
        message:
          error instanceof Error ? error.message : 'Unknown admin coupon workflow failure.',
      },
      500,
    )
  }
})
