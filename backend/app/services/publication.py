from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import FormVersion
from app.schemas.forms import FormDefinition, FormDetail
from app.services.drafts import guard_revision
from app.services.forms import form_detail, get_form
from app.services.transactions import begin_write
from app.services.validation import validate_publication


def publish(session: Session, form_id: str, expected_revision: int) -> FormDetail:
    begin_write(session)
    form = get_form(session, form_id)
    guard_revision(session, form, expected_revision, advance=False)
    detail = form_detail(session, form)
    definition = FormDefinition.model_validate(
        detail.model_dump(include={"title", "theme", "thank_you", "questions"})
    )
    validate_publication(definition)
    current = (
        session.get(FormVersion, form.published_version_id) if form.published_version_id else None
    )
    if current is None or current.source_draft_revision != form.draft_revision:
        number = (
            session.scalar(
                select(func.max(FormVersion.version_number)).where(FormVersion.form_id == form.id)
            )
            or 0
        )
        current = FormVersion(
            form_id=form.id,
            version_number=number + 1,
            source_draft_revision=form.draft_revision,
            definition_json=definition.model_dump(mode="json"),
        )
        session.add(current)
        session.flush()
    form.published_version_id = current.id
    form.status = "published"
    session.commit()
    return form_detail(session, form)


def unpublish(session: Session, form_id: str) -> FormDetail:
    begin_write(session)
    form = get_form(session, form_id)
    form.status = "draft"
    session.commit()
    return form_detail(session, form)
