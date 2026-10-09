# Phase 5 — versioned results and demo data

Results now include Responses/Summary views and a published-version selector. Distribution bars
show real counts and answered-response percentages; rating/number summaries include min/max/mean;
text/email summaries include answered counts and recent values. Skips remain separate, empty
averages are unavailable, and historical prompts/choice labels are resolved from snapshots.

The explicit `scripts.seed --demo` command creates Customer experience and Community event,
published with ten production-validated submissions each, and Product discovery (draft).
Together they demonstrate all eight types, optional skips, zero guests and false yes/no answers.
Stable IDs and attempt keys make reruns non-destructive. Existing fixture edits/publication state
are preserved. Foundation drafts and user-created verification forms are retained separately.

## Observed checks

| Check | Result |
| --- | --- |
| Backend pytest | 30 passed; existing upstream test-client warning |
| Ruff lint/format | Passed after correcting three lint findings |
| Frontend typecheck/lint/build | Passed |
| Results browser workflows | 2 passed |
| Seed command on local database | Created 3 demo forms; rerun created 0 |
| Seed invariants in isolated DB | Exactly 2 published, 1 draft, 20 responses; all 8 types and optional skips |
| Historical summaries after draft replacement | Old summary unchanged; new version initially has 0 responses |
| Pagination | 31 responses yield disjoint pages of 25 and 6 |
| Aggregate denominator | 2 false of 3 answered among 4 submissions = 66.67%, with 1 skip |
| Large finite numeric means | 31 values of 1e308 produce a finite mean of 1e308 |

Actual captures were opened and reviewed: [responses](screenshots/phase-5/responses-desktop.png),
[historical detail](screenshots/phase-5/detail-desktop.png),
[desktop summary](screenshots/phase-5/summary-desktop.png), and
[mobile summary](screenshots/phase-5/summary-mobile.png).

Phase 6 remains: broad accessibility/zoom/long-content checks, final quality gates and complete
durable-SQLite deployment/handoff instructions. No hosted deployment or push has occurred.
Final assignment submission still requires public repository source and a working hosted demo.

Commit: `feat: add versioned results and demo data`.
Author/committer: `Gupta2708 <guptavaibhav2708@gmail.com>`; no co-author trailers.
