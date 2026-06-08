// @vitest-environment node

import { describe, expect, test } from 'vitest'
import {
  buildEmailMessage,
  generateCouponCode,
  getEmailEventType,
  getEmailRecipient,
} from './email-workflow.mjs'

describe('email workflow helpers', () => {
  test('generates coupon codes with the MC prefix and 6 uppercase alphanumeric characters', () => {
    const code = generateCouponCode(() => 0.1)

    expect(code).toMatch(/^MC[A-Z0-9]{6}$/)
    expect(code).toHaveLength(8)
  })

  test('maps submission statuses to the correct email event types', () => {
    expect(getEmailEventType('matched_positive')).toBe('coupon_email')
    expect(getEmailEventType('matched_low_rating')).toBe('low_rating_email')
    expect(getEmailEventType('not_found')).toBe('review_not_found_email')
  })

  test('uses the override recipient when one is configured', () => {
    expect(
      getEmailRecipient('cliente@ejemplo.com', 'delivered+coupon@resend.dev'),
    ).toBe('delivered+coupon@resend.dev')
    expect(getEmailRecipient('cliente@ejemplo.com')).toBe('cliente@ejemplo.com')
  })

  test('builds the coupon email with the generated code', () => {
    const message = buildEmailMessage({
      submission: {
        google_maps_name: 'Luciano Colombini',
        email: 'cliente@ejemplo.com',
        status: 'matched_positive',
      },
      couponCode: 'MCABC123',
      restaurantName: "McDonald's",
      whatsappUrl: 'https://wa.me/5491100000000',
    })

    expect(message.subject).toMatch(/cupon/i)
    expect(message.html).toContain('MCABC123')
    expect(message.text).toContain('MCABC123')
    expect(message.html).toContain('Tu cupon ya esta listo')
    expect(message.html).toContain('McDonald&#39;s')
  })

  test('builds the low-rating email without a coupon code and with whatsapp support', () => {
    const message = buildEmailMessage({
      submission: {
        google_maps_name: 'Luciano Colombini',
        email: 'cliente@ejemplo.com',
        status: 'matched_low_rating',
      },
      restaurantName: "McDonald's",
      whatsappUrl: 'https://wa.me/5491100000000',
    })

    expect(message.subject).toMatch(/ayudarte|experiencia/i)
    expect(message.html).not.toContain('MC')
    expect(message.html).toContain('wa.me/5491100000000')
    expect(message.html).toContain('Queremos escuchar lo que paso')
  })

  test('builds the not-found email asking for a whatsapp screenshot', () => {
    const message = buildEmailMessage({
      submission: {
        google_maps_name: 'Luciano Colombini',
        email: 'cliente@ejemplo.com',
        status: 'not_found',
      },
      restaurantName: "McDonald's",
      whatsappUrl: 'https://wa.me/5491100000000',
    })

    expect(message.subject).toMatch(/no pudimos encontrar/i)
    expect(message.html).toContain('captura')
    expect(message.html).toContain('wa.me/5491100000000')
    expect(message.html).toContain('Necesitamos revisar tu caso')
  })
})
