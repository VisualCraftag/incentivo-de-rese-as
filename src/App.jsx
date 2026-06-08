import { useState } from 'react'
import { createReviewSubmission } from './lib/submissions'

const REVIEW_URL =
  "https://www.google.com/maps/place/McDonald's/@-34.581802,-58.452049,17.33z/data=!4m8!3m7!1s0x95bcb5e890327379:0x5f8705ff91cdb527!8m2!3d-34.580418!4d-58.45062!9m1!1b1!16s%2Fg%2F11g6xrxvqf?entry=ttu&g_ep=EgoyMDI2MDYwMy4xIKXMDSoASAFQAw%3D%3D"
const LOCAL_LOCK_KEY = 'reviewSubmissionLock'

const INITIAL_FORM = {
  googleMapsName: '',
  email: '',
}

function readLocalLock() {
  try {
    return window.localStorage.getItem(LOCAL_LOCK_KEY)
  } catch {
    return null
  }
}

function writeLocalLock(payload) {
  try {
    window.localStorage.setItem(LOCAL_LOCK_KEY, JSON.stringify(payload))
  } catch {
    // Ignore localStorage failures and rely on database uniqueness instead.
  }
}

export default function App() {
  const [formData, setFormData] = useState(INITIAL_FORM)
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isAlreadySubmitted, setIsAlreadySubmitted] = useState(
    Boolean(readLocalLock()),
  )
  const [submissionError, setSubmissionError] = useState('')

  const handleChange = (event) => {
    const { name, value } = event.target

    setFormData((current) => ({
      ...current,
      [name]: value,
    }))

    if (errors[name]) {
      setErrors((current) => ({
        ...current,
        [name]: '',
      }))
    }

    if (submissionError) {
      setSubmissionError('')
    }
  }

  const validate = () => {
    const nextErrors = {}

    if (!formData.googleMapsName.trim()) {
      nextErrors.googleMapsName = 'Ingresa el nombre visible en Google Maps.'
    }

    if (!formData.email.trim()) {
      nextErrors.email = 'Ingresa tu mail.'
    }

    return nextErrors
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const nextErrors = validate()

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    setIsSubmitting(true)
    setSubmissionError('')

    const result = await createReviewSubmission(formData)

    setIsSubmitting(false)

    if (result.ok) {
      writeLocalLock({
        email: formData.email.trim().toLowerCase(),
        createdAt: new Date().toISOString(),
      })
      window.open(REVIEW_URL, '_blank', 'noopener,noreferrer')
      setIsSubmitted(true)
      return
    }

    if (result.code === 'duplicate_email') {
      writeLocalLock({
        email: formData.email.trim().toLowerCase(),
        createdAt: new Date().toISOString(),
        duplicate: true,
      })
      setIsAlreadySubmitted(true)
      return
    }

    setSubmissionError(result.message || 'No pudimos guardar tu solicitud.')
  }

  const showLockedState = isAlreadySubmitted && !isSubmitted

  return (
    <main className="page-shell">
      <section className={`review-card${isSubmitted ? ' success-card' : ''}`}>
        <div className="card-accent" aria-hidden="true" />
        <img
          className="brand-logo"
          src="/mcdonalds-logo.png"
          alt="Logo de McDonald's"
        />
        <h1>McDonald's</h1>

        {isSubmitted ? (
          <>
            <p className="eyebrow">Gracias por tu tiempo</p>
            <p className="support-copy">
              Gracias, revisa la pestana para dejar tu resena en Google Maps.
            </p>
          </>
        ) : showLockedState ? (
          <>
            <p className="eyebrow">Solicitud registrada</p>
            <p className="support-copy">
              Ya registramos una solicitud con este mail.
            </p>
            <p className="status-note">
              Si crees que hubo un error, contactanos por el canal de soporte del
              restaurante.
            </p>
          </>
        ) : (
          <>
            <p className="eyebrow">Dejanos tu resena</p>
            <p className="support-copy">
              Dejanos una resena en Google Maps y recibi un cupon para tu
              proxima visita.
            </p>

            <form className="review-form" onSubmit={handleSubmit} noValidate>
              <label className="field" htmlFor="googleMapsName">
                <span>Nombre visible en Google Maps</span>
                <input
                  id="googleMapsName"
                  name="googleMapsName"
                  type="text"
                  value={formData.googleMapsName}
                  onChange={handleChange}
                  placeholder="ej: Lucia Gomez"
                  aria-invalid={Boolean(errors.googleMapsName)}
                  aria-describedby={
                    errors.googleMapsName ? 'google-maps-name-error' : undefined
                  }
                />
                {errors.googleMapsName ? (
                  <small id="google-maps-name-error" className="field-error">
                    {errors.googleMapsName}
                  </small>
                ) : null}
              </label>

              <label className="field" htmlFor="email">
                <span>Mail</span>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="tuemail@gmail.com"
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                />
                {errors.email ? (
                  <small id="email-error" className="field-error">
                    {errors.email}
                  </small>
                ) : null}
              </label>

              {submissionError ? (
                <p className="form-message" role="alert">
                  {submissionError}
                </p>
              ) : null}

              <button className="maps-button" type="submit" disabled={isSubmitting}>
                <span className="maps-pin" aria-hidden="true" />
                {isSubmitting ? 'Enviando...' : 'Dejar resena'}
              </button>
            </form>
          </>
        )}
      </section>
    </main>
  )
}
