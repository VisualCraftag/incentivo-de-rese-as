const DEFAULT_RESTAURANT_NAME = "McDonald's"
const COUPON_PREFIX = 'MC'
const COUPON_RANDOM_LENGTH = 6
const COUPON_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function buildEmailShell({ eyebrow, title, intro, body, actionHtml, footerNote }) {
  return `
    <div style="margin:0;padding:32px 16px;background:#f4f0e8;font-family:Arial,sans-serif;color:#2f2520">
      <div style="max-width:640px;margin:0 auto;background:#fffdf8;border-radius:28px;overflow:hidden;box-shadow:0 24px 70px rgba(54,34,18,0.12)">
        <div style="padding:18px 28px;background:linear-gradient(135deg,#5f1914 0%,#7d231d 100%);color:#ffbc0d">
          <div style="font-size:12px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase">${eyebrow}</div>
          <div style="margin-top:10px;font-size:32px;font-weight:800;line-height:1.02;color:#ffffff">${title}</div>
        </div>
        <div style="padding:30px 28px 24px">
          <p style="margin:0 0 12px;font-size:17px;line-height:1.65">${intro}</p>
          <div style="font-size:15px;line-height:1.7;color:#5e5248">${body}</div>
          ${actionHtml ? `<div style="margin-top:24px">${actionHtml}</div>` : ''}
          <div style="margin-top:26px;padding-top:18px;border-top:1px solid rgba(95,25,20,0.08);font-size:13px;line-height:1.6;color:#85796e">
            ${footerNote}
          </div>
        </div>
      </div>
    </div>
  `.trim()
}

export function generateCouponCode(randomFn = Math.random) {
  let suffix = ''

  for (let index = 0; index < COUPON_RANDOM_LENGTH; index += 1) {
    const randomIndex = Math.floor(randomFn() * COUPON_ALPHABET.length)
    suffix += COUPON_ALPHABET[randomIndex]
  }

  return `${COUPON_PREFIX}${suffix}`
}

export function getEmailEventType(status) {
  switch (status) {
    case 'matched_positive':
      return 'coupon_email'
    case 'matched_low_rating':
      return 'low_rating_email'
    case 'not_found':
      return 'review_not_found_email'
    default:
      throw new Error(`Unsupported submission status for email flow: ${status}`)
  }
}

export function getEmailRecipient(email, overrideEmail) {
  const override = String(overrideEmail || '').trim()

  if (override) {
    return override
  }

  return String(email || '').trim().toLowerCase()
}

function buildCouponEmail({ googleMapsName, couponCode, restaurantName }) {
  const safeName = escapeHtml(googleMapsName)
  const safeRestaurantName = escapeHtml(restaurantName)
  const safeCouponCode = escapeHtml(couponCode)

  const actionHtml = `
    <div style="padding:22px;border-radius:24px;background:linear-gradient(135deg,#ffbc0d 0%,#ffcf53 100%);box-shadow:inset 0 0 0 1px rgba(95,25,20,0.08)">
      <div style="font-size:12px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:#7c2a15">Tu codigo exclusivo</div>
      <div style="margin-top:10px;font-size:34px;font-weight:900;letter-spacing:3px;color:#5f1914">${safeCouponCode}</div>
      <div style="margin-top:10px;font-size:14px;line-height:1.6;color:#63311d">
        Mostralo en caja durante tu proxima visita para validar el beneficio.
      </div>
    </div>
  `

  return {
    subject: `Tu cupon de ${restaurantName} ya esta listo`,
    text:
      `Hola ${googleMapsName}, gracias por dejar tu resena en ${restaurantName}. ` +
      `Tu cupon es ${couponCode}. Presentalo en tu proxima visita.`,
    html: buildEmailShell({
      eyebrow: safeRestaurantName,
      title: 'Tu cupon ya esta listo',
      intro: `Hola ${safeName}, gracias por tomarte el tiempo de dejar tu resena.`,
      body: `
        <p style="margin:0 0 12px">Confirmamos tu participacion y ya te reservamos un beneficio para tu proxima visita a ${safeRestaurantName}.</p>
        <p style="margin:0">Guardalo y usalo cuando vuelvas al local.</p>
      `,
      actionHtml,
      footerNote:
        'Si tenes alguna duda sobre el canje, acercate al restaurante y mostra este mismo correo.',
    }),
  }
}

