FROM nvidia/cuda:12.4.1-cudnn-runtime-ubuntu22.04

RUN apt-get update && \
    apt-get install -y python3 python3-pip git libsndfile1 && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8020

CMD ["python3", "-m", "uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8020"]
