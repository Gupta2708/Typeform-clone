"""Explicit, non-destructive foundation or final demo fixtures."""

import argparse
from uuid import NAMESPACE_URL, uuid5

from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import Form, Question, QuestionOption
from app.schemas.forms import FormDefinition
from app.services.forms import DEFAULT_CREATOR_ID, ensure_creator


def seed_id(key: str) -> str:
    return str(uuid5(NAMESPACE_URL, f"typeform-builder/foundation/{key}"))


def definition(key: str, title: str, prompts: list[tuple]) -> FormDefinition:
    questions = []
    for index, (kind, prompt, description, required, labels) in enumerate(prompts):
        question_key = f"{key}/question/{index}"
        questions.append(
            {
                "id": seed_id(question_key),
                "type": kind,
                "title": prompt,
                "description": description,
                "required": required,
                "settings": {"scale": 5} if kind == "rating" else {},
                "options": [
                    {"id": seed_id(f"{question_key}/option/{i}"), "label": label}
                    for i, label in enumerate(labels)
                ],
            }
        )
    return FormDefinition(title=title, questions=questions)


def seed_foundation(session: Session) -> int:
    ensure_creator(session)
    drafts = [
        (
            "feedback",
            definition(
                "feedback",
                "Customer feedback",
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
                        "What did you enjoy most?",
                        "Think about the little things that made a difference.",
                        True,
                        [
                            "The thoughtful design",
                            "How easy it is to use",
                            "The helpful people",
                            "A little of everything",
                        ],
                    ),
                    (
                        "email",
                        "Where can we reach you?",
                        "Only if you’d like us to follow up.",
                        False,
                        [],
                    ),
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
        ),
        (
            "event",
            definition(
                "event",
                "Event registration",
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
                ],
            ),
        ),
        (
            "discovery",
            definition(
                "discovery",
                "Product discovery",
                [
                    (
                        "long_text",
                        "What does a great workday look like?",
                        "Tell us what you wish there was more time for.",
                        False,
                        [],
                    ),
                ],
            ),
        ),
    ]
    created = 0
    for key, draft in drafts:
        form_id = seed_id(key)
        if session.get(Form, form_id) is not None:
            continue  # Never replace edits to an existing fixture.
        form = Form(
            id=form_id,
            creator_id=DEFAULT_CREATOR_ID,
            title=draft.title,
            slug=f"foundation-{key}",
            theme_json=draft.theme.model_dump(),
            thank_you_json=draft.thank_you.model_dump(),
        )
        for position, item in enumerate(draft.questions):
            question = Question(
                id=str(item.id),
                position=position,
                type=item.type,
                title=item.title,
                description=item.description,
                required=item.required,
                settings_json=item.settings.model_dump(),
            )
            question.options = [
                QuestionOption(id=str(option.id), position=i, label=option.label)
                for i, option in enumerate(item.options)
            ]
            form.questions.append(question)
        session.add(form)
        session.flush()
        created += 1
    return created


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument(
        "--foundation",
        action="store_true",
        help="Create three draft fixtures; no published forms or responses.",
    )
    group.add_argument(
        "--demo",
        action="store_true",
        help="Two published forms with ten responses each, and one draft.",
    )
    args = parser.parse_args()
    with SessionLocal() as db:
        if args.foundation:
            count = seed_foundation(db)
            db.commit()
        else:
            from scripts.seed_demo import seed_demo

            count = seed_demo(db)
    print(
        f"Created {count} {'foundation drafts' if args.foundation else 'demo forms'}. "
        "Existing data was preserved."
    )
