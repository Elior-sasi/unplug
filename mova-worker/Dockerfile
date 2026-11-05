FROM python:3.12-slim
WORKDIR /srv
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app.py mova_adapter.py probe.py ./
# Install the reviewed upstream adapter separately before enabling cloud discovery.
# This container intentionally does not accept MOVAhome credentials over HTTP.
RUN useradd --create-home --uid 10001 appuser
USER appuser
EXPOSE 8080
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8080"]
