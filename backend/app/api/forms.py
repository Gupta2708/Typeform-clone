from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_session
from app.schemas.forms import CreateForm, FormDetail, FormList
from app.services import forms

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
