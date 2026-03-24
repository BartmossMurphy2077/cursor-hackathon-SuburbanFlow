# ---- Stage 1: Build the React frontend ----
FROM node:20-alpine AS frontend-build

WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ---- Stage 2: Python API + compiled frontend ----
FROM python:3.12-slim

WORKDIR /app

COPY backend_or_api/requirements.txt /app/backend_or_api/requirements.txt
RUN pip install --no-cache-dir -r /app/backend_or_api/requirements.txt

COPY alembic.ini /app/alembic.ini
COPY backend_or_api /app/backend_or_api

COPY --from=frontend-build /app/frontend/dist /app/frontend/dist

EXPOSE 8000

CMD ["uvicorn", "backend_or_api.app.main:app", "--host", "0.0.0.0", "--port", "8001"]
