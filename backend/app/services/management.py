from secrets import token_urlsafe
from uuid import uuid4

from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.models import Form, Question, QuestionOption
from app.schemas.forms import FormDetail
from app.services.forms import DEFAULT_CREATOR_ID, form_detail, get_form
from app.services.transactions import begin_write


def duplicate_form(session: Session, form_id: str) -> FormDetail:
    begin_write(session)
    original = get_form(session, form_id)
    copy = Form(
        creator_id=DEFAULT_CREATOR_ID,
        title=f"{original.title[:193]} (copy)",
        slug=token_urlsafe(12),
        theme_json=dict(original.theme_json),
        thank_you_json=dict(original.thank_you_json),
    )
    for item in original.questions:
        copy.questions.append(
            Question(
                id=str(uuid4()),
                position=item.position,
                type=item.type,
                title=item.title,
                description=item.description,
                required=item.required,
                settings_json=dict(item.settings_json),
                options=[
                    QuestionOption(id=str(uuid4()), position=option.position, label=option.label)
                    for option in item.options
                ],
            )
        )
    session.add(copy)
    session.commit()
    return form_detail(session, copy)


def delete_form(session: Session, form_id: str) -> None:
    begin_write(session)
    form = get_form(session, form_id)
    # Remove the same-form pointer before the owned versions are cascade-deleted.
    form.status = "draft"
    form.published_version_id = None
    session.flush()
    session.execute(delete(Form).where(Form.id == form.id))
    session.commit()
