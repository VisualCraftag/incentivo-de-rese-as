import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

describe('admin client helpers', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    vi.restoreAllMocks()
    global.fetch = vi.fn()
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  test('sends the login payload to the admin edge function', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        token: 'admin-token',
      }),
    })

    const { loginAdmin } = await import('./admin')
    const result = await loginAdmin({
      username: 'admin',
      password: 'secret',
    })

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/functions\/v1\/admin-coupons$/),
      expect.objectContaining({
        method: 'POST',
      }),
    )
    expect(result).toEqual({
      ok: true,
      token: 'admin-token',
    })
  })

  test('returns a normalized error when lookup fails', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      json: async () => ({
        ok: false,
        code: 'not_found',
        message: 'Cupon no encontrado.',
      }),
    })

    const { lookupCoupon } = await import('./admin')
    const result = await lookupCoupon({
      token: 'admin-token',
      code: 'MCXYZ999',
    })

    expect(result).toEqual({
      ok: false,
      code: 'not_found',
      message: 'Cupon no encontrado.',
    })
  })

  test('sends the redeem action with the provided token and code', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        coupon: {
          code: 'MCXYZ999',
          status: 'redeemed',
        },
      }),
    })

    const { redeemCoupon } = await import('./admin')
    const result = await redeemCoupon({
      token: 'admin-token',
      code: ' MCXYZ999 ',
    })

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/functions\/v1\/admin-coupons$/),
      expect.objectContaining({
        body: JSON.stringify({
          action: 'redeem',
          token: 'admin-token',
          code: 'MCXYZ999',
        }),
      }),
    )
    expect(result).toEqual({
      ok: true,
      coupon: {
        code: 'MCXYZ999',
        status: 'redeemed',
      },
    })
  })
})