function buildLowRatingEmail({ googleMapsName, restaurantName, whatsappUrl }) {
  const safeName = escapeHtml(googleMapsName)
  const safeRestaurantName = escapeHtml(restaurantName)
  const safeWhatsappUrl = escapeHtml(whatsappUrl)

  const actionHtml = `
    <a href="${safeWhatsappUrl}" style="display:inline-block;padding:14px 22px;border-radius:999px;background:#25d366;color:#ffffff;text-decoration:none;font-size:15px;font-weight:800;box-shadow:0 14px 30px rgba(37,211,102,0.22)">
      Hablar por WhatsApp
    </a>
  `

  return {
    subject: `Queremos ayudarte con tu experiencia en ${restaurantName}`,
    text:
      `Hola ${googleMapsName}, vimos que tu experiencia en ${restaurantName} no fue la mejor. ` +
      `Si queres, escribinos por WhatsApp para ayudarte: ${whatsappUrl}`,
    html: buildEmailShell({
      eyebrow: 'Atencion personalizada',
      title: 'Queremos escuchar lo que paso',
      intro: `Hola ${safeName}, vimos tu reseña sobre ${safeRestaurantName} y queremos ayudarte de forma directa.`,
      body: `
        <p style="margin:0 0 12px">Cuando una experiencia no sale como esperabamos, preferimos hablarlo y tratar de solucionarlo.</p>
        <p style="margin:0">Si queres, escribinos por privado y vemos juntos como darte una mejor respuesta.</p>
      `,
      actionHtml,
      footerNote:
        'Este mensaje busca darte un canal directo para que podamos revisar tu caso con mas contexto.',
    }),
  }
}

function buildNotFoundEmail({ googleMapsName, restaurantName, whatsappUrl }) {
  const safeName = escapeHtml(googleMapsName)
  const safeRestaurantName = escapeHtml(restaurantName)
  const safeWhatsappUrl = escapeHtml(whatsappUrl)

  const actionHtml = `
    <a href="${safeWhatsappUrl}" style="display:inline-block;padding:14px 22px;border-radius:999px;background:#25d366;color:#ffffff;text-decoration:none;font-size:15px;font-weight:800;box-shadow:0 14px 30px rgba(37,211,102,0.22)">
      Enviar captura por WhatsApp
    </a>
  `

  return {
    subject: `No pudimos encontrar tu resena en ${restaurantName}`,
    text:
      `Hola ${googleMapsName}, no pudimos encontrar tu resena en ${restaurantName}. ` +
      `Si crees que fue un error nuestro, mandanos una captura por WhatsApp: ${whatsappUrl}`,
    html: buildEmailShell({
      eyebrow: 'Revision manual',
      title: 'Necesitamos revisar tu caso',
      intro: `Hola ${safeName}, por ahora no pudimos ubicar tu resena en la ficha de Google Maps de ${safeRestaurantName}.`,
      body: `
        <p style="margin:0 0 12px">Puede tratarse de una demora de sincronizacion o de un error en la deteccion automatica.</p>
        <p style="margin:0">Si ya publicaste la reseña, mandanos una captura por WhatsApp y lo revisamos para ayudarte con el cupon.</p>
      `,
      actionHtml,
      footerNote:
        'Nuestro equipo puede validar manualmente la reseña cuando recibimos una captura clara del perfil y la publicacion.',
    }),
  }
}

export function buildEmailMessage({
  submission,
  couponCode,
  restaurantName = DEFAULT_RESTAURANT_NAME,
  whatsappUrl = '',
}) {
  switch (submission?.status) {
    case 'matched_positive':
      if (!couponCode) {
        throw new Error('couponCode is required for matched_positive emails')
      }

      return buildCouponEmail({
        googleMapsName: submission.google_maps_name,
        couponCode,
        restaurantName,
      })
    case 'matched_low_rating':
      return buildLowRatingEmail({
        googleMapsName: submission.google_maps_name,
        restaurantName,
        whatsappUrl,
      })
    case 'not_found':
      return buildNotFoundEmail({
        googleMapsName: submission.google_maps_name,
        restaurantName,
        whatsappUrl,
      })
    default:
      throw new Error(
        `Unsupported submission status for email message: ${submission?.status}`,
      )
  }
}
