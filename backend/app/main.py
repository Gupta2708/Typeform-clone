from fastapi import Depends, FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.api.forms import router as forms_router
from app.config import get_settings
from app.database import get_session
from app.errors import (
    AppError,
    app_error_handler,
    unexpected_error_handler,
    validation_error_handler,
)
from app.middleware import RequestSizeLimit

settings = get_settings()
app = FastAPI(title="Typeform Builder API", version="0.1.0", debug=False)
app.add_exception_handler(AppError, app_error_handler)
app.add_exception_handler(RequestValidationError, validation_error_handler)
app.add_exception_handler(Exception, unexpected_error_handler)
app.add_middleware(RequestSizeLimit, max_bytes=settings.max_request_bytes)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Content-Type"],
)
app.include_router(forms_router)


@app.get("/health", tags=["Operations"])
def health(session: Session = Depends(get_session)):
    try:
        session.execute(text("SELECT id FROM creators LIMIT 1"))
    except SQLAlchemyError as exc:
        raise AppError(
            503, "database_unavailable", "Database is unavailable or not migrated."
        ) from exc
    return {"status": "ok", "database": "ready"}
