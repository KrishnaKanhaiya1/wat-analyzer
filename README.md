# UdaanCoach (formerly WAT Analyzer) 🚀

UdaanCoach is an AI-powered soft skill, communication, and career growth platform tailored for the Indian market. It transforms traditional Word Association Tests (WAT) into a highly interactive, adaptive, and comprehensive training experience for defence aspirants (SSB), job seekers, students, and working professionals.

## 🌟 Key Features

*   **🧠 Real Transformer AI:** Utilizes `gemini-2.0-flash`, DistilBERT, and `sentence-transformers` for deep sentiment, emotion, and trait analysis.
*   **📊 Explainable AI:** View precisely how your words impact standard traits (Optimism, Empathy, Leadership, Agency) using detailed token highlights.
*   **✍️ Rewrite Coach:** Get immediate, side-by-side AI-generated alternatives that strengthen weak traits with targeted explanations.
*   **📈 Cross-Session Tracking:** Track your thought pattern evolution over time with time-series visualizations.
*   **🎯 Adaptive Difficulty:** Employs bandit algorithms to dynamically surface challenging prompts targeting your weakest areas.
*   **🎫 Soft-Skill Passport:** A unified performance profile across all domains, exportable as a high-quality PDF.
*   **🌐 Bi-Lingual Support:** Seamlessly handles and analyzes both English and Hindi responses.

## 🛠️ Tech Stack

*   **Backend:** FastAPI, SQLAlchemy, PostgreSQL, Alembic, Google Gemini API, HuggingFace Transformers
*   **Frontend:** React (Vite), Tailwind CSS, Framer Motion, Recharts, i18next
*   **DevOps:** Docker, Docker Compose, GitHub Actions

## 🚦 Getting Started

### Prerequisites
*   Node.js (v18+)
*   Python (3.11+)
*   PostgreSQL
*   Gemini API Key

### Installation

1.  **Clone & Set Up API**
    ```bash
    git clone https://github.com/yourusername/udaancoach.git
    cd udaancoach/api
    python -m venv venv
    source venv/bin/activate # (Windows: .\venv\Scripts\activate)
    pip install -r requirements.txt
    ```

2.  **Environment Variables (`api/.env`)**
    ```env
    DATABASE_URL=postgresql://user:password@localhost:5432/udaancoach
    SECRET_KEY=your_super_secret_jwt_key
    GEMINI_API_KEY=your_google_gemini_api_key
    ```

3.  **Run Migrations & Start Backend**
    ```bash
    alembic upgrade head
    uvicorn api.main:app --reload --port 8000
    ```

4.  **Start Frontend**
    ```bash
    cd ../web
    npm install
    npm run dev
    ```

**(Optional) Docker Compose**
Execute `docker-compose up --build` from the root directory to spin up the Database, Backend API, and Frontend web server simultaneously.

## 📝 License
Proprietary / MIT License
