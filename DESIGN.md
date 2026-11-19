# Model Bench — Design

Since 2026-11-19 the bench uses the shared **App shell** (see `APP-SHELL.md`; `app/app-shell.css` and
`components/app-shell.tsx` are copied byte for byte from productivity-ideas-web). It replaced the earlier
paper-and-ink "signal room" look, whose 9–11px mono labels, low-contrast muted text and placeholders, small
text buttons and tall phone intro failed the design floor (review 2026-11-11).

- Single column (`as-page`): intro with a mode pill (Demo mode / Live lanes open / No provider configured),
  then the composer card: prompt, **Use a sample** (44px), character count, the model lanes as round-check
  rows with a status pill each, the demo notice + bench access key, and **Run comparison**.
- Disabled Run stays readable (grey text on the selected tint, 6.5:1) instead of fading to 40%.
- Answers: one row per lane with a pill (time in ms, "Demo, no model called", or Error). The empty state says
  what will appear, shows an example lane and offers **Try the sample prompt**.
- Honesty: without the bench access key every lane is a labelled demo and no provider is called; with the key
  but no provider configured, the page says so instead of pretending.

Floor: Geist via `next/font` (variable on `<html>`), text ≥ 12px, controls ≥ 44px, 4.5:1 text contrast in
light and dark (placeholders included), 3px focus ring, forced-colors support, no horizontal scroll at 320px.
`/more-projects` redirects (308) to https://bookchaowalit.com/ and the footer links there.
