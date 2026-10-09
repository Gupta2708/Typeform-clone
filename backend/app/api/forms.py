from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from app.database import get_session
from app.schemas.forms import (
    CreateForm,
    DraftWrite,
    FormDetail,
    FormList,
    RenameRequest,
    RevisionRequest,
)
from app.schemas.responses import ResponseDetail, ResponseList
from app.services import drafts, forms, management, publication, responses

router = APIRouter(prefix="/api/v1/forms", tags=["Creator forms"])
DatabaseSession = Annotated[Session, Depends(get_session)]


@router.get("", response_model=FormList)
def list_forms(
    session: DatabaseSession, limit: int = Query(100, ge=1, le=100), offset: int = Query(0, ge=0)
):
    return forms.list_forms(session, limit, offset)


@router.post("", response_model=FormDetail, status_code=201)
def create_form(payload: CreateForm, session: DatabaseSession):
    return forms.create_form(session, payload)


@router.get("/{form_id}", response_model=FormDetail)
def get_form(form_id: UUID, session: DatabaseSession):
    return forms.form_detail(session, forms.get_form(session, str(form_id)))


@router.put("/{form_id}/draft", response_model=FormDetail)
def save_draft(form_id: UUID, payload: DraftWrite, session: DatabaseSession):
    return drafts.save_draft(session, str(form_id), payload)


@router.patch("/{form_id}", response_model=FormDetail)
def rename_form(form_id: UUID, payload: RenameRequest, session: DatabaseSession):
    return drafts.rename_form(session, str(form_id), payload)


@router.post("/{form_id}/publish", response_model=FormDetail)
def publish_form(form_id: UUID, payload: RevisionRequest, session: DatabaseSession):
    return publication.publish(session, str(form_id), payload.expected_revision)


@router.post("/{form_id}/duplicate", response_model=FormDetail, status_code=201)
def duplicate_form(form_id: UUID, session: DatabaseSession):
    return management.duplicate_form(session, str(form_id))


@router.delete("/{form_id}", status_code=204)
def delete_form(form_id: UUID, session: DatabaseSession):
    management.delete_form(session, str(form_id))
    return Response(status_code=204)


@router.post("/{form_id}/unpublish", response_model=FormDetail)
def unpublish_form(form_id: UUID, session: DatabaseSession):
    return publication.unpublish(session, str(form_id))


@router.get("/{form_id}/responses", response_model=ResponseList)
def list_responses(
    form_id: UUID,
    session: DatabaseSession,
    limit: int = Query(25, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    return responses.list_responses(session, str(form_id), limit, offset)


@router.get("/{form_id}/responses/{response_id}", response_model=ResponseDetail)
def read_response(form_id: UUID, response_id: UUID, session: DatabaseSession):
    return responses.get_response(session, str(form_id), str(response_id))
