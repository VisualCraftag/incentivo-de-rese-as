import { getSupabaseClient } from './supabase'

export async function createReviewSubmission({
  googleMapsName,
  email,
}) {
  try {
    const supabase = getSupabaseClient()
    const { error } = await supabase.from('review_submissions').insert({
      google_maps_name: googleMapsName.trim(),
      email: email.trim().toLowerCase(),
    })

    if (!error) {
      return { ok: true }
    }

    if (error.code === '23505') {
      return {
        ok: false,
        code: 'duplicate_email',
        message: 'Ya registramos una solicitud con este mail.',
      }
    }

    return {
      ok: false,
      code: 'unknown_error',
      message: error.message || 'No pudimos guardar tu solicitud.',
    }
  } catch (error) {
    return {
      ok: false,
      code: 'unknown_error',
      message:
        error instanceof Error
          ? error.message
          : 'No pudimos guardar tu solicitud.',
    }
  }
}
