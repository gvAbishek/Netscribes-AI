# AI Compass — Netscribes AI Bot

AI Compass is a comprehensive full-stack AI platform designed for interacting with LLMs in various modes, including Direct LLM, Agent-based workflows, and Retrieval-Augmented Generation (RAG).

## 🚀 Architecture Overview

The project is split into two main components:
- **Frontend**: A modern React application built with Vite, TypeScript, and Tailwind CSS.
- **Backend**: A high-performance FastAPI service that manages AI interactions, database connections, and authentication.

---

## ✨ Key Features

- **Multiple AI Modes**: Switch between Direct LLM, Agent, and RAG modes for different use cases.
- **Authentication**: Secure login and signup using Firebase Authentication.
- **Persistent History**: Chat history and user details are stored in Azure Cosmos DB (MongoDB).
- **Responsive UI**: A sleek, dark-mode-first design built with shadcn/ui and Framer Motion for smooth animations.
- **Health Monitoring**: Built-in health check endpoints for the backend service.

---

## 🛠 Tech Stack

### Frontend
- **Framework**: React 18 (Vite)
- **Language**: TypeScript
- **Styling**: Tailwind CSS & shadcn/ui
- **Auth**: Firebase Client SDK
- **State Management**: React Hook Form & Zod
- **Icons**: Lucide React

### Backend
- **Framework**: FastAPI (Python)
- **Database**: Azure Cosmos DB for MongoDB (via `motor`)
- **AI Integration**: OpenAI API
- **Auth**: Firebase Admin SDK
- **Environment**: Pydantic Settings & Dotenv

---

## ⚙️ Getting Started

### 1. Prerequisites
- **Node.js**: v18+
- **Python**: v3.10+
- **Firebase Project**: Service account and client config.
- **OpenAI API Key**

### 2. Frontend Setup
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### 3. Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env  # Update with your secrets

# Start the server
uvicorn main:app --reload --port 8000
```

---

## 📁 Project Structure

```text
Netscribes-AI-Bot/
├── backend/            # FastAPI Python server
│   ├── routers/        # API route handlers
│   ├── database.py     # Cosmos DB logic
│   └── auth.py         # Firebase Admin integration
├── src/                # React application code
│   ├── components/     # UI components (shadcn)
│   ├── pages/          # Application views
│   └── context/        # Auth & Theme state
├── public/             # Static assets
└── package.json        # Frontend dependencies
```

---

## 📡 Deployment

The codebase is prepared for cross-platform deployment. Ensure that the CORS settings in the backend (`config.py`) are updated to match your production frontend URL.
