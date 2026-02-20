FROM python:3.10-slim

WORKDIR /app
COPY ./requirements_flwr.txt /app/requirements_flwr.txt
RUN pip install --no-cache-dir -r requirements_flwr.txt

COPY . /app
ENV PYTHONUNBUFFERED=1

CMD ["python", "flwr_server.py"]
