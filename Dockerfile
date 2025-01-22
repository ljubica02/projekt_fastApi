# app/Dockerfile
FROM python:3.10-slim

# Postavi radni direktorij
WORKDIR /app

# Kopiraj requirements i instaliraj
COPY app/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Kopiraj ostatak koda
COPY app/ /app
COPY ./static /app/static
COPY ./templates /app/templates


# Expose port 5000 (FastAPI)
EXPOSE 5000

# Definiraj startnu točku (pokretanje uvicorn)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "5000"]
