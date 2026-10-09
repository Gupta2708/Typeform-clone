from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.errors import AppError
from app.models import FormVersion, Submission
from app.schemas.forms import FormDefinition
from app.schemas.responses import ResponseDetail, ResponseList
from app.services.forms import get_form
from app.services.submissions import receipt


def response_detail(session: Session, submission: Submission) -> ResponseDetail:
    version = session.get(FormVersion, submission.form_version_id)
    definition = FormDefinition.model_validate(version.definition_json)
    values = {answer.question_key: answer.value_json for answer in submission.answers}
    answers = []
    for question in definition.questions:
        value = values.get(str(question.id))
        display = None
        if value is not None:
            if question.type in {"multiple_choice", "dropdown"}:
                display = next(
                    option.label for option in question.options if str(option.id) == value
                )
            elif question.type == "yes_no":
                display = "Yes" if value else "No"
            else:
                display = str(value)
        answers.append(
            {
                "question_id": str(question.id),
                "title": question.title,
                "type": question.type,
                "required": question.required,
                "value": value,
                "display_value": display,
            }
        )
    return ResponseDetail(
        **receipt(submission).model_dump(), version_number=version.version_number, answers=answers
    )


def list_responses(session: Session, form_id: str, limit: int, offset: int) -> ResponseList:
    get_form(session, form_id)
    query = select(Submission).where(Submission.form_id == form_id)
    total = session.scalar(select(func.count()).select_from(query.subquery())) or 0
    items = session.scalars(
        query.options(selectinload(Submission.answers))
        .order_by(Submission.submitted_at.desc(), Submission.id)
        .limit(limit)
        .offset(offset)
    ).all()
    return ResponseList(
        items=[response_detail(session, item) for item in items],
        total=total,
        limit=limit,
        offset=offset,
    )


def get_response(session: Session, form_id: str, response_id: str) -> ResponseDetail:
    get_form(session, form_id)
    submission = session.scalar(
        select(Submission)
        .where(Submission.form_id == form_id, Submission.id == response_id)
        .options(selectinload(Submission.answers))
    )
    if submission is None:
        raise AppError(404, "response_not_found", "This response could not be found.")
    return response_detail(session, submission)
