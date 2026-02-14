.PHONY: format lint test install

format:
	black .
	isort .

lint:
	black --check .
	isort --check-only .
	flake8 . --max-line-length=100

test:
	pytest -q

install:
	pip install -r requirements.txt -r requirements-dev.txt
