import { useState } from 'react'
import { loginAdmin, lookupCoupon, redeemCoupon } from './lib/admin'
import { createReviewSubmission } from './lib/submissions'

const REVIEW_URL =
  "https://www.google.com/maps/place/McDonald's/@-34.581802,-58.452049,17.33z/data=!4m8!3m7!1s0x95bcb5e890327379:0x5f8705ff91cdb527!8m2!3d-34.580418!4d-58.45062!9m1!1b1!16s%2Fg%2F11g6xrxvqf?entry=ttu&g_ep=EgoyMDI2MDYwMy4xIKXMDSoASAFQAw%3D%3D"
const LOCAL_LOCK_KEY = 'reviewSubmissionLock'
const ADMIN_SESSION_KEY = 'reviewAdminSession'

const INITIAL_FORM = {
  googleMapsName: '',
  email: '',
}

const INITIAL_ADMIN_LOGIN = {
  username: '',
  password: '',
}

function getCurrentPathname() {
  if (typeof window === 'undefined') {
    return '/'
  }

  return window.location.pathname || '/'
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

function readAdminSession() {
  try {
    const raw = window.sessionStorage.getItem(ADMIN_SESSION_KEY)

    if (!raw) {
      return null
    }

    const session = JSON.parse(raw)

    if (!session?.token) {
      return null
    }

    if (
      session.expiresAt &&
      Number.isFinite(Date.parse(session.expiresAt)) &&
      Date.parse(session.expiresAt) <= Date.now()
    ) {
      window.sessionStorage.removeItem(ADMIN_SESSION_KEY)
      return null
    }

    return session
  } catch {
    return null
  }
}

function writeAdminSession(payload) {
  try {
    window.sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(payload))
  } catch {
    // Ignore sessionStorage failures and rely on in-memory state.
  }
}

function clearAdminSession() {
  try {
    window.sessionStorage.removeItem(ADMIN_SESSION_KEY)
  } catch {
    // Ignore sessionStorage failures.
  }
}

function openReviewTab() {
  try {
    const reviewTab = window.open('', '_blank')

    if (reviewTab) {
      reviewTab.opener = null
    }

    return reviewTab
  } catch {
    return null
  }
}

function closeReviewTab(reviewTab) {
  try {
    reviewTab?.close()
  } catch {
    // Ignore popup close failures.
  }
}

function navigateReviewTab(reviewTab) {
  if (typeof reviewTab?.location?.replace === 'function') {
    reviewTab.location.replace(REVIEW_URL)
    return
  }

  if (reviewTab?.location) {
    reviewTab.location.href = REVIEW_URL
    return
  }

  window.open(REVIEW_URL, '_blank', 'noopener,noreferrer')
}

