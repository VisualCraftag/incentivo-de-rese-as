import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { deliverSubmissionEmail } from '../../../automation/apify-review-checker/email-delivery.mjs'
import { generateCouponCode } from '../../../automation/apify-review-checker/email-workflow.mjs'

const APIFY_API_BASE = 'https://api.apify.com/v2'
const RESEND_API_BASE = 'https://api.resend.com'
const COUPON_PREFIX = 'MC'
const PENDING_EMAIL_STATUSES = [
  'matched_positive',
  'matched_low_rating',
  'not_found',
]

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
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

function getEmailConfig() {
  const apiKey = getOptionalEnv('RESEND_API_KEY')

  if (!apiKey) {
    return null
  }

  return {
    apiKey,
    fromEmail:
      getOptionalEnv('RESEND_FROM_EMAIL') ||
      "McDonald's <onboarding@resend.dev>",
    replyTo: getOptionalEnv('RESEND_REPLY_TO'),
    recipientOverride: getOptionalEnv('RESEND_TO_OVERRIDE'),
    restaurantName: getOptionalEnv('RESTAURANT_NAME') || "McDonald's",
    whatsappUrl: getOptionalEnv('WHATSAPP_URL') || '',
  }
}

function normalizeReviewIdentity(value: string | null | undefined) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
}

function extractReviewUser(item: Record<string, unknown>) {
  return (
    item?.name ||
    item?.user ||
    item?.reviewerName ||
    null
  ) as string | null
}

async function createRunRecord(supabase: ReturnType<typeof getSupabaseAdmin>) {
  const { data, error } = await supabase
    .from('review_check_runs')
    .insert({
      source_type: 'apify',
      source_reference: Deno.env.get('APIFY_TASK_ID'),
      status: 'running',
      notes: 'Nightly review check started from Supabase Edge Function.',
    })
    .select('id')
    .single()

  if (error) {
    throw new Error(`Could not create review_check_runs record: ${error.message}`)
  }

  return data.id
}

async function finishRunRecord(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  runId: string,
  payload: Record<string, unknown>,
) {
  const { error } = await supabase
    .from('review_check_runs')
    .update({
      ...payload,
      finished_at: new Date().toISOString(),
    })
    .eq('id', runId)

  if (error) {
    throw new Error(`Could not finish review_check_runs record: ${error.message}`)
  }
}

async function fetchPendingSubmissions(supabase: ReturnType<typeof getSupabaseAdmin>) {
  const { data, error } = await supabase
    .from('review_submissions')
    .select('id, google_maps_name, email, status')
    .eq('status', 'pending_review_check')
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(`Could not fetch pending submissions: ${error.message}`)
  }

  return data || []
}

async function fetchPendingEmailSubmissions(
  supabase: ReturnType<typeof getSupabaseAdmin>,
) {
  const { data, error } = await supabase
    .from('review_submissions')
    .select('id, google_maps_name, email, status, coupon_id')
    .in('status', PENDING_EMAIL_STATUSES)
    .order('review_checked_at', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(`Could not fetch pending email submissions: ${error.message}`)
  }

  return data || []
}

async function runApifySourceAndFetchItems() {
  const token = getRequiredEnv('APIFY_TOKEN')
  const taskId = getRequiredEnv('APIFY_TASK_ID')
  const datasetLimit = Deno.env.get('APIFY_DATASET_LIMIT') || '200'

  const endpoint = `${APIFY_API_BASE}/actor-tasks/${taskId}/run-sync-get-dataset-items?token=${token}&clean=true`

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      maxItems: Number(datasetLimit),
    }),
  })

  if (!response.ok) {
    throw new Error(
      `Apify request failed with ${response.status}: ${await response.text()}`,
    )
  }

  return response.json()
}

function buildReviewIndex(items: Array<Record<string, unknown>>) {
  const reviewIndex = new Map<string, Record<string, unknown>>()

  for (const item of items) {
    const reviewUser = extractReviewUser(item)
    const normalized = normalizeReviewIdentity(reviewUser)

    if (!normalized || reviewIndex.has(normalized)) {
      continue
    }

    reviewIndex.set(normalized, item)
  }

  return reviewIndex
}

function classifyMatch(item: Record<string, unknown>) {
  const stars =
    typeof item?.stars === 'number'
      ? item.stars
      : typeof item?.rating === 'number'
        ? item.rating
        : null

  if (typeof stars === 'number' && stars <= 3) {
    return 'matched_low_rating'
  }

  return 'matched_positive'
}

