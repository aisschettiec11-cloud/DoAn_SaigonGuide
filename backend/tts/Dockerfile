FROM python:3.12-slim
WORKDIR /app
RUN pip install --no-cache-dir gTTS==2.5.4
COPY server.py .
USER nobody
EXPOSE 8080
CMD ["python", "server.py"]
