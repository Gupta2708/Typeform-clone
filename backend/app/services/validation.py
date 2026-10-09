import math
import re

from app.errors import AppError
from app.schemas.forms import FormDefinition, SubmissionRequest

EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


def finite_number(value) -> bool:
    if type(value) not in {int, float}:
        return False
    try:
        return math.isfinite(value)
    except OverflowError:
        return False


def validate_publication(definition: FormDefinition) -> None:
    errors = []
    if not definition.title.strip():
        errors.append({"field": "title", "message": "Give your form a name."})
    if not definition.questions:
        errors.append({"field": "questions", "message": "Add at least one question."})
    if not definition.thank_you.title.strip():
        errors.append({"field": "thank_you.title", "message": "Add a thank-you title."})
    for question in definition.questions:
        if not question.title.strip():
            errors.append({"question_id": str(question.id), "message": "Add a question title."})
        if question.type in {"multiple_choice", "dropdown"}:
            if len(question.options) < 2 or any(
                not option.label.strip() for option in question.options
            ):
                errors.append(
                    {
                        "question_id": str(question.id),
                        "message": "Add at least two choices, each with a label.",
                    }
                )
    if errors:
        raise AppError(422, "publish_invalid", "Your form needs a little attention.", errors)


def normalize_answers(definition: FormDefinition, payload: SubmissionRequest) -> dict:
    questions = {str(question.id): question for question in definition.questions}
    normalized = {}
    seen = set()
    errors = []
    for answer in payload.answers:
        key = str(answer.question_id)
        if key in seen:
            errors.append({"question_id": key, "message": "This question was answered twice."})
            continue
        seen.add(key)
        question = questions.get(key)
        if question is None:
            errors.append(
                {"question_id": key, "message": "This question is not in the form version."}
            )
            continue
        value = answer.value
        error = None
        if question.type in {"short_text", "long_text", "email"}:
            if not isinstance(value, str):
                error = "Enter a text answer."
            elif not value.strip():
                continue
            else:
                value = value if question.type == "long_text" else value.strip()
                if question.type == "email" and (
                    len(value) > 254 or not EMAIL_PATTERN.fullmatch(value)
                ):
                    error = "Enter a valid email address."
        elif question.type == "number":
            if not finite_number(value):
                error = "Enter a finite number."
            elif question.settings.min is not None and value < question.settings.min:
                error = f"Enter at least {question.settings.min}."
            elif question.settings.max is not None and value > question.settings.max:
                error = f"Enter no more than {question.settings.max}."
            elif isinstance(value, float) and value.is_integer():
                value = int(value)
        elif question.type == "rating":
            if type(value) is not int or not 1 <= value <= question.settings.scale:
                error = f"Choose a rating from 1 to {question.settings.scale}."
        elif question.type == "yes_no":
            if type(value) is not bool:
                error = "Choose Yes or No."
        elif question.type in {"multiple_choice", "dropdown"}:
            if not isinstance(value, str) or value not in {
                str(option.id) for option in question.options
            }:
                error = "Choose an option from this question."
        if error:
            errors.append({"question_id": key, "message": error})
        else:
            normalized[key] = value
    for key, question in questions.items():
        if (
            question.required
            and key not in normalized
            and not any(error.get("question_id") == key for error in errors)
        ):
            errors.append({"question_id": key, "message": "Please answer this question."})
    if errors:
        raise AppError(422, "answers_invalid", "Check your answers and try again.", errors)
    return normalized
