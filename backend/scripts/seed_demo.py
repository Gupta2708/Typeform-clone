"""Non-destructive final demo fixtures, distinct from the foundation visual drafts."""

from datetime import timedelta
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Form, FormVersion, Submission
from app.models.entities import utc_now
from app.schemas.forms import DraftWrite, SubmissionRequest
from app.services import drafts, publication, submissions
from app.services.forms import DEFAULT_CREATOR_ID, ensure_creator
from scripts.seed import definition, seed_id


def seed_demo(session: Session) -> int:
    ensure_creator(session)
    fixtures = [
        (
            "experience",
            "Customer experience",
            [
                (
                    "short_text",
                    "First things first, what’s your name?",
                    "We’d love to know a little about you.",
                    True,
                    [],
                ),
                (
                    "multiple_choice",
                    "What made the biggest difference?",
                    "Think about the little things.",
                    True,
                    ["Thoughtful design", "Helpful people", "Easy to use"],
                ),
                ("email", "Where can we reach you?", "Only if you’d like a follow-up.", False, []),
                (
                    "rating",
                    "How was your experience overall?",
                    "1 is not great. 5 is wonderful.",
                    True,
                    [],
                ),
                ("yes_no", "Would you recommend us to a friend?", "", True, []),
                ("long_text", "Anything else on your mind?", "We’re listening.", False, []),
            ],
        ),
        (
            "event",
            "Community event",
            [
                (
                    "short_text",
                    "What should we call you?",
                    "Your name for the guest list.",
                    True,
                    [],
                ),
                (
                    "dropdown",
                    "Which ticket is right for you?",
                    "Find your seat at the table.",
                    True,
                    ["General admission", "Workshop + admission", "Community pass"],
                ),
                (
                    "number",
                    "How many guests are joining you?",
                    "Enter 0 if you’re coming solo.",
                    True,
                    [],
                ),
                (
                    "email",
                    "Where should we send your invitation?",
                    "An optional reminder, just for you.",
                    False,
                    [],
                ),
                ("yes_no", "Would you like to join the workshop?", "", False, []),
            ],
        ),
        (
            "discovery",
            "Product discovery (draft)",
            [
                (
                    "long_text",
                    "What does a great workday look like?",
                    "Tell us what you wish there was more time for.",
                    False,
                    [],
                ),
                (
                    "rating",
                    "How does your current setup feel?",
                    "1 to 5, from frustrating to delightful.",
                    False,
                    [],
                ),
            ],
        ),
    ]
    created = 0
    names = ["Avery", "Maya", "Sam", "Riya", "Oliver", "Noor", "Arjun", "Jules", "Priya", "Leo"]
    for key, title, prompts in fixtures:
        form_id = seed_id(f"demo/{key}")
        if session.get(Form, form_id) is not None:
            continue  # Preserve edits, publication state and all existing responses.
        form = Form(id=form_id, creator_id=DEFAULT_CREATOR_ID, title=title, slug=f"demo-{key}")
        session.add(form)
        session.flush()
        draft = definition(f"demo/{key}", title, prompts)
        saved = drafts.save_draft(
            session, form_id, DraftWrite(**draft.model_dump(), expected_revision=0)
        )
        if key == "discovery":
            created += 1
            continue
        live = publication.publish(session, form_id, saved.draft_revision)
        version = session.get(FormVersion, str(live.published_version_id))
        for i, name in enumerate(names):
            answers = []
            for question in draft.questions:
                if not question.required and (
                    i % 3 == 0 or (question.type == "yes_no" and i % 2 == 0)
                ):
                    continue
                if question.type == "short_text":
                    value = name
                elif question.type == "email":
                    value = f"{name.lower()}@example.com"
                elif question.type in {"multiple_choice", "dropdown"}:
                    value = str(question.options[i % len(question.options)].id)
                elif question.type == "number":
                    value = i % 4
                elif question.type == "rating":
                    value = i % 5 + 1
                elif question.type == "yes_no":
                    value = i % 4 != 0
                else:
                    value = [
                        "A thoughtful experience.\nI’d happily come back.",
                        "The team made it feel personal.",
                        "A little more guidance would help.",
                    ][i % 3]
                answers.append({"question_id": question.id, "value": value})
            payload = SubmissionRequest(
                form_version_id=UUID(version.id),
                idempotency_key=UUID(seed_id(f"demo/{key}/response/{i}")),
                answers=answers,
            )
            # Production validation, transaction and idempotency paths create every demo answer.
            receipt, _ = submissions.submit(session, form.slug, payload)
            row = session.scalar(select(Submission).where(Submission.id == str(receipt.id)))
            row.submitted_at = utc_now() - timedelta(days=9 - i, hours=i % 3)
            session.commit()
        created += 1
    return created
