// @vitest-environment node

import { describe, expect, test, vi } from 'vitest'
import { deliverSubmissionEmail } from './email-delivery.mjs'

describe('deliverSubmissionEmail', () => {
  test('sends a coupon email for matched_positive submissions and marks the submission as coupon_sent', async () => {
    const sendEmail = vi.fn().mockResolvedValue({ id: 'email-1' })
    const createCoupon = vi.fn().mockResolvedValue({
      id: 'coupon-1',
      code: 'MCABC123',
    })
    const createEmailEvent = vi.fn().mockResolvedValue({ id: 'event-1' })
    const markEmailEventSent = vi.fn().mockResolvedValue(undefined)
    const markEmailEventFailed = vi.fn().mockResolvedValue(undefined)
    const markDeliveryComplete = vi.fn().mockResolvedValue(undefined)

    await deliverSubmissionEmail({
      submission: {
        id: 'submission-1',
        email: 'cliente@ejemplo.com',
        google_maps_name: 'Luciano Colombini',
        status: 'matched_positive',
      },
      sendEmail,
      createCoupon,
      createEmailEvent,
      markEmailEventSent,
      markEmailEventFailed,
      markDeliveryComplete,
      fromEmail: 'McDonalds <onboarding@resend.dev>',
      restaurantName: "McDonald's",
      whatsappUrl: 'https://wa.me/5491100000000',
    })

    expect(createCoupon).toHaveBeenCalledWith({
      submissionId: 'submission-1',
      existingCouponId: undefined,
    })
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'cliente@ejemplo.com',
        subject: expect.stringMatching(/cupon/i),
      }),
    )
    expect(markEmailEventSent).toHaveBeenCalledWith({
      emailEventId: 'event-1',
      providerMessageId: 'email-1',
    })
    expect(markDeliveryComplete).toHaveBeenCalledWith({
      submissionId: 'submission-1',
      submissionStatus: 'coupon_sent',
      couponId: 'coupon-1',
    })
    expect(markEmailEventFailed).not.toHaveBeenCalled()
  })

  test('sends a follow-up email for not_found submissions without creating a coupon', async () => {
    const sendEmail = vi.fn().mockResolvedValue({ id: 'email-2' })
    const createCoupon = vi.fn()
    const createEmailEvent = vi.fn().mockResolvedValue({ id: 'event-2' })
    const markEmailEventSent = vi.fn().mockResolvedValue(undefined)
    const markEmailEventFailed = vi.fn().mockResolvedValue(undefined)
    const markDeliveryComplete = vi.fn().mockResolvedValue(undefined)

    await deliverSubmissionEmail({
      submission: {
        id: 'submission-2',
        email: 'cliente@ejemplo.com',
        google_maps_name: 'Luciano Colombini',
        status: 'not_found',
      },
      sendEmail,
      createCoupon,
      createEmailEvent,
      markEmailEventSent,
      markEmailEventFailed,
      markDeliveryComplete,
      fromEmail: 'McDonalds <onboarding@resend.dev>',
      restaurantName: "McDonald's",
      whatsappUrl: 'https://wa.me/5491100000000',
      recipientOverride: 'delivered+not-found@resend.dev',
    })

    expect(createCoupon).not.toHaveBeenCalled()
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'delivered+not-found@resend.dev',
        subject: expect.stringMatching(/no pudimos encontrar/i),
      }),
    )
    expect(markDeliveryComplete).toHaveBeenCalledWith({
      submissionId: 'submission-2',
      submissionStatus: 'followup_sent',
      couponId: null,
    })
  })

  test('marks the email event as failed when the provider rejects the send', async () => {
    const sendEmail = vi.fn().mockRejectedValue(new Error('403 forbidden'))
    const createCoupon = vi.fn().mockResolvedValue({
      id: 'coupon-3',
      code: 'MCZ9X8Y7',
    })
    const createEmailEvent = vi.fn().mockResolvedValue({ id: 'event-3' })
    const markEmailEventSent = vi.fn().mockResolvedValue(undefined)
    const markEmailEventFailed = vi.fn().mockResolvedValue(undefined)
    const markDeliveryComplete = vi.fn().mockResolvedValue(undefined)

    await expect(
      deliverSubmissionEmail({
        submission: {
          id: 'submission-3',
          email: 'cliente@ejemplo.com',
          google_maps_name: 'Luciano Colombini',
          status: 'matched_positive',
        },
        sendEmail,
        createCoupon,
        createEmailEvent,
        markEmailEventSent,
        markEmailEventFailed,
        markDeliveryComplete,
        fromEmail: 'McDonalds <onboarding@resend.dev>',
        restaurantName: "McDonald's",
        whatsappUrl: 'https://wa.me/5491100000000',
      }),
    ).rejects.toThrow(/403 forbidden/i)

    expect(markEmailEventFailed).toHaveBeenCalledWith({
      emailEventId: 'event-3',
      errorMessage: '403 forbidden',
    })
    expect(markEmailEventSent).not.toHaveBeenCalled()
    expect(markDeliveryComplete).not.toHaveBeenCalled()
  })
})
