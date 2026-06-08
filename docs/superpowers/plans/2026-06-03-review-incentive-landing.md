# Review Incentive Landing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a polished single-page React landing page that validates two required fields, opens a McDonald's Google Maps review page in a new tab, and shows an in-page thank-you state.

**Architecture:** Scaffold a small React + Vite app with Vitest and Testing Library, then drive the main interaction with TDD inside a focused `App` component. Keep styling in a single global stylesheet with CSS variables so the page stays easy to re-theme later.

**Tech Stack:** React, Vite, Vitest, Testing Library, CSS custom properties

---

## File Structure

- `package.json`
  - Project scripts and dependencies for Vite, React, Vitest, and Testing Library.
- `index.html`
  - Vite HTML entry point.
- `src/main.jsx`
  - React bootstrap entry.
- `src/App.jsx`
  - Main landing page component and submit interaction.
- `src/index.css`
  - Design tokens, layout, form, button, and success-state styling.
- `src/App.test.jsx`
  - Behavior tests for validation, submit flow, and success state.
- `src/test/setup.js`
  - Vitest DOM matchers setup.
- `vite.config.js`
  - Vite config with React plugin and Vitest jsdom environment.

### Task 1: Scaffold The Frontend And Test Harness

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `src/main.jsx`
- Create: `src/test/setup.js`
- Create: `vite.config.js`

- [ ] **Step 1: Scaffold the Vite React app**

Run:

```bash
npm create vite@latest . -- --template react
```

Expected:
- `package.json` created
- `index.html` created
- `src/main.jsx` created
- default Vite React starter files created

- [ ] **Step 2: Install runtime and test dependencies**

Run:

```bash
npm install
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

Expected:
- dependencies installed with no npm errors

- [ ] **Step 3: Replace the default `package.json` scripts with test support**

Set `package.json` to:

```json
{
  "name": "incentivo-de-resenas",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "react": "^19.1.1",
    "react-dom": "^19.1.1"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.0.1",
    "@vitejs/plugin-react": "^4.3.1",
    "jsdom": "^25.0.1",
    "vite": "^7.1.2",
    "vitest": "^2.0.5"
  }
}
```

- [ ] **Step 4: Configure Vitest in `vite.config.js`**

Set `vite.config.js` to:

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
  },
})
```

- [ ] **Step 5: Configure Testing Library matchers**

Set `src/test/setup.js` to:

```js
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 6: Run the empty test suite to verify the harness boots**

Run:

```bash
npm test
```

Expected:

```text
No test files found, exiting with code 1
```

This is acceptable at this point because the harness exists but no tests are written yet.

### Task 2: Write The Failing Interaction Tests

**Files:**
- Create: `src/App.test.jsx`
- Read: `src/App.jsx`

- [ ] **Step 1: Write a test for the initial landing content**

Create `src/App.test.jsx` with:

```jsx
import { fireEvent, render, screen } from '@testing-library/react'
import App from './App'

