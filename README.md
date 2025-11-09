# Ecommerce (FastAPI + React)

A minimal ecommerce MVP with FastAPI backend and React (Vite) frontend.

## Backend (FastAPI)

- Path: `backend/`
- Tech: FastAPI, SQLModel, SQLite, Uvicorn

### Setup

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r backend\requirements.txt
uvicorn app.main:app --reload --port 8000 --app-dir backend
```

API:
- `GET http://127.0.0.1:8000/health`
- `GET http://127.0.0.1:8000/products`
- `GET http://127.0.0.1:8000/products/{id}`

## Frontend (React + Vite)

- Path: `frontend/` (to be created)

### Scaffold (Windows PowerShell)

```powershell
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
npm run dev
```

Then open: http://127.0.0.1:5173

Configure API base URL in frontend to `http://127.0.0.1:8000`.
