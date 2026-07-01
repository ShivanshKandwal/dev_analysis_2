.PHONY: setup clean api frontend test all

setup:
	python -m venv venv
	venv\Scripts\pip install -r requirements.txt

clean:
	@echo "Cleaning up temp files..."

api:
	uvicorn src.api.main:app --reload --port 8000

frontend:
	cd frontend && npm run dev

test:
	pytest tests/ -v
