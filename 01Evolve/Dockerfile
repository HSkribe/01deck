FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=8080

COPY pyproject.toml README.md ./
COPY app ./app

RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir .

# Exec form, no shell wrapper: `sh -c "..."` silently dropped every
# 01DECK_*-prefixed environment variable in production (confirmed via
# `docker run -e "01DECK_ALLOWED_HOSTS=..." ... sh -c 'env | grep 01DECK'`
# printing nothing) -- dash refuses to carry forward env vars whose names
# aren't valid POSIX shell identifiers (i.e. don't start with a letter or
# underscore) when spawning a child process. PORT is already hardcoded to
# 8080 via ENV above and nothing in this deployment ever sets a different
# PORT, so the shell substitution this CMD used to do was never doing
# anything besides breaking every 01DECK_* config value.
CMD ["uvicorn", "app.api.app:api", "--host", "0.0.0.0", "--port", "8080"]
