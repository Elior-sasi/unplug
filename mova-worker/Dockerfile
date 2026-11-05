FROM python:3.12-slim
WORKDIR /srv
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
# Pinned community protocol, installed in an isolated container.
# Only the protocol package is copied; no Home Assistant runtime is started.
RUN git clone --filter=blob:none --no-checkout https://github.com/Tasshack/dreame-vacuum.git /tmp/dreame-vacuum \
    && cd /tmp/dreame-vacuum \
    && git sparse-checkout init --cone \
    && git sparse-checkout set custom_components/dreame_vacuum/dreame \
    && git checkout fec086caf064f2681e8bcc7be20a0d0ef54f444d \
    && mkdir -p /srv/custom_components/dreame_vacuum \
    && cp -R custom_components/dreame_vacuum/dreame /srv/custom_components/dreame_vacuum/ \
    && touch /srv/custom_components/__init__.py /srv/custom_components/dreame_vacuum/__init__.py \
    && rm -rf /tmp/dreame-vacuum
COPY app.py mova_adapter.py probe.py device_summary.py ./
RUN useradd --create-home --uid 10001 appuser
USER appuser
EXPOSE 8080
CMD ["sh", "-c", "exec uvicorn app:app --host 0.0.0.0 --port ${PORT:-8080}"]
