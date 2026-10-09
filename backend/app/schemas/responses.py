from pydantic import Field, StrictBool, StrictFloat, StrictInt

from app.schemas.forms import Schema, SubmissionReceipt


class HistoricalAnswer(Schema):
    question_id: str
    title: str
    type: str
    required: bool
    value: str | StrictBool | StrictInt | StrictFloat | None
    display_value: str | None


class ResponseDetail(SubmissionReceipt):
    version_number: int
    answers: list[HistoricalAnswer]


class ResponseList(Schema):
    items: list[ResponseDetail]
    total: int
    limit: int = Field(ge=1)
    offset: int = Field(ge=0)
