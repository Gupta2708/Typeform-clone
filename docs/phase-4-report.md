# Phase 4 — polished public player

Preview and public forms now use one exhaustive eight-type renderer registry. Choice/yes-no and
rating groups use radio semantics, roving tab stops and arrow-key selection. The searchable
dropdown has a styled listbox, explicit selection, keyboard arrows/Enter/Escape, active descendant,
and clear unavailable-search state. The implementations follow the official WAI patterns:
[combobox](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) and
[radio group](https://www.w3.org/WAI/ARIA/apg/patterns/radio/).

Each new question focuses its heading; text inputs are focused on validation errors rather than
opening a mobile keyboard automatically. Description/errors are associated with the answer.
Enter advances single-line questions, Ctrl/Cmd+Enter advances long text while Enter preserves
newlines, letter and rating shortcuts select values, and Back preserves answers. Transition and
submission guards suppress extra actions. Required whitespace, malformed email, non-finite number
and bounds are validated with matching server rules. Optional answers can be cleared.

An unchanged failed submission retries the same frozen payload and idempotency key. The thank-you
and 100% completed state appear only after the API confirms success. Closing a form rejects new
submissions from an already-open player; a later visit shows the closed state.

## Observed checks

| Check | Result |
| --- | --- |
| Frontend typecheck/lint/build | Passed |
| Player and preview browser subset | 5 passed |
| Final searchable-dropdown/player subset | 4 passed |
| Anonymous eight-type answer flow | Passed; verified stored values, including false, 0 and long-text newlines |
| Lost acknowledgement after actual API write | Retry returned success with identical key/payload and only one stored response |
| Normal-motion repeated Enter | One active question and no skipped question |
| Reduced-motion navigation and Back | Passed |
| Mobile choice/dropdown screenshots at 390 px | Captured and opened for visual inspection |

Screens: [desktop text](screenshots/phase-4/public-text-desktop.png),
[desktop choices](screenshots/phase-4/public-choice-desktop.png),
[mobile choices](screenshots/phase-4/public-choice-mobile.png), and
[mobile open dropdown](screenshots/phase-4/public-dropdown-mobile.png).

The browser mobile check uses Chromium viewport emulation. Actual phone keyboards and a manual
screen-reader audit have not been observed. Phase 6 will broaden responsive/accessibility checks,
including zoom and long content. Version-scoped summaries and final seed fixtures remain Phase 5.
No hosted deployment or push has occurred.

Commit: `feat: polish accessible respondent experience`.
Author/committer: `Gupta2708 <guptavaibhav2708@gmail.com>`; no co-author trailers.
