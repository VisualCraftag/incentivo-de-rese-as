# Review Incentive Landing Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder badge with a real McDonald's logo image and clean the landing copy so the page feels more realistic without changing the form behavior.

**Architecture:** Keep the existing single-component structure and make the smallest useful changes: add a local PNG asset, update the component copy, and tune the CSS around the logo and top-of-card layout. Preserve the existing submit flow and verify it with focused tests.

**Tech Stack:** React, Vite, Vitest, Testing Library, CSS

---

## File Structure

- `public/mcdonalds-logo.png`
  - Local PNG asset for the brand mark shown in both default and success states.
- `src/App.test.jsx`
  - Updated expectations for the cleaned copy and the real logo image.
- `src/App.jsx`
  - Uses the image asset, removes demo text, and updates success-state wording.
- `src/index.css`
  - Adjusts logo sizing, spacing, and the cleaner visual hierarchy.

### Task 1: Write The Failing Tests For The Visual Polish

**Files:**
- Modify: `src/App.test.jsx`

- [ ] **Step 1: Update the initial render test to expect the real logo and new secondary line**

Replace the first test with:

```jsx
test('shows the restaurant name, logo, updated helper copy, and form fields', () => {
  render(<App />)

  expect(
    screen.getByRole('img', { name: /logo de mcdonald's/i }),
  ).toBeInTheDocument()
  expect(
    screen.getByRole('heading', { name: /mcdonald's/i }),
  ).toBeInTheDocument()
  expect(screen.getByText(/dejanos tu reseña/i)).toBeInTheDocument()
  expect(
    screen.getByText(/dejanos una reseña en google maps/i),
  ).toBeInTheDocument()
  expect(
    screen.getByLabelText(/nombre de tu cuenta de gmail/i),
  ).toBeInTheDocument()
  expect(screen.getByLabelText(/^mail$/i)).toBeInTheDocument()
  expect(
    screen.getByRole('button', { name: /dejar reseña/i }),
  ).toBeInTheDocument()
})
```

- [ ] **Step 2: Update the success-state test to expect the new clean copy**

Inside the existing success-flow test, after the `window.open` assertion, replace the copy assertion with:

```jsx
expect(screen.getByText(/gracias por tu tiempo/i)).toBeInTheDocument()
expect(
  screen.getByText(/gracias, revisá la pestaña para dejar tu reseña/i),
).toBeInTheDocument()
expect(
  screen.queryByText(/workflow automatizable/i),
).not.toBeInTheDocument()
```

- [ ] **Step 3: Run the tests and verify they fail for the old UI**

Run:

```bash
npm test
```

Expected:
- tests fail because the current component still renders the placeholder badge and the older copy

### Task 2: Add The Real Logo Asset And Update The Component

**Files:**
- Create: `public/mcdonalds-logo.png`
- Modify: `src/App.jsx`

- [ ] **Step 1: Download the McDonald's logo PNG into the public folder**

Run:

```bash
Invoke-WebRequest -Uri "https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/McDonald%27s_Golden_Arches.svg/1280px-McDonald%27s_Golden_Arches.svg.png" -OutFile "public/mcdonalds-logo.png"
```

Expected:
- `public/mcdonalds-logo.png` exists locally

- [ ] **Step 2: Update `src/App.jsx` to use the image asset and cleaner copy**

Set `src/App.jsx` to:

```jsx
import { useState } from 'react'

const REVIEW_URL =
  "https://www.google.com/maps/search/?api=1&query=McDonald%27s"

const INITIAL_FORM = {
  gmailAccount: '',
  email: '',
}

export default function App() {
  const [formData, setFormData] = useState(INITIAL_FORM)
  const [errors, setErrors] = useState({})
  const [isSubmitted, setIsSubmitted] = useState(false)

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
  }

  const validate = () => {
    const nextErrors = {}

    if (!formData.gmailAccount.trim()) {
      nextErrors.gmailAccount = 'Ingresá el nombre de tu cuenta de Gmail.'
    }

    if (!formData.email.trim()) {
      nextErrors.email = 'Ingresá tu mail.'
    }

    return nextErrors
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    const nextErrors = validate()

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    window.open(REVIEW_URL, '_blank', 'noopener,noreferrer')
    setIsSubmitted(true)
  }

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
        <p className="eyebrow">
          {isSubmitted ? 'Gracias por tu tiempo' : 'Dejanos tu reseña'}
        </p>

        {isSubmitted ? (
          <p className="support-copy">
            Gracias, revisá la pestaña para dejar tu reseña en Google Maps.
          </p>
        ) : (
          <>
            <p className="support-copy">
              Dejanos una reseña en Google Maps y recibi un cupon para tu
              proxima visita.
            </p>

            <form className="review-form" onSubmit={handleSubmit} noValidate>
              <label className="field" htmlFor="gmailAccount">
                <span>Nombre de tu cuenta de Gmail</span>
                <input
                  id="gmailAccount"
                  name="gmailAccount"
                  type="text"
                  value={formData.gmailAccount}
                  onChange={handleChange}
                  placeholder="ej: lucia.reviews"
                  aria-invalid={Boolean(errors.gmailAccount)}
                  aria-describedby={
                    errors.gmailAccount ? 'gmail-account-error' : undefined
                  }
                />
                {errors.gmailAccount ? (
                  <small id="gmail-account-error" className="field-error">
                    {errors.gmailAccount}
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

              <button className="maps-button" type="submit">
                <span className="maps-pin" aria-hidden="true" />
                Dejar reseña
              </button>
            </form>
          </>
        )}
      </section>
    </main>
  )
}
```

- [ ] **Step 3: Run the tests and verify they pass**

Run:

```bash
npm test
```

Expected:
- all tests pass

### Task 3: Tune The Styling And Verify The Rendered Result

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Replace the old badge styling with image styling and cleaner top spacing**

Update `src/index.css` by:

```css
.brand-logo {
  position: relative;
  z-index: 1;
  width: 84px;
  height: auto;
  display: block;
  filter: drop-shadow(0 10px 18px rgba(255, 194, 18, 0.18));
}

.eyebrow {
  position: relative;
  z-index: 1;
  margin: 14px 0 6px;
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  text-transform: none;
  color: var(--text-main);
}

h1 {
  position: relative;
  z-index: 1;
  margin: 0;
  font-size: clamp(2.7rem, 7vw, 4.3rem);
  line-height: 0.96;
  letter-spacing: -0.055em;
}
```

And remove the old `.brand-mark` rule entirely.

- [ ] **Step 2: Run the production build**

Run:

```bash
npm run build
```

Expected:
- build succeeds with exit code 0

- [ ] **Step 3: Run the app and visually verify desktop and mobile**

Run:

```bash
npm run dev -- --host 127.0.0.1 --port 4173
```

Check:
- real logo image renders correctly
- no demo-like eyebrow copy remains
- success state is shorter and cleaner
- spacing still looks balanced on desktop and mobile

## Self-Review

- Spec coverage:
  - real PNG logo: covered by Task 2
  - removal of demo-like copy: covered by Tasks 1 and 2
  - cleaner success-state copy: covered by Tasks 1 and 2
  - preserved behavior and visual verification: covered by Task 3
- Placeholder scan:
  - no unresolved placeholders remain
- Type consistency:
  - `brand-logo`, `support-copy`, and the submit flow naming remain consistent with the existing component structure
