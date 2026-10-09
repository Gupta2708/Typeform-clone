import hashlib
import json

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.errors import AppError
from app.models import Answer, Form, FormVersion, Submission
from app.schemas.forms import FormDefinition, PublicForm, SubmissionReceipt, SubmissionRequest
from app.services.transactions import begin_write
from app.services.validation import normalize_answers


def get_public_form(session: Session, slug: str) -> PublicForm:
    form = session.scalar(select(Form).where(Form.slug == slug))
    if form is None:
        raise AppError(404, "form_not_found", "This form could not be found.")
    if form.status != "published" or not form.published_version_id:
        raise AppError(410, "form_closed", "This form isn’t accepting responses right now.")
    version = session.get(FormVersion, form.published_version_id)
    return PublicForm(**version.definition_json, form_version_id=version.id)


def receipt(submission: Submission) -> SubmissionReceipt:
    return SubmissionReceipt(
        id=submission.id,
        form_version_id=submission.form_version_id,
        submitted_at=submission.submitted_at,
    )


def submit(
    session: Session, slug: str, payload: SubmissionRequest
) -> tuple[SubmissionReceipt, bool]:
    begin_write(session)
    form = session.scalar(select(Form).where(Form.slug == slug))
    if form is None:
        raise AppError(404, "form_not_found", "This form could not be found.")
    key = str(payload.idempotency_key)
    existing = session.scalar(
        select(Submission).where(Submission.form_id == form.id, Submission.idempotency_key == key)
    )
    version = session.scalar(
        select(FormVersion).where(
            FormVersion.id == str(payload.form_version_id), FormVersion.form_id == form.id
        )
    )
    conflict = AppError(
        409, "idempotency_conflict", "This attempt was already used for different answers."
    )
    if version is None:
        if existing:
            raise conflict
        raise AppError(
            422, "version_invalid", "The submitted version does not belong to this form."
        )
    try:
        answers = normalize_answers(FormDefinition.model_validate(version.definition_json), payload)
    except AppError:
        if existing:
            raise conflict from None
        raise
    canonical = {"form_version_id": version.id, "answers": answers}
    request_hash = hashlib.sha256(
        json.dumps(
            canonical, sort_keys=True, separators=(",", ":"), ensure_ascii=False, allow_nan=False
        ).encode()
    ).hexdigest()
    if existing:
        if existing.request_hash != request_hash:
            raise conflict
        result = receipt(existing)
        session.commit()
        return result, False
    if form.status != "published" or not form.published_version_id:
        raise AppError(410, "form_closed", "This form isn’t accepting responses right now.")
    submission = Submission(
        form_id=form.id, form_version_id=version.id, idempotency_key=key, request_hash=request_hash
    )
    submission.answers = [
        Answer(question_key=question_id, value_json=value) for question_id, value in answers.items()
    ]
    session.add(submission)
    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        existing = session.scalar(
            select(Submission).where(
                Submission.form_id == form.id, Submission.idempotency_key == key
            )
        )
        if existing and existing.request_hash == request_hash:
            return receipt(existing), False
        raise conflict from None
    return receipt(submission), True
