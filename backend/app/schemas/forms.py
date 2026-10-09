from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StrictBool,
    StrictFloat,
    StrictInt,
    model_validator,
)


class Schema(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)


class Theme(Schema):
    key: Literal["neutral"] = "neutral"


class ThankYou(Schema):
    title: str = Field(default="Thanks for sharing.", max_length=200)
    description: str = Field(default="Your response is in.", max_length=2000)


class Option(Schema):
    id: UUID
    label: str = Field(max_length=500)


class EmptySettings(Schema):
    pass


class NumberSettings(Schema):
    min: StrictFloat | StrictInt | None = None
    max: StrictFloat | StrictInt | None = None

    @model_validator(mode="after")
    def validate_bounds(self):
        if self.min is not None and self.max is not None and self.min > self.max:
            raise ValueError("Minimum cannot exceed maximum")
        return self


class RatingSettings(Schema):
    scale: Annotated[StrictInt, Field(ge=2, le=10)] = 5


class QuestionBase(Schema):
    id: UUID
    title: str = Field(default="", max_length=500)
    description: str = Field(default="", max_length=2000)
    required: StrictBool = False


class TextQuestion(QuestionBase):
    type: Literal["short_text", "long_text", "email", "yes_no"]
    settings: EmptySettings = Field(default_factory=EmptySettings)
    options: list[Option] = Field(default_factory=list, max_length=0)


class ChoiceQuestion(QuestionBase):
    type: Literal["multiple_choice", "dropdown"]
    settings: EmptySettings = Field(default_factory=EmptySettings)
    options: list[Option] = Field(default_factory=list, max_length=100)


class NumberQuestion(QuestionBase):
    type: Literal["number"]
    settings: NumberSettings = Field(default_factory=NumberSettings)
    options: list[Option] = Field(default_factory=list, max_length=0)


class RatingQuestion(QuestionBase):
    type: Literal["rating"]
    settings: RatingSettings = Field(default_factory=RatingSettings)
    options: list[Option] = Field(default_factory=list, max_length=0)


QuestionDefinition = Annotated[
    TextQuestion | ChoiceQuestion | NumberQuestion | RatingQuestion, Field(discriminator="type")
]


class FormDefinition(Schema):
    title: str = Field(max_length=200)
    theme: Theme = Field(default_factory=Theme)
    thank_you: ThankYou = Field(default_factory=ThankYou)
    questions: list[QuestionDefinition] = Field(default_factory=list, max_length=100)

    @model_validator(mode="after")
    def unique_keys(self):
        question_keys = [question.id for question in self.questions]
        option_keys = [option.id for question in self.questions for option in question.options]
        if len(set(question_keys)) != len(question_keys):
            raise ValueError("Question IDs must be unique")
        if len(set(option_keys)) != len(option_keys):
            raise ValueError("Option IDs must be unique across the form")
        return self


class DraftWrite(FormDefinition):
    expected_revision: Annotated[StrictInt, Field(ge=0)]


class RevisionRequest(Schema):
    expected_revision: Annotated[StrictInt, Field(ge=0)]


class RenameRequest(RevisionRequest):
    title: str = Field(min_length=1, max_length=200)


class CreateForm(Schema):
    title: str = Field(default="Untitled form", min_length=1, max_length=200)

    @model_validator(mode="after")
    def nonblank_title(self):
        self.title = self.title.strip()
        if not self.title:
            raise ValueError("Give your form a name")
        return self


class VersionMetadata(Schema):
    id: UUID
    version_number: int
    source_draft_revision: int
    published_at: datetime


class FormCard(Schema):
    id: UUID
    title: str
    slug: str
    status: Literal["draft", "published"]
    draft_revision: int
    response_count: int
    question_count: int
    created_at: datetime
    updated_at: datetime


class FormDetail(FormCard, FormDefinition):
    published_version_id: UUID | None
    versions: list[VersionMetadata]


class FormList(Schema):
    items: list[FormCard]
    total: int
    limit: int
    offset: int


class AnswerInput(Schema):
    question_id: UUID
    value: Annotated[str, Field(max_length=10_000)] | StrictBool | StrictInt | StrictFloat


class SubmissionRequest(Schema):
    form_version_id: UUID
    idempotency_key: UUID
    answers: list[AnswerInput] = Field(max_length=100)


class SubmissionReceipt(Schema):
    id: UUID
    form_version_id: UUID
    submitted_at: datetime


class PublicForm(FormDefinition):
    form_version_id: UUID
