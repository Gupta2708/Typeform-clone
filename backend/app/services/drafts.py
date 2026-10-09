from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.errors import AppError
from app.models import Form, Question, QuestionOption
from app.models.entities import utc_now
from app.schemas.forms import DraftWrite, FormDetail, RenameRequest
from app.services.forms import form_detail, get_form
from app.services.transactions import begin_write


def guard_revision(session: Session, form: Form, expected: int, *, advance: bool = True) -> None:
    values = {"updated_at": utc_now()}
    if advance:
        values["draft_revision"] = Form.draft_revision + 1
    result = session.execute(
        update(Form)
        .where(Form.id == form.id, Form.draft_revision == expected)
        .values(**values)
        .execution_options(synchronize_session=False)
    )
    if result.rowcount != 1:
        raise AppError(
            409, "revision_conflict", "This form changed in another tab. Your local edits are safe."
        )
    session.expire(form, ["draft_revision", "updated_at"])


def save_draft(session: Session, form_id: str, payload: DraftWrite) -> FormDetail:
    begin_write(session)
    form = get_form(session, form_id)
    guard_revision(session, form, payload.expected_revision)
    desired_ids = [str(question.id) for question in payload.questions]
    foreign_questions = session.scalars(
        select(Question).where(Question.id.in_(desired_ids), Question.form_id != form.id)
    ).first()
    if foreign_questions:
        raise AppError(422, "foreign_question", "A question belongs to a different form.")
    option_owners = {
        str(option.id): str(question.id)
        for question in payload.questions
        for option in question.options
    }
    existing_options = session.scalars(
        select(QuestionOption).where(QuestionOption.id.in_(list(option_owners)))
    ).all()
    if any(option.question_id != option_owners[option.id] for option in existing_options):
        raise AppError(422, "foreign_option", "A choice belongs to a different question.")

    existing = {question.id: question for question in form.questions}
    # First move ALL existing positions into a disjoint range. A single direct rewrite
    # would collide with the UNIQUE constraints when swapping two questions/options.
    for question in existing.values():
        question.position = -question.position - 1
        for option in question.options:
            option.position = -option.position - 1
    session.flush()
    ordered = []
    for position, item in enumerate(payload.questions):
        question = existing.get(str(item.id)) or Question(id=str(item.id), form_id=form.id)
        question.position = position
        question.type = item.type
        question.title = item.title
        question.description = item.description
        question.required = item.required
        question.settings_json = item.settings.model_dump(mode="json")
        options = {option.id: option for option in question.options}
        next_options = []
        for option_position, option_data in enumerate(item.options):
            option = options.get(str(option_data.id)) or QuestionOption(id=str(option_data.id))
            option.position = option_position
            option.label = option_data.label
            next_options.append(option)
        question.options = next_options
        ordered.append(question)
    form.questions = ordered
    form.title = payload.title
    form.theme_json = payload.theme.model_dump(mode="json")
    form.thank_you_json = payload.thank_you.model_dump(mode="json")
    session.commit()
    return form_detail(session, form)


def rename_form(session: Session, form_id: str, payload: RenameRequest) -> FormDetail:
    if not payload.title.strip():
        raise AppError(422, "title_invalid", "Give your form a name.")
    begin_write(session)
    form = get_form(session, form_id)
    guard_revision(session, form, payload.expected_revision)
    form.title = payload.title.strip()
    session.commit()
    return form_detail(session, form)