async function persistMatchResult(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  runId: string,
  submission: Record<string, unknown>,
  reviewItem: Record<string, unknown>,
) {
  const reviewUser = extractReviewUser(reviewItem)
  const status = classifyMatch(reviewItem)
  const stars =
    typeof reviewItem?.stars === 'number'
      ? reviewItem.stars
      : typeof reviewItem?.rating === 'number'
        ? reviewItem.rating
        : null

  const { data: matchedReview, error: matchedReviewError } = await supabase
    .from('matched_reviews')
    .insert({
      submission_id: submission.id,
      run_id: runId,
      review_user: reviewUser,
      review_text: reviewItem?.text || reviewItem?.textTranslated || null,
      rating: stars,
      review_date: reviewItem?.publishedAtDate || null,
      external_review_key: reviewItem?.reviewId || null,
      match_confidence: 1,
    })
    .select('id')
    .single()

  if (matchedReviewError) {
    throw new Error(`Could not insert matched review: ${matchedReviewError.message}`)
  }

  const { error: submissionError } = await supabase
    .from('review_submissions')
    .update({
      status,
      review_checked_at: new Date().toISOString(),
      matched_review_id: matchedReview.id,
    })
    .eq('id', submission.id)

  if (submissionError) {
    throw new Error(`Could not update submission after match: ${submissionError.message}`)
  }

  return status
}

async function persistNotFoundResult(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  submission: Record<string, unknown>,
) {
  const { error } = await supabase
    .from('review_submissions')
    .update({
      status: 'not_found',
      review_checked_at: new Date().toISOString(),
    })
    .eq('id', submission.id)

  if (error) {
    throw new Error(`Could not update submission as not_found: ${error.message}`)
  }
}

async function findCouponById(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  couponId: string,
) {
  const { data, error } = await supabase
    .from('coupons')
    .select('id, code')
    .eq('id', couponId)
    .maybeSingle()

  if (error) {
    throw new Error(`Could not fetch coupon by id: ${error.message}`)
  }

  return data
}

async function findCouponBySubmissionId(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  submissionId: string,
) {
  const { data, error } = await supabase
    .from('coupons')
    .select('id, code')
    .eq('submission_id', submissionId)
    .maybeSingle()

  if (error) {
    throw new Error(`Could not fetch coupon by submission: ${error.message}`)
  }

  return data
}

async function createCouponForSubmission(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  { submissionId, existingCouponId = null }: { submissionId: string; existingCouponId?: string | null },
) {
  if (existingCouponId) {
    const existingById = await findCouponById(supabase, existingCouponId)

    if (existingById) {
      return existingById
    }
  }

  const existingBySubmission = await findCouponBySubmissionId(supabase, submissionId)

  if (existingBySubmission) {
    return existingBySubmission
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateCouponCode()
    const { data, error } = await supabase
      .from('coupons')
      .insert({
        submission_id: submissionId,
        code,
        prefix: COUPON_PREFIX,
        status: 'generated',
      })
      .select('id, code')
      .single()

    if (!error) {
      return data
    }

    if (error.code === '23505') {
      const concurrentCoupon = await findCouponBySubmissionId(supabase, submissionId)

      if (concurrentCoupon) {
        return concurrentCoupon
      }

      continue
    }

    throw new Error(`Could not create coupon: ${error.message}`)
  }

  throw new Error('Could not generate a unique coupon code after 5 attempts')
}

async function createEmailEvent(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  {
    submissionId,
    type,
    recipientEmail,
  }: {
    submissionId: string
    type: string
    recipientEmail: string
  },
) {
  const { data, error } = await supabase
    .from('email_events')
    .insert({
      submission_id: submissionId,
      type,
      recipient_email: recipientEmail,
      status: 'queued',
    })
    .select('id')
    .single()

  if (error) {
    throw new Error(`Could not create email event: ${error.message}`)
  }

  return data
}

async function markEmailEventSent(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  { emailEventId, providerMessageId }: { emailEventId: string; providerMessageId: string | null },
) {
  const { error } = await supabase
    .from('email_events')
    .update({
      status: 'sent',
      provider_message_id: providerMessageId,
      error_message: null,
      sent_at: new Date().toISOString(),
    })
    .eq('id', emailEventId)

  if (error) {
    throw new Error(`Could not mark email event as sent: ${error.message}`)
  }
}

async function markEmailEventFailed(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  { emailEventId, errorMessage }: { emailEventId: string; errorMessage: string },
) {
  const { error } = await supabase
    .from('email_events')
    .update({
      status: 'failed',
      error_message: errorMessage,
    })
    .eq('id', emailEventId)

  if (error) {
    throw new Error(`Could not mark email event as failed: ${error.message}`)
  }
}

async function markDeliveryComplete(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  {
    submissionId,
    submissionStatus,
    couponId,
  }: {
    submissionId: string
    submissionStatus: string
    couponId: string | null
  },
) {
  if (couponId) {
    const { error: couponError } = await supabase
      .from('coupons')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .eq('id', couponId)

    if (couponError) {
      throw new Error(`Could not update coupon as sent: ${couponError.message}`)
    }
  }

  const payload: Record<string, unknown> = {
    status: submissionStatus,
  }

  if (couponId) {
    payload.coupon_id = couponId
  }

  const { error: submissionError } = await supabase
    .from('review_submissions')
    .update(payload)
    .eq('id', submissionId)

  if (submissionError) {
    throw new Error(
      `Could not update submission after email delivery: ${submissionError.message}`,
    )
  }
}