describe('App', () => {
  test('shows the restaurant name, helper copy, and form fields', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { name: /mcdonald's/i }),
    ).toBeInTheDocument()
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
})
```

- [ ] **Step 2: Extend the test file with validation behavior**

Append this test inside the same `describe` block:

```jsx
test('shows validation errors when the form is submitted empty', () => {
  render(<App />)

  fireEvent.click(screen.getByRole('button', { name: /dejar reseña/i }))

  expect(
    screen.getByText(/ingresá el nombre de tu cuenta de gmail/i),
  ).toBeInTheDocument()
  expect(screen.getByText(/ingresá tu mail/i)).toBeInTheDocument()
})
```

- [ ] **Step 3: Extend the test file with success flow behavior**

Append this test inside the same `describe` block:

```jsx
test('opens google maps in a new tab and shows the thank-you state after a valid submit', () => {
  const openSpy = vi.spyOn(window, 'open').mockImplementation(() => ({}))

  render(<App />)

  fireEvent.change(screen.getByLabelText(/nombre de tu cuenta de gmail/i), {
    target: { value: 'lucia.reviews' },
  })
  fireEvent.change(screen.getByLabelText(/^mail$/i), {
    target: { value: 'lucia@example.com' },
  })

  fireEvent.click(screen.getByRole('button', { name: /dejar reseña/i }))

  expect(openSpy).toHaveBeenCalledWith(
    'https://www.google.com/maps/search/?api=1&query=McDonald%27s',
    '_blank',
    'noopener,noreferrer',
  )
  expect(
    screen.getByText(/gracias, revisá la pestaña para dejar tu reseña/i),
  ).toBeInTheDocument()

  openSpy.mockRestore()
})
```

- [ ] **Step 4: Run the test file and verify it fails for missing behavior**

Run:

```bash
npm test
```

Expected:
- test run starts successfully
- one or more tests fail because the current starter `App.jsx` does not match the expected content or behavior

### Task 3: Implement The Landing Page UI And Submit Flow

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/index.css`

- [ ] **Step 1: Replace the starter component with the landing page logic**

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

    setErrors((current) => ({
      ...current,
      [name]: '',
    }))
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

  if (isSubmitted) {
    return (
      <main className="page-shell">
        <section className="review-card success-card">
          <span className="brand-mark" aria-hidden="true">
            M
          </span>
          <p className="eyebrow">McDonald's</p>
          <h1>Gracias por sumarte</h1>
          <p className="support-copy">
            Gracias, revisá la pestaña para dejar tu reseña en Google Maps.
          </p>
          <p className="success-note">
            Cuando terminemos el workflow automatizable, esta pantalla también
            va a confirmar el envío del cupón.
          </p>
        </section>
      </main>
    )
  }

  return (
    <main className="page-shell">
      <section className="review-card">
        <span className="brand-mark" aria-hidden="true">
          M
        </span>
        <p className="eyebrow">Ejemplo de campaña</p>
        <h1>McDonald's</h1>
        <p className="support-copy">
          Dejanos una reseña en Google Maps y recibi un cupon para tu proxima
          visita.
        </p>

        <form className="review-form" onSubmit={handleSubmit} noValidate>
          <label className="field">
            <span>Nombre de tu cuenta de Gmail</span>
            <input
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

          <label className="field">
            <span>Mail</span>
            <input
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
      </section>
    </main>
  )
}
```

- [ ] **Step 2: Replace the starter stylesheet with the landing page design**

Set `src/index.css` to:

```css
:root {
  font-family: Inter, "Segoe UI", sans-serif;
  line-height: 1.5;
  font-weight: 400;
  color: #171717;
  background:
    radial-gradient(circle at top, rgba(255, 208, 0, 0.18), transparent 35%),
    linear-gradient(180deg, #fffdf6 0%, #f7f7f5 100%);
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  --page-bg: #f7f7f5;
  --card-bg: rgba(255, 255, 255, 0.92);
  --card-border: rgba(23, 23, 23, 0.08);
  --text-main: #171717;
  --text-muted: #5f6368;
  --accent: #fbbc04;
  --accent-strong: #ea4335;
  --success: #137333;
  --shadow: 0 30px 80px rgba(34, 34, 34, 0.12);
  --radius-xl: 32px;
  --radius-lg: 20px;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-width: 320px;
  min-height: 100vh;
  background: var(--page-bg);
  color: var(--text-main);
}

#root {
  min-height: 100vh;
}

button,
input {
  font: inherit;
}

.page-shell {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
}

.review-card {
  width: min(100%, 560px);
  padding: 40px;
  border: 1px solid var(--card-border);
  border-radius: var(--radius-xl);
  background: var(--card-bg);
  box-shadow: var(--shadow);
  backdrop-filter: blur(18px);
}

