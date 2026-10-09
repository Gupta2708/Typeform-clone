from fastapi import APIRouter, Response

from app.api.forms import DatabaseSession
from app.schemas.forms import PublicForm, SubmissionReceipt, SubmissionRequest
from app.services import submissions

router = APIRouter(prefix="/api/v1/public/forms", tags=["Public forms"])


@router.get("/{slug}", response_model=PublicForm)
def read_form(slug: str, session: DatabaseSession, response: Response):
    response.headers["Cache-Control"] = "no-store"
    return submissions.get_public_form(session, slug)


@router.post("/{slug}/responses", response_model=SubmissionReceipt, status_code=201)
def submit_form(
    slug: str, payload: SubmissionRequest, session: DatabaseSession, response: Response
):
    result, created = submissions.submit(session, slug, payload)
    response.status_code = 201 if created else 200
    response.headers["Cache-Control"] = "no-store"
    return result
