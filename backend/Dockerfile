FROM python:3.12-slim
COPY --from=ghcr.io/astral-sh/uv:0.11.2 /uv /usr/local/bin/uv
WORKDIR /app
ENV PYTHONUNBUFFERED=1
ENV UV_LINK_MODE=copy
COPY pyproject.toml uv.lock ./
RUN uv sync --locked --no-dev
COPY . .
ENV PATH="/app/.venv/bin:$PATH"
ENV DATABASE_URL=sqlite:////data/typeform.db
EXPOSE 8000
CMD ["python", "-m", "scripts.start_server"]