.brand-mark {
  width: 56px;
  height: 56px;
  display: inline-grid;
  place-items: center;
  border-radius: 18px;
  background: linear-gradient(135deg, #fbbc04 0%, #f59e0b 100%);
  color: #7a1c10;
  font-size: 1.5rem;
  font-weight: 800;
}

.eyebrow {
  margin: 18px 0 8px;
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
}

h1 {
  margin: 0;
  font-size: clamp(2.5rem, 7vw, 4rem);
  line-height: 0.95;
  letter-spacing: -0.04em;
}

.support-copy,
.success-note {
  margin: 18px 0 0;
  color: var(--text-muted);
  font-size: 1.02rem;
}

.review-form {
  margin-top: 28px;
  display: grid;
  gap: 18px;
}

.field {
  display: grid;
  gap: 10px;
}

.field span {
  font-size: 0.95rem;
  font-weight: 600;
}

.field input {
  width: 100%;
  padding: 15px 16px;
  border: 1px solid rgba(95, 99, 104, 0.2);
  border-radius: var(--radius-lg);
  background: rgba(255, 255, 255, 0.9);
  color: var(--text-main);
  outline: none;
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease,
    transform 160ms ease;
}

.field input:focus {
  border-color: rgba(66, 133, 244, 0.6);
  box-shadow: 0 0 0 4px rgba(66, 133, 244, 0.14);
  transform: translateY(-1px);
}

.field-error {
  color: var(--accent-strong);
  font-size: 0.9rem;
}

.maps-button {
  margin-top: 8px;
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 16px 18px;
  border: 0;
  border-radius: 999px;
  background: linear-gradient(135deg, #4285f4 0%, #1a73e8 100%);
  color: #fff;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 18px 35px rgba(26, 115, 232, 0.28);
  transition:
    transform 180ms ease,
    box-shadow 180ms ease,
    filter 180ms ease;
}

.maps-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 22px 40px rgba(26, 115, 232, 0.34);
  filter: saturate(1.05);
}

.maps-button:focus-visible {
  outline: 3px solid rgba(66, 133, 244, 0.22);
  outline-offset: 3px;
}

.maps-pin {
  width: 16px;
  height: 16px;
  border-radius: 999px 999px 999px 0;
  background: #fff;
  transform: rotate(-45deg);
  position: relative;
}

.maps-pin::after {
  content: "";
  position: absolute;
  inset: 4px;
  border-radius: 999px;
  background: #1a73e8;
}

.success-card {
  text-align: left;
}

.success-card h1 {
  font-size: clamp(2.3rem, 6vw, 3.4rem);
}

@media (max-width: 640px) {
  .page-shell {
    padding: 16px;
  }

  .review-card {
    padding: 28px 22px;
    border-radius: 28px;
  }

  h1 {
    font-size: 2.5rem;
  }
}
```

- [ ] **Step 3: Run the tests and verify they pass**

Run:

```bash
npm test
```

Expected:
- all tests in `src/App.test.jsx` pass

### Task 4: Verify The Production Build

**Files:**
- Verify only

- [ ] **Step 1: Run the production build**

Run:

```bash
npm run build
```

Expected:
- Vite completes with exit code 0
- `dist/` output is generated

- [ ] **Step 2: Start the dev server for manual verification**

Run:

```bash
npm run dev -- --host 127.0.0.1 --port 4173
```

Expected:
- local server starts on `http://127.0.0.1:4173`

- [ ] **Step 3: Manually verify the key flow in the browser**

Check:
- landing card renders centered
- both fields show when empty submit occurs
- valid submit opens Google Maps in a new tab
- current page swaps to the thank-you state
- layout remains clean on desktop and mobile widths

## Self-Review

- Spec coverage:
  - Single-page React landing: covered by Tasks 1 and 3
  - Required fields and validation: covered by Tasks 2 and 3
  - Google Maps open in new tab: covered by Tasks 2 and 3
  - Thank-you state in same page: covered by Tasks 2 and 3
  - Build and responsive verification: covered by Task 4
- Placeholder scan:
  - No `TODO`, `TBD`, or unresolved placeholders remain
- Type consistency:
  - `gmailAccount`, `email`, `errors`, `isSubmitted`, and `REVIEW_URL` naming stays consistent through tests and implementation
