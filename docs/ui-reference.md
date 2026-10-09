# Visual reference and acceptance gates

Research date: 9 October 2026. Read this before changing the interface.

## Chosen reference

Use the Content-panel workflow shown in Typeform's official publication article as the
coherent creator reference. Borrow the product's restrained hierarchy and conversational
canvas, while adapting its newer page-based editor to this assignment's ordered questions.
Do not mix in an unrelated dashboard template or marketing homepage.

Official sources and locally inspected screenshots:

- [Publish your form](https://help.typeform.com/hc/en-us/articles/24301719623828-Publish-your-form-to-make-it-live)
  — [builder screenshot](references/typeform-builder.png), downloaded from
  https://help.typeform.com/hc/article_attachments/42345172870036.
- [Edit in preview mode](https://help.typeform.com/hc/en-us/articles/360052109711-Edit-your-form-in-preview-mode)
  — [preview screenshot](references/typeform-preview.png), downloaded from
  https://help.typeform.com/hc/article_attachments/25308102878868.
- [Working with responses](https://help.typeform.com/hc/en-us/articles/360029253732-Working-with-your-responses)
  — [responses screenshot](references/typeform-responses.png), downloaded from
  https://help.typeform.com/hc/article_attachments/52768859276820.
- [Sharing guidance](https://help.typeform.com/hc/en-us/articles/360029252892-Share-your-form)
  and [template gallery](https://www.typeform.com/templates) are additional research targets
  for the functional share/public-flow milestones, not inspected screenshot evidence yet.

The first three screenshots were downloaded and visually inspected. No signed-in Typeform
creator account was accessed. No interactive public sample form has been inspected yet.
Official screenshots remain Typeform's reference material; they are not app assets or
evidence that we reproduced proprietary code.

## Observed patterns

- Builder: compact top-level Content/Workflow/Connect navigation; form breadcrumb at left;
  Share at right; left ordered content rail; generous central canvas; narrow settings column.
- Muted question-type badges, thin borders, pale neutral panel chrome, modest corner radii,
  compact required switches, and desktop/mobile preview controls.
- Canvas: question number/arrow, prominent prompt, subordinate description, choice key badges,
  and ample space surrounding the active question. The coffee reference uses a themed green
  canvas; our default neutral theme is an intentional adaptation.
- Preview: isolated form surface and a small close/mobile/reset control area. The screenshot
  shows a welcome screen; it is not evidence for exact question-input or transition behavior.
- Results: compact tab row, response count, white table, muted question badges, date ordering,
  and understated borders. Responses and summary are separate views.
- Draft changes require an explicit publication action and do not replace the live form
  automatically. The share URL remains stable when edits are published.

## Explicit fallback/adaptation choices

- Workspace: 224 px sidebar and simple form cards. An official workspace screenshot has not
  been inspected; this follows the assignment's workspace description.
- Font: locally bundled **Inter Variable**, OFL-1.1; no proprietary Typeform font dependency.
- Creator: white panels, warm `#F7F7F5` background, `#262625` text, `#E7E7E3` dividers.
- Respondent: dark `#243E4A` accent, left-aligned content up to 720 px wide; headings around
  34 px desktop and 25–27 px mobile; underline inputs and bounded choice rows.
- Builder: 258 px question rail, flexible center, 286 px settings at wide desktop sizes.
  Below 900 px, Questions/Question/Settings tabs keep every panel reachable.
- Motion: 250 ms transform/opacity transitions with reduced-motion support. Timing is from
  the assignment, not measured from the static references.
- Touch, focus, dynamic viewport height, safe-area spacing, progress, and keyboard rules follow
  the brief. An interactive public sample must inform further refinement in Phase 4.

Tokens live in `frontend/src/app/globals.css`; shared answer widgets live in the player
components. Preview is explicitly isolated from response collection.

## Visual gates

Phase 1 establishes layout/typography and inspects real browser captures. The foundation seed
creates real SQLite-backed **drafts only**, with zero responses, to exercise the layouts.
Disabled edit/publish controls are unfinished milestone functionality, not simulated success.

Phase 3 is incomplete until actual workspace, builder, question-picker, settings-panel, and
preview screenshots have been shown to the user and reviewed. Correct functionality alone
does not pass this checkpoint. Phase 6 refines an already polished interface.

Final comparisons: workspace, choice builder, picker/settings, desktop text and choice player,
mobile player, responses/detail/summary, and share dialog. Review 1440, 1280, 768, and 390 px,
long content, 200% zoom, visible focus, and reduced motion.