function formatDisplayDate(value) {
  if (!value) {
    return '-'
  }

  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return '-'
  }

  return parsed.toLocaleString('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

function getCouponStatusLabel(status) {
  if (status === 'generated') {
    return 'Generado'
  }

  if (status === 'sent') {
    return 'Enviado'
  }

  if (status === 'redeemed') {
    return 'Canjeado'
  }

  if (status === 'void') {
    return 'Anulado'
  }

  return status || '-'
}

function getCouponStatusClass(status) {
  if (status === 'redeemed') {
    return 'coupon-status is-redeemed'
  }

  if (status === 'void') {
    return 'coupon-status is-void'
  }

  if (status === 'sent') {
    return 'coupon-status is-sent'
  }

  return 'coupon-status'
}

function isRedeemableCoupon(status) {
  return status === 'generated' || status === 'sent'
}

function AdminView() {
  const [loginData, setLoginData] = useState(INITIAL_ADMIN_LOGIN)
  const [session, setSession] = useState(() => readAdminSession())
  const [couponCode, setCouponCode] = useState('')
  const [couponResult, setCouponResult] = useState(null)
  const [loginError, setLoginError] = useState('')
  const [lookupError, setLookupError] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [isLookingUp, setIsLookingUp] = useState(false)
  const [isRedeeming, setIsRedeeming] = useState(false)

  const handleLoginChange = (event) => {
    const { name, value } = event.target

    setLoginData((current) => ({
      ...current,
      [name]: value,
    }))

    if (loginError) {
      setLoginError('')
    }
  }

  const handleLoginSubmit = async (event) => {
    event.preventDefault()

    if (!loginData.username.trim() || !loginData.password.trim()) {
      setLoginError('Ingresa usuario y contrasena.')
      return
    }

    setIsLoggingIn(true)
    setLoginError('')

    const result = await loginAdmin({
      username: loginData.username,
      password: loginData.password,
    })

    setIsLoggingIn(false)

    if (!result.ok || !result.token) {
      setLoginError(result.message || 'No pudimos iniciar sesion.')
      return
    }

    const nextSession = {
      token: result.token,
      expiresAt: result.expiresAt || null,
    }

    writeAdminSession(nextSession)
    setSession(nextSession)
    setLoginData(INITIAL_ADMIN_LOGIN)
    setCouponResult(null)
    setActionMessage('')
  }

  const resetAdminSession = (message) => {
    clearAdminSession()
    setSession(null)
    setCouponResult(null)
    setCouponCode('')
    setLookupError(message || '')
    setActionMessage('')
  }

  const handleLookup = async (event) => {
    event.preventDefault()

    if (!couponCode.trim()) {
      setLookupError('Ingresa un codigo de cupon.')
      return
    }

    if (!session?.token) {
      resetAdminSession('La sesion admin ya no es valida.')
      return
    }

    setIsLookingUp(true)
    setLookupError('')
    setActionMessage('')

    const result = await lookupCoupon({
      token: session.token,
      code: couponCode,
    })

    setIsLookingUp(false)

    if (!result.ok) {
      if (result.code === 'invalid_session') {
        resetAdminSession('La sesion admin expiro. Vuelve a ingresar.')
        return
      }

      setCouponResult(null)
      setLookupError(result.message || 'No pudimos buscar el cupon.')
      return
    }

    setCouponResult(result.coupon || null)
  }

  const handleRedeem = async () => {
    if (!couponResult?.code || !session?.token) {
      return
    }

    setIsRedeeming(true)
    setLookupError('')
    setActionMessage('')

    const result = await redeemCoupon({
      token: session.token,
      code: couponResult.code,
    })

    setIsRedeeming(false)

    if (!result.ok) {
      if (result.code === 'invalid_session') {
        resetAdminSession('La sesion admin expiro. Vuelve a ingresar.')
        return
      }

      setLookupError(result.message || 'No pudimos canjear el cupon.')
      return
    }

    setCouponResult(result.coupon || null)
    setActionMessage(result.message || 'Cupon marcado como canjeado.')
  }

  const handleLogout = () => {
    clearAdminSession()
    setSession(null)
    setCouponCode('')
    setCouponResult(null)
    setLookupError('')
    setActionMessage('')
  }

  if (!session?.token) {
    return (
      <main className="page-shell admin-shell">
        <section className="review-card admin-card">
          <div className="card-accent" aria-hidden="true" />
          <p className="panel-kicker">Acceso interno</p>
          <h1 className="panel-title">Panel de cupones</h1>
          <p className="support-copy admin-copy">
            Ingresa con el usuario del local para validar y canjear cupones.
          </p>

          <form className="review-form admin-form" onSubmit={handleLoginSubmit} noValidate>
            <label className="field" htmlFor="username">
              <span>Usuario</span>
              <input
                id="username"
                name="username"
                type="text"
                value={loginData.username}
                onChange={handleLoginChange}
                placeholder="admin"
              />
            </label>

            <label className="field" htmlFor="password">
              <span>Contrasena</span>
              <input
                id="password"
                name="password"
                type="password"
                value={loginData.password}
                onChange={handleLoginChange}
                placeholder="********"
              />
            </label>

            {loginError ? (
              <p className="form-message" role="alert">
                {loginError}
              </p>
            ) : null}

            <button className="maps-button admin-primary-button" type="submit" disabled={isLoggingIn}>
              {isLoggingIn ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        </section>
      </main>
    )
  }

  return (
    <main className="page-shell admin-shell">
      <section className="review-card admin-card admin-panel-card">
        <div className="card-accent" aria-hidden="true" />

        <div className="admin-panel-header">
          <div>
            <p className="panel-kicker">Control interno</p>
            <h1 className="panel-title">Panel de cupones</h1>
          </div>

          <button className="admin-secondary-button" type="button" onClick={handleLogout}>
            Cerrar sesion
          </button>
        </div>

        <p className="support-copy admin-copy">
          Busca un codigo, revisa su estado y marcalo como canjeado cuando corresponda.
        </p>

        <form className="admin-search-row" onSubmit={handleLookup} noValidate>
          <label className="field admin-code-field" htmlFor="couponCode">
            <span>Codigo de cupon</span>
            <input
              id="couponCode"
              name="couponCode"
              type="text"
              value={couponCode}
              onChange={(event) => {
                setCouponCode(event.target.value)
                if (lookupError) {
                  setLookupError('')
                }
              }}
              placeholder="MCABC123"
            />
          </label>

          <button className="maps-button admin-primary-button" type="submit" disabled={isLookingUp}>
            {isLookingUp ? 'Buscando...' : 'Buscar'}
          </button>
        </form>

        {lookupError ? (
          <p className="form-message" role="alert">
            {lookupError}
          </p>
        ) : null}

        {actionMessage ? (
          <p className="form-success" role="status">
            {actionMessage}
          </p>
        ) : null}

        {couponResult ? (
          <article className="coupon-result-card">
            <div className="coupon-result-header">
              <div>
                <p className="coupon-label">Cupon</p>
                <p className="coupon-code">{couponResult.code}</p>
              </div>

              <span className={getCouponStatusClass(couponResult.status)}>
                {getCouponStatusLabel(couponResult.status)}
              </span>
            </div>

            <dl className="coupon-grid">
              <div>
                <dt>Nombre Google Maps</dt>
                <dd>{couponResult.submission?.googleMapsName || '-'}</dd>
              </div>

              <div>
                <dt>Mail</dt>
                <dd>{couponResult.submission?.email || '-'}</dd>
              </div>

              <div>
                <dt>Generado</dt>
                <dd>{formatDisplayDate(couponResult.generatedAt)}</dd>
              </div>

              <div>
                <dt>Enviado</dt>
                <dd>{formatDisplayDate(couponResult.sentAt)}</dd>
              </div>

              <div>
                <dt>Canjeado</dt>
                <dd>{formatDisplayDate(couponResult.redeemedAt)}</dd>
              </div>
            </dl>

            {isRedeemableCoupon(couponResult.status) ? (
              <button
                className="maps-button admin-primary-button redeem-button"
                type="button"
                onClick={handleRedeem}
                disabled={isRedeeming}
              >
                {isRedeeming ? 'Marcando...' : 'Marcar como canjeado'}
              </button>
            ) : null}
          </article>
        ) : null}
      </section>
    </main>
  )
}

function LandingView() {
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
    const reviewTab = openReviewTab()

    const result = await createReviewSubmission(formData)

    setIsSubmitting(false)

    if (result.ok) {
      writeLocalLock({
        email: formData.email.trim().toLowerCase(),
        createdAt: new Date().toISOString(),
      })
      navigateReviewTab(reviewTab)
      setIsSubmitted(true)
      return
    }

    if (result.code === 'duplicate_email') {
      closeReviewTab(reviewTab)
      writeLocalLock({
        email: formData.email.trim().toLowerCase(),
        createdAt: new Date().toISOString(),
        duplicate: true,
      })
      setIsAlreadySubmitted(true)
      return
    }

    closeReviewTab(reviewTab)
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

export default function App() {
  if (getCurrentPathname() === '/admin') {
    return <AdminView />
  }

  return <LandingView />
}
