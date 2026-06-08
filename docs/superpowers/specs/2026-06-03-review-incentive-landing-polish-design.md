# Review Incentive Landing Visual Polish Design

## Summary

Apply a small visual polish pass to the existing landing page so it looks more realistic and less like a generic demo. This pass is limited to presentation changes and does not modify the current form workflow.

## Goals

- Replace the current `M` badge with a real McDonald's logo image in PNG format.
- Keep the logo presentation clean and believable, using a transparent-background asset if possible.
- Remove demo-like copy such as:
  - `Ejemplo de campaña`
  - `Gracias por participar`
  - technical/internal workflow references in the success state
- Keep the card visually clean and premium.

## Normal State Content

The default landing card should show:

1. McDonald's logo image
2. Restaurant name:
   `McDonald's`
3. Short secondary line:
   `Dejanos tu reseña`
4. Main supporting text:
   `Dejanos una reseña en Google Maps y recibi un cupon para tu proxima visita.`
5. Existing form and CTA button

## Success State Content

The success state should keep the same visual structure and logo image, but use cleaner copy:

- Restaurant name:
  `McDonald's`
- Short secondary line:
  `Gracias por tu tiempo`
- Main confirmation text:
  `Gracias, revisá la pestaña para dejar tu reseña en Google Maps.`

No internal implementation or future-work messaging should remain visible.

## Visual Direction

- Preserve the existing soft background, centered card, and overall spacing system.
- Make the logo feel like a real brand asset rather than a generated UI chip.
- The logo should be visually balanced with the title, not oversized and not tiny.
- Remove unnecessary decorative signals that make the page feel like a prototype.
- Keep the design adaptable, but allow this demo pass to feel recognizably McDonald's.

## Asset Direction

- Use a PNG logo file stored locally in the project.
- Prefer a transparent-background asset.
- The asset should be suitable for web display and not require runtime fetching from a third-party source.

## Non-Goals

- No workflow changes
- No backend changes
- No Supabase integration
- No mail automation
- No additional sections

## Verification

- The landing still builds and behaves as before.
- The form flow remains unchanged.
- The updated card looks clean in desktop and mobile layouts.
- The real logo image renders correctly in both the initial state and the success state.
