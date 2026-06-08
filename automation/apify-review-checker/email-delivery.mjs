import {
  buildEmailMessage,
  getEmailEventType,
  getEmailRecipient,
} from './email-workflow.mjs'

function getCompletedSubmissionStatus(status) {
  if (status === 'matched_positive') {
    return 'coupon_sent'
  }

  return 'followup_sent'
}

export async function deliverSubmissionEmail({
  submission,
  sendEmail,
  createCoupon,
  createEmailEvent,
  markEmailEventSent,
  markEmailEventFailed,
  markDeliveryComplete,
  fromEmail,
  replyTo,
  restaurantName,
  whatsappUrl,
  recipientOverride,
}) {
  const eventType = getEmailEventType(submission.status)
  const recipientEmail = getEmailRecipient(submission.email, recipientOverride)
  const coupon =
    submission.status === 'matched_positive'
      ? await createCoupon({
          submissionId: submission.id,
          existingCouponId: submission.coupon_id,
        })
      : null

  const message = buildEmailMessage({
    submission,
    couponCode: coupon?.code,
    restaurantName,
    whatsappUrl,
  })

  const emailEvent = await createEmailEvent({
    submissionId: submission.id,
    type: eventType,
    recipientEmail,
  })

  try {
    const result = await sendEmail({
      from: fromEmail,
      to: recipientEmail,
      subject: message.subject,
      html: message.html,
      text: message.text,
      replyTo,
    })

    await markEmailEventSent({
      emailEventId: emailEvent.id,
      providerMessageId: result?.id || null,
    })

    await markDeliveryComplete({
      submissionId: submission.id,
      submissionStatus: getCompletedSubmissionStatus(submission.status),
      couponId: coupon?.id || null,
    })

    return {
      eventType,
      providerMessageId: result?.id || null,
      submissionStatus: getCompletedSubmissionStatus(submission.status),
      couponId: coupon?.id || null,
    }
  } catch (error) {
    await markEmailEventFailed({
      emailEventId: emailEvent.id,
      errorMessage: error instanceof Error ? error.message : String(error),
    })

    throw error
  }
}
