const ADMIN_FUNCTION_PATH = '/functions/v1/admin-coupons'

function getAdminFunctionUrl() {
  const url = import.meta.env.VITE_SUPABASE_URL

  if (!url) {
    throw new Error(
      'Missing Supabase environment variable. Set VITE_SUPABASE_URL.',
    )
  }

  return `${url}${ADMIN_FUNCTION_PATH}`
}

function normalizeCode(code) {
  return String(code || '').trim().toUpperCase()
}

async function requestAdminAction(payload) {
  const response = await fetch(getAdminFunctionUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const data = await response.json()

  if (response.ok) {
    return data
  }

  return {
    ok: false,
    code: data?.code || 'request_failed',
    message: data?.message || 'No pudimos completar la solicitud.',
  }
}

export async function loginAdmin({ username, password }) {
  return requestAdminAction({
    action: 'login',
    username: String(username || '').trim(),
    password: String(password || ''),
  })
}

export async function lookupCoupon({ token, code }) {
  return requestAdminAction({
    action: 'lookup',
    token: String(token || ''),
    code: normalizeCode(code),
  })
}

export async function redeemCoupon({ token, code }) {
  return requestAdminAction({
    action: 'redeem',
    token: String(token || ''),
    code: normalizeCode(code),
  })
}