async function sendResendEmail(
  apiKey: string,
  payload: {
    from: string
    to: string
    subject: string
    html: string
    text: string
    replyTo?: string | null
  },
) {
  const body: Record<string, unknown> = {
    from: payload.from,
    to: [payload.to],
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
    tags: [
      {
        name: 'workflow',
        value: 'review-incentive',
      },
    ],
  }

  if (payload.replyTo) {
    body.reply_to = [payload.replyTo]
  }

  const response = await fetch(`${RESEND_API_BASE}/emails`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error(`Resend request failed with ${response.status}: ${await response.text()}`)
  }

  return response.json()
}

async function processPendingEmails(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  emailConfig: ReturnType<typeof getEmailConfig>,
) {
  if (!emailConfig) {
    return {
      enabled: false,
      attempted: 0,
      sent: 0,
      couponEmailsSent: 0,
      followupEmailsSent: 0,
      failed: 0,
    }
  }

  if (!emailConfig.whatsappUrl) {
    throw new Error('Missing required environment variable: WHATSAPP_URL')
  }

  const pendingSubmissions = await fetchPendingEmailSubmissions(supabase)
  const summary = {
    enabled: true,
    attempted: pendingSubmissions.length,
    sent: 0,
    couponEmailsSent: 0,
    followupEmailsSent: 0,
    failed: 0,
  }

  for (const submission of pendingSubmissions) {
    try {
      const result = await deliverSubmissionEmail({
        submission,
        sendEmail: (payload: Record<string, unknown>) =>
          sendResendEmail(emailConfig.apiKey, {
            from: String(payload.from),
            to: String(payload.to),
            subject: String(payload.subject),
            html: String(payload.html),
            text: String(payload.text),
            replyTo: payload.replyTo ? String(payload.replyTo) : null,
          }),
        createCoupon: (payload: { submissionId: string; existingCouponId?: string | null }) =>
          createCouponForSubmission(supabase, payload),
        createEmailEvent: (payload: { submissionId: string; type: string; recipientEmail: string }) =>
          createEmailEvent(supabase, payload),
        markEmailEventSent: (payload: { emailEventId: string; providerMessageId: string | null }) =>
          markEmailEventSent(supabase, payload),
        markEmailEventFailed: (payload: { emailEventId: string; errorMessage: string }) =>
          markEmailEventFailed(supabase, payload),
        markDeliveryComplete: (payload: {
          submissionId: string
          submissionStatus: string
          couponId: string | null
        }) => markDeliveryComplete(supabase, payload),
        fromEmail: emailConfig.fromEmail,
        replyTo: emailConfig.replyTo,
        restaurantName: emailConfig.restaurantName,
        whatsappUrl: emailConfig.whatsappUrl,
        recipientOverride: emailConfig.recipientOverride,
      })

      summary.sent += 1

      if (result.submissionStatus === 'coupon_sent') {
        summary.couponEmailsSent += 1
      } else {
        summary.followupEmailsSent += 1
      }
    } catch (error) {
      summary.failed += 1
      console.error(
        `Email delivery failed for submission ${submission.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      )
    }
  }

  return summary
}

async function runWorkflow() {
  const supabase = getSupabaseAdmin()
  const runId = await createRunRecord(supabase)

  try {
    const [items, pendingSubmissions] = await Promise.all([
      runApifySourceAndFetchItems(),
      fetchPendingSubmissions(supabase),
    ])

    const reviewIndex = buildReviewIndex(items)
    let matchedPositive = 0
    let matchedLowRating = 0
    let notFound = 0

    for (const submission of pendingSubmissions) {
      const normalizedName = normalizeReviewIdentity(
        String(submission.google_maps_name || ''),
      )
      const matchingReview = reviewIndex.get(normalizedName)

      if (!matchingReview) {
        await persistNotFoundResult(supabase, submission)
        notFound += 1
        continue
      }

      const status = await persistMatchResult(
        supabase,
        runId,
        submission,
        matchingReview,
      )

      if (status === 'matched_low_rating') {
        matchedLowRating += 1
      } else {
        matchedPositive += 1
      }
    }

    await finishRunRecord(supabase, runId, {
      status: 'completed',
      notes: `Processed ${pendingSubmissions.length} submissions from ${items.length} scraped reviews.`,
    })

    const emailSummary = await processPendingEmails(supabase, getEmailConfig())

    return {
      ok: true,
      runId,
      fetchedItems: items.length,
      processedSubmissions: pendingSubmissions.length,
      matchedPositive,
      matchedLowRating,
      notFound,
      emails: emailSummary,
    }
  } catch (error) {
    await finishRunRecord(supabase, runId, {
      status: 'failed',
      notes: error instanceof Error ? error.message : 'Unknown workflow failure.',
    })
    throw error
  }
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed. Use POST.' }, 405)
  }

  try {
    const result = await runWorkflow()
    return jsonResponse(result, 200)
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown workflow failure.',
      },
      500,
    )
  }
})
