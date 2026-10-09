from secrets import token_urlsafe

from sqlalchemy import func, select
from sqlalchemy.dialects.sqlite import insert
from sqlalchemy.orm import Session, selectinload

from app.errors import AppError
from app.models import Creator, Form, FormVersion, Question, Submission
from app.schemas.forms import CreateForm, FormCard, FormDetail, FormList
from app.services.transactions import begin_write

DEFAULT_CREATOR_ID = "00000000-0000-4000-8000-000000000001"


def ensure_creator(session: Session) -> Creator:
    session.execute(
        insert(Creator)
        .values(id=DEFAULT_CREATOR_ID, display_name="Gupta")
        .on_conflict_do_nothing(index_elements=["id"])
    )
    return session.get(Creator, DEFAULT_CREATOR_ID)


def form_card(session: Session, form: Form) -> FormCard:
    response_count = session.scalar(
        select(func.count()).select_from(Submission).where(Submission.form_id == form.id)
    )
    question_count = session.scalar(
        select(func.count()).select_from(Question).where(Question.form_id == form.id)
    )
    return FormCard(
        id=form.id,
        title=form.title,
        slug=form.slug,
        status=form.status,
        draft_revision=form.draft_revision,
        response_count=response_count or 0,
        question_count=question_count or 0,
        created_at=form.created_at,
        updated_at=form.updated_at,
    )


def form_detail(session: Session, form: Form) -> FormDetail:
    versions = session.scalars(
        select(FormVersion)
        .where(FormVersion.form_id == form.id)
        .order_by(FormVersion.version_number.desc())
    ).all()
    return FormDetail(
        **form_card(session, form).model_dump(),
        theme=form.theme_json,
        thank_you=form.thank_you_json,
        published_version_id=form.published_version_id,
        versions=[
            {
                "id": version.id,
                "version_number": version.version_number,
                "source_draft_revision": version.source_draft_revision,
                "published_at": version.published_at,
            }
            for version in versions
        ],
        questions=[
            {
                "id": question.id,
                "type": question.type,
                "title": question.title,
                "description": question.description,
                "required": question.required,
                "settings": question.settings_json,
                "options": [
                    {"id": option.id, "label": option.label} for option in question.options
                ],
            }
            for question in form.questions
        ],
    )


def get_form(session: Session, form_id: str) -> Form:
    form = session.scalar(
        select(Form)
        .where(Form.id == form_id, Form.creator_id == DEFAULT_CREATOR_ID)
        .options(selectinload(Form.questions).selectinload(Question.options))
    )
    if form is None:
        raise AppError(404, "form_not_found", "This form could not be found.")
    return form


def list_forms(session: Session, limit: int, offset: int, search: str = "") -> FormList:
    statement = select(Form).where(Form.creator_id == DEFAULT_CREATOR_ID)
    if search.strip():
        statement = statement.where(
            func.lower(Form.title).contains(search.strip().lower(), autoescape=True)
        )
    total = session.scalar(select(func.count()).select_from(statement.subquery())) or 0
    forms = session.scalars(
        statement.order_by(Form.updated_at.desc(), Form.id).limit(limit).offset(offset)
    ).all()
    return FormList(
        items=[form_card(session, form) for form in forms], total=total, limit=limit, offset=offset
    )


def create_form(session: Session, payload: CreateForm) -> FormDetail:
    begin_write(session)
    ensure_creator(session)
    form = Form(creator_id=DEFAULT_CREATOR_ID, title=payload.title, slug=token_urlsafe(12))
    session.add(form)
    session.commit()
    return form_detail(session, form)
