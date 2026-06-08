# Review Incentive Landing Design

## Summary

Build a single-page React landing page for a restaurant review incentive flow. The page is visual-only for now and will not implement coupon delivery automation yet.

The demo restaurant will be McDonald's, but the interface should stay brand-neutral and easy to adapt later through centralized color variables and concise copy blocks.

## Goals

- Present a polished single-screen landing page with modern React tooling.
- Show the restaurant name prominently.
- Invite the visitor to leave a Google Maps review in exchange for a coupon on the next visit.
- Collect two required fields before opening the review link:
  - Gmail account name
  - Email address
- On successful submit:
  - Open the McDonald's Google Maps review page in a new tab
  - Keep the current page open
  - Replace the form area with a thank-you message telling the visitor to check the new tab

## Non-Goals

- No backend
- No coupon generation
- No email sending
- No persistence
- No automation workflow yet

## Technical Direction

- Use React with Vite for a modern, lightweight frontend setup.
- Keep the app as a single route and single main screen.
- Use CSS with root variables for easy theming.
- Keep logic local in the client with controlled form inputs and submit state.

## Visual Direction

- Minimal, clean, neutral interface
- Soft background with a centered content card
- Strong heading hierarchy and generous spacing
- Colors defined through CSS custom properties so the page can later be adapted to any restaurant brand
- A primary button visually inspired by the familiar Google Maps action pattern without trying to reproduce Google branding exactly
- Responsive layout that looks clean on desktop and mobile

## Content Structure

1. Restaurant name
2. Short supporting text:
   "Dejanos una reseña en Google Maps y recibi un cupon para tu proxima visita"
3. Form with:
   - Gmail account name input
   - Email input
4. Primary CTA button:
   `Dejar reseña`
5. Success state message after valid submission and tab open

## Interaction Details

- Both inputs are required.
- Validation should happen on submit.
- If fields are incomplete, the UI should show inline error feedback.
- If fields are valid:
  - Prevent full page reload
  - Open the McDonald's Google Maps page in a new browser tab with `window.open(..., "_blank")`
  - Transition the form card into a thank-you state
- The thank-you state should confirm that a new tab was opened to leave the review.

## Accessibility

- Proper labels for both inputs
- Visible focus states
- Sufficient color contrast
- Semantic form structure and button usage

## Testing And Verification

- Verify the page builds successfully
- Verify required-field validation
- Verify success state appears after submission
- Verify the button opens Google Maps in a new tab
- Verify responsive layout at desktop and mobile widths

## File Plan

- Vite React app scaffold
- Main app component for page composition
- Global stylesheet with tokens and layout styles

## Scope Check

This scope is intentionally small and focused enough for a single implementation pass. No backend or cross-page flows are included.
