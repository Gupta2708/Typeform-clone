from uuid import UUID

from app.schemas.forms import Schema


class DistributionBucket(Schema):
    value: str | int | bool
    label: str
    count: int
    percentage: float | None


class NumericStatistics(Schema):
    min: float
    max: float
    mean: float


class QuestionSummary(Schema):
    question_id: UUID
    title: str
    type: str
    required: bool
    answered_count: int
    skipped_count: int
    distribution: list[DistributionBucket] = []
    statistics: NumericStatistics | None = None
    text_samples: list[str] = []


class SummaryResponse(Schema):
    form_version_id: UUID | None
    version_number: int | None
    total_responses: int
    questions: list[QuestionSummary]
