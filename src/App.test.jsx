import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import App from './App'
import { createReviewSubmission } from './lib/submissions'

vi.mock('./lib/submissions', () => ({
  createReviewSubmission: vi.fn(),
}))

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
  })

  test('shows the restaurant name, logo, three form fields, and submit button', () => {
    render(<App />)

    expect(
      screen.getByRole('img', { name: /logo de mcdonald's/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /mcdonald's/i }),
    ).toBeInTheDocument()
    expect(screen.getByText(/dejanos tu resena/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/nombre visible en google maps/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^mail$/i)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /dejar resena/i }),
    ).toBeInTheDocument()
  })

  test('shows validation errors when the form is submitted empty', async () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /dejar resena/i }))

    expect(
      await screen.findByText(/ingresa el nombre visible en google maps/i),
    ).toBeInTheDocument()
    expect(screen.getByText(/ingresa tu mail/i)).toBeInTheDocument()
    expect(createReviewSubmission).not.toHaveBeenCalled()
  })

  test('submits to the helper, opens google maps, and shows the thank-you state', async () => {
    const replaceSpy = vi.fn()
    const reviewTab = {
      location: { replace: replaceSpy },
      close: vi.fn(),
    }
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => reviewTab)
    createReviewSubmission.mockResolvedValue({
      ok: true,
    })

    render(<App />)

    fireEvent.change(screen.getByLabelText(/nombre visible en google maps/i), {
      target: { value: 'Lucia Gomez' },
    })
    fireEvent.change(screen.getByLabelText(/^mail$/i), {
      target: { value: 'lucia@example.com' },
    })

    fireEvent.click(screen.getByRole('button', { name: /dejar resena/i }))

    await waitFor(() => {
      expect(createReviewSubmission).toHaveBeenCalledWith({
        googleMapsName: 'Lucia Gomez',
        email: 'lucia@example.com',
      })
    })

    expect(openSpy).toHaveBeenCalledWith('', '_blank')
    expect(replaceSpy).toHaveBeenCalledWith(
      "https://www.google.com/maps/place/McDonald's/@-34.581802,-58.452049,17.33z/data=!4m8!3m7!1s0x95bcb5e890327379:0x5f8705ff91cdb527!8m2!3d-34.580418!4d-58.45062!9m1!1b1!16s%2Fg%2F11g6xrxvqf?entry=ttu&g_ep=EgoyMDI2MDYwMy4xIKXMDSoASAFQAw%3D%3D",
    )
    expect(screen.getByText(/gracias por tu tiempo/i)).toBeInTheDocument()
    expect(
      screen.getByText(/gracias, revisa la pestana para dejar tu resena/i),
    ).toBeInTheDocument()
    expect(window.localStorage.getItem('reviewSubmissionLock')).toBeTruthy()

    openSpy.mockRestore()
  })

  test('opens a blank tab before the async submission resolves', async () => {
    let resolveSubmission
    const pendingSubmission = new Promise((resolve) => {
      resolveSubmission = resolve
    })
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => ({
      location: { replace: vi.fn() },
      close: vi.fn(),
    }))

    createReviewSubmission.mockReturnValue(pendingSubmission)

    render(<App />)

    fireEvent.change(screen.getByLabelText(/nombre visible en google maps/i), {
      target: { value: 'Lucia Gomez' },
    })
    fireEvent.change(screen.getByLabelText(/^mail$/i), {
      target: { value: 'lucia@example.com' },
    })

    fireEvent.click(screen.getByRole('button', { name: /dejar resena/i }))

    expect(openSpy).toHaveBeenCalledWith('', '_blank')

    resolveSubmission({ ok: true })

    await waitFor(() => {
      expect(createReviewSubmission).toHaveBeenCalledWith({
        googleMapsName: 'Lucia Gomez',
        email: 'lucia@example.com',
      })
    })

    openSpy.mockRestore()
  })

  test('shows an already-submitted state when the helper reports duplicate email', async () => {
    const reviewTab = {
      location: { replace: vi.fn() },
      close: vi.fn(),
    }
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => reviewTab)
    createReviewSubmission.mockResolvedValue({
      ok: false,
      code: 'duplicate_email',
    })

    render(<App />)

    fireEvent.change(screen.getByLabelText(/nombre visible en google maps/i), {
      target: { value: 'Lucia Gomez' },
    })
    fireEvent.change(screen.getByLabelText(/^mail$/i), {
      target: { value: 'lucia@example.com' },
    })

    fireEvent.click(screen.getByRole('button', { name: /dejar resena/i }))

    expect(
      await screen.findByText(/ya registramos una solicitud con este mail/i),
    ).toBeInTheDocument()
    expect(openSpy).toHaveBeenCalledWith('', '_blank')
    expect(reviewTab.close).toHaveBeenCalled()

    openSpy.mockRestore()
  })
})
