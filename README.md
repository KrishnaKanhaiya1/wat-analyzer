# AI-Powered Word Association Test (WAT) Analyzer

The WAT Analyzer is a full-stack, production-quality web application designed to be a universal word-association and short-text analyzer. It coaches users on mindset and soft skills across four key domains:

1. **Defence & SSB Preparation:** Cultivating "Officer Like Qualities"
2. **Job Interviews & Campus Placements:** Demonstrating professional competence
3. **School/College Mindset Building:** Fostering a growth mindset
4. **Workplace Communication & Leadership:** Developing leadership and empathy

Powered by real AI models (Hugging Face Transformers) and large language models (Google Gemini), the app moves beyond dummy hardcoded patterns to deliver meaningful linguistic and psychological analysis of any text input.

---

## 🚀 Features

* **Real AI Pipeline:** Uses DistilBERT (sentiment), GoEmotions RoBERTa (emotion spectrum), all-MiniLM (sentence embeddings), and XLM-RoBERTa (multilingual support).
* **Cross-Session Timeline:** Tracks your thought patterns and trait evolution across multiple test sessions.
* **Explainable AI Highlights:** Token-level heatmaps show exactly which words influenced your score negatively or positively.
* **Adaptive Word Selection (Bandit):** Intelligently surfaces words from your weaker thematic areas to ensure progressive improvement.
* **Interactive AI Rewrite Coach:** Integrates with Gemini to provide actionable, module-specific suggestions on how to improve weak responses.
* **Multi-language Support:** Seamlessly handles both English and Hindi inputs.
* **Personal Soft-Skill Passport:** A unified profile aggregating your strengths, growth areas, and an exportable PDF radar chart.

---

## 🛠️ Tech Stack

* **Frontend:** React, Vite, Tailwind CSS
* **Backend:** Python, FastAPI, SQLAlchemy (SQLite by default)
* **AI/ML:** PyTorch, Transformers (Hugging Face), Google Generative AI (Gemini)

---

## 💻 How to Run Locally

If you want to download and run this project on your own machine, follow these steps.

### Prerequisites
* **Python 3.10+** (Tested on Python 3.12)
* **Node.js** (v18+ recommended)
* **Git**

### 1. Clone the Repository
```bash
git clone https://github.com/KrishnaKanhaiya1/wat-analyzer.git
cd wat-analyzer
```

### 2. Set up the Backend (FastAPI + AI Models)

Open a terminal and navigate to the project root directory:

```bash
# Optional but recommended: Create a virtual environment
python -m venv venv
# On Windows: venv\Scripts\activate
# On Mac/Linux: source venv/bin/activate

# Install the Python dependencies
pip install -r api/requirements.txt
```

*(Note: The first time you run the backend, it will download several AI models from Hugging Face. This may take a few minutes depending on your internet connection.)*

**Set up your Gemini API Key:**
Create a `.env` file inside the `api/` directory (i.e., `api/.env`) and add your Google Gemini API key:
```env
GEMINI_API_KEY=your_actual_api_key_here
```
*(If you don't have an API key, the app will still work using a built-in fallback rewrite system!)*

**Start the Backend Server:**
```bash
uvicorn api.main:app --reload --port 8000
```
The backend is now running at `http://localhost:8000`.

### 3. Set up the Frontend (React + Vite)

Open a **new, separate terminal window**.

```bash
cd wat-analyzer/web

# Install Node dependencies
npm install

# Start the frontend dev server
npm run dev
```

### 4. Open the App
Your frontend terminal will show a local URL (usually `http://localhost:3000` or `http://localhost:3001`). Open that link in your web browser. 

Create an account, and start your first WAT session!

---

## 📝 License
This project is open-source and available under the MIT License.
