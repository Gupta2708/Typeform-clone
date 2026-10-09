from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    ForeignKey,
    ForeignKeyConstraint,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import DateTime, TypeDecorator

from app.database import Base


def new_id() -> str:
    return str(uuid4())


def utc_now() -> datetime:
    return datetime.now(UTC)


class UTCDateTime(TypeDecorator):
    """SQLite drops timezone metadata; restore UTC on read rather than emit naive JSON."""

    impl = DateTime
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        if value.tzinfo is None:
            raise ValueError("Timestamps must be timezone-aware")
        return value.astimezone(UTC).replace(tzinfo=None)

    def process_result_value(self, value, dialect):
        return value.replace(tzinfo=UTC) if value is not None else None


class Creator(Base):
    __tablename__ = "creators"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    display_name: Mapped[str] = mapped_column(String(100))


class Form(Base):
    __tablename__ = "forms"
    __table_args__ = (
        CheckConstraint("status IN ('draft', 'published')", name="ck_form_status"),
        CheckConstraint("draft_revision >= 0", name="ck_form_revision"),
        CheckConstraint(
            "status != 'published' OR published_version_id IS NOT NULL",
            name="ck_published_has_version",
        ),
        ForeignKeyConstraint(
            ["id", "published_version_id"],
            ["form_versions.form_id", "form_versions.id"],
            name="fk_form_published_version_owner",
            use_alter=True,
        ),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    creator_id: Mapped[str] = mapped_column(ForeignKey("creators.id"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    slug: Mapped[str] = mapped_column(String(64), unique=True)
    status: Mapped[str] = mapped_column(String(16), default="draft")
    draft_revision: Mapped[int] = mapped_column(default=0)
    published_version_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    theme_json: Mapped[dict] = mapped_column(JSON, default=lambda: {"key": "neutral"})
    thank_you_json: Mapped[dict] = mapped_column(
        JSON,
        default=lambda: {"title": "Thanks for sharing.", "description": "Your response is in."},
    )
    created_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utc_now, onupdate=utc_now)
    questions: Mapped[list["Question"]] = relationship(
        back_populates="form", cascade="all, delete-orphan", order_by="Question.position"
    )


class Question(Base):
    __tablename__ = "questions"
    __table_args__ = (
        UniqueConstraint("form_id", "position", name="uq_question_position"),
        CheckConstraint(
            "type IN ('short_text', 'long_text', 'multiple_choice', 'dropdown', "
            "'email', 'number', 'yes_no', 'rating')",
            name="ck_question_type",
        ),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    form_id: Mapped[str] = mapped_column(ForeignKey("forms.id", ondelete="CASCADE"), index=True)
    position: Mapped[int]
    type: Mapped[str] = mapped_column(String(24))
    title: Mapped[str] = mapped_column(String(500), default="")
    description: Mapped[str] = mapped_column(String(2000), default="")
    required: Mapped[bool] = mapped_column(Boolean, default=False)
    settings_json: Mapped[dict] = mapped_column(JSON, default=dict)
    form: Mapped[Form] = relationship(back_populates="questions")
    options: Mapped[list["QuestionOption"]] = relationship(
        back_populates="question", cascade="all, delete-orphan", order_by="QuestionOption.position"
    )


class QuestionOption(Base):
    __tablename__ = "question_options"
    __table_args__ = (UniqueConstraint("question_id", "position", name="uq_option_position"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    question_id: Mapped[str] = mapped_column(
        ForeignKey("questions.id", ondelete="CASCADE"), index=True
    )
    position: Mapped[int]
    label: Mapped[str] = mapped_column(String(500), default="")
    question: Mapped[Question] = relationship(back_populates="options")


class FormVersion(Base):
    __tablename__ = "form_versions"
    __table_args__ = (
        UniqueConstraint("form_id", "version_number", name="uq_form_version_number"),
        UniqueConstraint("form_id", "id", name="uq_form_version_owner"),
        CheckConstraint("version_number > 0", name="ck_version_number"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    form_id: Mapped[str] = mapped_column(ForeignKey("forms.id", ondelete="CASCADE"), index=True)
    version_number: Mapped[int]
    source_draft_revision: Mapped[int]
    definition_json: Mapped[dict] = mapped_column(JSON)
    published_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utc_now)


class Submission(Base):
    __tablename__ = "submissions"
    __table_args__ = (
        ForeignKeyConstraint(
            ["form_id", "form_version_id"],
            ["form_versions.form_id", "form_versions.id"],
            ondelete="CASCADE",
            name="fk_submission_version_owner",
        ),
        UniqueConstraint("form_id", "idempotency_key", name="uq_submission_attempt"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    form_id: Mapped[str] = mapped_column(ForeignKey("forms.id", ondelete="CASCADE"), index=True)
    form_version_id: Mapped[str] = mapped_column(String(36), index=True)
    idempotency_key: Mapped[str] = mapped_column(String(36))
    request_hash: Mapped[str] = mapped_column(String(64))
    submitted_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utc_now)
    answers: Mapped[list["Answer"]] = relationship(cascade="all, delete-orphan")


class Answer(Base):
    __tablename__ = "answers"
    __table_args__ = (UniqueConstraint("submission_id", "question_key", name="uq_answer_question"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    submission_id: Mapped[str] = mapped_column(
        ForeignKey("submissions.id", ondelete="CASCADE"), index=True
    )
    question_key: Mapped[str] = mapped_column(String(36))
    value_json: Mapped[str | int | float | bool] = mapped_column(JSON)
