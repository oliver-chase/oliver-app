---
ID: US-SLD-061
Title: Add Theme System for Brand-Consistent Deck Styling
Status: Backlog
Verified: false
Backdated: 2026-04-25
---

As a slide editor user
I want to apply brand themes and update style tokens globally
So my deck remains visually consistent across slides

Acceptance Criteria:
- [ ] Theme model supports heading/body fonts, primary/secondary/background/accent colors, and spacing scale tokens.
- [ ] User can apply a theme to a slide or entire deck.
- [ ] Theme updates propagate global style changes across affected slides.
- [ ] Non-theme styles remain unchanged unless explicitly converted.
- [ ] Imported slides can optionally be converted to theme-linked tokens.

Reference Model:

```ts
type Theme = {
  fonts: { heading: string; body: string }
  colors: { primary: string; secondary: string; background: string; accent: string }
  spacingScale: Record<string, number>
}
```
