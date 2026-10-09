from collections import Counter, defaultdict
from math import fsum

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.errors import AppError
from app.models import Answer, FormVersion, Submission
from app.schemas.forms import FormDefinition
from app.schemas.summary import SummaryResponse
from app.services.forms import get_form


def form_summary(session: Session, form_id: str, version_id: str | None) -> SummaryResponse:
    form = get_form(session, form_id)
    selected = version_id or form.published_version_id
    if selected is None:
        return SummaryResponse(
            form_version_id=None, version_number=None, total_responses=0, questions=[]
        )
    version = session.scalar(
        select(FormVersion).where(FormVersion.id == selected, FormVersion.form_id == form_id)
    )
    if version is None:
        raise AppError(404, "version_not_found", "This published version could not be found.")
    total = (
        session.scalar(
            select(func.count())
            .select_from(Submission)
            .where(Submission.form_id == form_id, Submission.form_version_id == selected)
        )
        or 0
    )
    answers = session.scalars(
        select(Answer)
        .join(Submission)
        .where(Submission.form_id == form_id, Submission.form_version_id == selected)
        .order_by(Submission.submitted_at.desc(), Submission.id, Answer.id)
    ).all()
    values = defaultdict(list)
    for answer in answers:
        values[answer.question_key].append(answer.value_json)
    definition = FormDefinition.model_validate(version.definition_json)
    summaries = []
    for question in definition.questions:
        items = values[str(question.id)]
        count = len(items)
        distribution = []
        statistics = None
        samples = []
        if question.type in {"multiple_choice", "dropdown", "yes_no", "rating"}:
            if question.type in {"multiple_choice", "dropdown"}:
                buckets = [(str(option.id), option.label) for option in question.options]
            elif question.type == "yes_no":
                buckets = [(True, "Yes"), (False, "No")]
            else:
                buckets = [
                    (rating, str(rating)) for rating in range(1, question.settings.scale + 1)
                ]
            counts = Counter(items)
            distribution = [
                {
                    "value": value,
                    "label": label,
                    "count": counts[value],
                    "percentage": round(counts[value] / count * 100, 2) if count else None,
                }
                for value, label in buckets
            ]
        if question.type in {"number", "rating"} and count:
            scale = max(abs(item) for item in items)
            mean = fsum(item / scale for item in items) / count * scale if scale else 0
            statistics = {"min": min(items), "max": max(items), "mean": mean}
        if question.type in {"short_text", "long_text", "email"}:
            samples = items[:5]
        summaries.append(
            {
                "question_id": str(question.id),
                "title": question.title,
                "type": question.type,
                "required": question.required,
                "answered_count": count,
                "skipped_count": total - count,
                "distribution": distribution,
                "statistics": statistics,
                "text_samples": samples,
            }
        )
    return SummaryResponse(
        form_version_id=version.id,
        version_number=version.version_number,
        total_responses=total,
        questions=summaries,
    )
