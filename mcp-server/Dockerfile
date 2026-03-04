FROM python:3.12-slim

WORKDIR /app

COPY pyproject.toml .
RUN pip install --no-cache-dir .

COPY server.py .

RUN mkdir -p /app/data

ENV BB_DB_PATH=/app/data/beaver.db
ENV MCP_HOST=0.0.0.0
ENV MCP_PORT=8001

EXPOSE 8001

CMD ["python", "server.py"]
