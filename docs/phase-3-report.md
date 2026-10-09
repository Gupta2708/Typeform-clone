# Phase 3 — polished builder and management

Workspace actions now rename, duplicate, delete, and unpublish real forms. Duplicate creates
fresh form/question/option keys and a new slug, and copies no history. Delete explicitly confirms
loss of stored responses and cascades only the owned records.

The builder has all eight types, a searchable picker, inline title/description editing, required
toggles, choice editing, number bounds, rating scale, adjacent selection after deletion, question
duplication, and basic editable thank-you content. Design exposes the current neutral theme;
additional themes remain deferred. Preview uses the shared respondent renderer. Core controls
remain accessible in tabbed mobile panels, including publishing and results.

Reordering supports pointer drag with an overlay/insertion indication, keyboard Space/arrow/drop,
and explicit Move up/down controls. The overlay follows the locked package's
[official dnd-kit documentation](https://dndkit.com/legacy/api-documentation/draggable/drag-overlay/).

Autosave tests exercise a delayed request followed by a newer edit; exactly two serialized writes
use revisions 1 and 2, and the latest local/server text remains intact. On 409, local edits remain,
publication is blocked, JSON download works, Escape/cancel retains edits, and only the explicitly
labelled discard/reload button replaces them. Failed saves retain changes and offer a working retry.

## Observed checks

| Check | Result |
| --- | --- |
| Backend pytest | 27 passed; existing upstream test-client warning |
| Ruff lint/format | Passed |
| Frontend typecheck/lint/production build | Passed |
| Browser suite before final refinements | 10 passed |
| Type/reorder/conflict/visual regression subset | 4 passed; rename autofocus failure exposed and corrected |
| Corrected rename, duplicate, delete and focus tests | 2 passed, including create-dialog regression |

The rename dialog initially focused the close button. The shared dialog now focuses an editable
input when present and restores focus to the originating disclosure when a menu has closed.

## Actual visual checkpoint

Captured all five required screens at 1440, 1280, 768 and 390 px. Opened and inspected desktop,
intermediate and mobile captures, and displayed these actual browser images to the user before
the phase was considered complete. The required marker was refined after screenshot review.

- [Workspace](screenshots/phase-3/workspace-1440.png)
- [Builder](screenshots/phase-3/builder-1440.png)
- [Question picker](screenshots/phase-3/picker-1440.png)
- [Settings on mobile](screenshots/phase-3/settings-390.png)
- [Full-screen preview on mobile](screenshots/phase-3/preview-390.png)
- [1280 px builder](screenshots/phase-3/builder-1280.png)
- [768 px builder](screenshots/phase-3/builder-768.png)

The filtered workspace screenshot shows one matching form; its total is the isolated test DB's
actual total. No fabricated response metrics appear. These captures establish a polished foundation
for Phase 6; further public-player accessibility/keyboard/mobile work remains Phase 4, summaries and
published demo seeds Phase 5, and broad accessibility/deployment handoff Phase 6. No push or hosted
deployment has been performed.

Commit: `feat: complete polished builder and management`.
Author/committer: `Gupta2708 <guptavaibhav2708@gmail.com>`; no co-author trailers.
