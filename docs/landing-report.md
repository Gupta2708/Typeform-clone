# Homepage design and verification

Research and local verification: 9 October 2026. This addition follows the completed six-phase
core. Hosted deployment remains outside the build.

## References actually inspected

The two supplied screenshots establish the homepage's dark plum hero, oversized serif headline,
compact navigation, light CTA, three feature cards and layered product compositions. Browser chrome
and the Snipping Tool notification are excluded. Static screenshots do not establish animation
timing or scroll behavior.

Additional official images were downloaded from the [Typeform homepage](https://www.typeform.com/)
and visually inspected:

| Reference         | Local image                                        | Official source                                                                                                                                                           |
| ----------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Intelligent Forms | [Image](references/landing/intelligent-forms.avif) | [Typeform-hosted asset](https://cdn.prod.website-files.com/66ffe2174aa8e8d5661c2708/69fdd20b7849d1edf2c790f2_INTELLIGENT%20forms-p-800.avif)                              |
| Growth Flow       | [Image](references/landing/growth-flow.avif)       | [Typeform-hosted asset](https://cdn.prod.website-files.com/66ffe2174aa8e8d5661c2708/69fdd20bf615dbbe71a60f87_f473b127a36072867cb0ab6ee1b76734_Growth%20FLOW-p-800.avif)   |
| Research Flow     | [Image](references/landing/research-flow.avif)     | [Typeform-hosted asset](https://cdn.prod.website-files.com/66ffe2174aa8e8d5661c2708/69fdd20b567b702dcc4f2c1e_d3643b1ac0dde821cc4b3cf33ae935ad_RESEARCH%20FLOW-p-800.avif) |

These remain Typeform's reference material, stored for design attribution. They are not rendered
in the application. The application uses original HTML product compositions representing its
existing features; it makes no AI, integration or customer-performance claims.

## Implemented direction

- Homepage at `/`, with real workspace, public sample and creator-preview destinations.
- Scoped plum, warm white, lavender and violet tokens. Local DM Serif Display (OFL licensed) and
  the existing Inter font. [DM Serif license](licenses/DM-Serif-Display-OFL.txt).
- Sticky navigation, Product disclosure with pointer/keyboard support and a Radix mobile dialog.
- Animated question/answer/receipt sequence with pause, offscreen/document visibility handling,
  timer cleanup and a useful reduced-motion frame.
- Distinct Build/Share/Learn cards, alternating feature sections, editable local builder demo,
  shared preview-mode player and explicitly illustrative response detail/summary.
- Eight formats in opposing seamless rows, manual/hover/focus pause and a static reduced-motion grid.
- Native scrolling example carousel with neighbors visible, previous/next, indicators and mobile
  touch scrolling. Draft examples are explicitly labeled creator previews. Missing examples lead
  to the workspace.
- Static content remains server-rendered. Existing Motion, Radix, Lucide and TanStack Query supply
  interaction; the only application dependency added is the licensed font package.

The embedded player opts out of initial focus so the homepage does not move keyboard focus into
an offscreen demonstration. Once someone interacts, the existing heading-focus behavior announces
the next question. Public and full-screen players retain their initial focus behavior.

Motion timing and original copy are implementation choices rather than observed Typeform behavior.
The marketing style is scoped to the homepage; builder and public routes retain their design.

## Browser captures

| Width   | Homepage                                         | Hero                                      |
| ------- | ------------------------------------------------ | ----------------------------------------- |
| 1440 px | [Desktop](screenshots/landing/homepage-1440.png) | [Hero](screenshots/landing/hero-1440.png) |
| 1280 px | [Desktop](screenshots/landing/homepage-1280.png) | [Hero](screenshots/landing/hero-1280.png) |
| 768 px  | [Tablet](screenshots/landing/homepage-768.png)   | [Hero](screenshots/landing/hero-768.png)  |
| 390 px  | [Mobile](screenshots/landing/homepage-390.png)   | [Hero](screenshots/landing/hero-390.png)  |

Additional section captures show the readable [builder](screenshots/landing/build-1440.png),
[player](screenshots/landing/share-1440.png), [results](screenshots/landing/learn-1440.png) and
[carousel](screenshots/landing/examples-1440.png). Each also has a 390 px capture in the same folder.
Screenshots are actual Chromium captures, with reduced motion for consistent review.

## Observed checks

- Frontend TypeScript and ESLint checks passed.
- Production build passed, including static homepage generation and bundled fonts.
- All 19 existing browser workflows passed in the full regression run, including autosave
  races/conflicts, deliberate discard, all eight answer types, preview isolation, retry,
  historical results and the existing accessibility/actual 200% browser-zoom checks.
- All four new landing tests passed after correcting a test's focus expectation to match the
  shared player's intentional question-heading focus. The earlier reduced-motion hydration
  mismatch was fixed with a server-consistent media-preference subscription.
- Landing checks cover real links, keyboard menu, local edits/reorder, keyboard preview completion,
  response-count/revision preservation, no write requests, carousel controls, pause/offscreen/hover,
  empty-example fallback and mobile dialog Escape/focus restoration.
- No page errors or horizontal document overflow at 1440, 1280, 768 and 390 px. Landing axe scans
  returned no WCAG 2 A/AA or 2.1 AA violations at desktop and mobile widths.
- A 720 CSS-pixel viewport verifies the layout equivalent to 200% zoom in a 1440-pixel window.
  This landing check is viewport emulation, not an actual browser-zoom claim.

## Remaining limits

Chromium mobile emulation does not verify physical iOS/Android keyboards, Safari, Firefox or manual
screen-reader use. Native touch scrolling is implemented; physical-device swipe behavior is
unverified. Automated axe checks are not an accessibility certification.

Production smoke checks passed at 1440 and 390 px. All 49 observed static asset requests returned
200, including loaded Inter and DM Serif Display fonts. Workspace/sample navigation worked;
there were zero page errors, zero API writes, and identical before/after revisions and response
counts. See [production desktop](screenshots/landing/production-hero-1440.png) and
[production mobile](screenshots/landing/production-hero-390.png).

The README's 18 local links/images resolved. Both Mermaid diagrams parsed and rendered to SVG
with Mermaid 11.17.2 in a temporary local browser check. GitHub's live rendering of the unpublished
README is not observed. Temporary documentation tools are isolated in the ignored cache.

The current public repository still needs the approved changes pushed. A working hosted demo
remains required for assignment submission.
