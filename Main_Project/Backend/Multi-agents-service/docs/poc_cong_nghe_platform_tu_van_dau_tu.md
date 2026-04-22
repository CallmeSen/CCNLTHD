# Quet Main_Project: Cong nghe va platform cho PoC tu van dau tu

## Pham vi quet
- Da quet toan bo Main_Project, uu tien cac file nguon va tai lieu do nhom tao.
- Da loai tru nhieu tu khoa nhiu tu thu muc .venv (thu vien phu thuoc cai dat cuc bo).

## 1) Cong nghe dang duoc su dung truc tiep trong PoC hien tai

### Ngon ngu va moi truong
- Python 3.12-3.13
  - Bang chung: pyproject.toml (requires-python >=3.12,<=3.13)

### Framework/thu vien chinh cho he thong tu van
- CrewAI (multi-agent orchestration)
  - Vai tro: dieu phoi cac agent phan tich va tao khuyen nghi dau tu.
  - Bang chung: pyproject.toml (crewai[tools]); README.md (mo ta CrewAI); src/stock_analysis/crew.py (Agent, Crew, Task, Process).

- crewai_tools
  - Vai tro: cung cap tool web search/scrape va RAG tool cho agent.
  - Bang chung: src/stock_analysis/crew.py (WebsiteSearchTool, ScrapeWebsiteTool); src/stock_analysis/tools/sec_tools.py (RagTool).

- sec-api
  - Vai tro: lay du lieu SEC filings (10-K, 10-Q) phuc vu phan tich co ban.
  - Bang chung: pyproject.toml (sec-api); src/stock_analysis/tools/sec_tools.py (QueryApi, truy van filing).

- python-dotenv
  - Vai tro: nap bien moi truong/API key.
  - Bang chung: pyproject.toml (python-dotenv); src/stock_analysis/crew.py (load_dotenv()).

- html2text + requests
  - Vai tro: tai va chuyen noi dung filing HTML thanh text de xu ly.
  - Bang chung: pyproject.toml (html2text); src/stock_analysis/tools/sec_tools.py (requests, html2text).

### Model LLM va nha cung cap
- Groq (dang duoc bat trong code)
  - Vai tro: LLM cho cac agent trong PoC.
  - Bang chung: src/stock_analysis/crew.py (llm = LLM(model="groq/llama-3.3-70b-versatile")).

- Gemini (tuy chon)
  - Vai tro: phuong an LLM cloud thay the.
  - Bang chung: src/stock_analysis/crew.py (comment option gemini); .env.example (GEMINI_API_KEY).

- Ollama (tuy chon local)
  - Vai tro: chay model local tren may de toi uu chi phi/quyen rieng tu.
  - Bang chung: src/stock_analysis/crew.py (comment option ollama); README.md (muc Using Local Models with Ollama).

- OpenAI (tuy chon)
  - Vai tro: provider tra phi, co huong dan cau hinh.
  - Bang chung: .env.example (OPENAI_API_KEY); README.md (mo ta su dung GPT).

### Cong cu/nguon du lieu ben ngoai
- Serper API
  - Vai tro: tim kiem web.
  - Bang chung: .env.example (SERPER_API_KEY).

- Browserless API
  - Vai tro: thu thap/noi dung web tu dong.
  - Bang chung: .env.example (BROWSERLESS_API_KEY).

- SEC API
  - Vai tro: du lieu bao cao tai chinh SEC.
  - Bang chung: .env.example (SEC_API_API_KEY); src/stock_analysis/tools/sec_tools.py.

### Kien truc agent nghiep vu
- 3 nhom nang luc chinh cho tu van dau tu:
  - Fundamental agent
  - Technical agent
  - Screening agent
- Bang chung:
  - notebooks/01_poc_orchestrator.py (mo ta 3 skill agents + luong route)
  - src/stock_analysis/crew.py (financial_analyst/research_analyst/investment_advisor tasks)

### RL cho bai toan dieu phoi (PoC nghien cuu)
- Q-Learning + epsilon-greedy
  - Vai tro: hoc chien luoc route cau hoi nguoi dung den dung skill agent.
  - Bang chung: notebooks/01_poc_orchestrator.py (header mo ta RL orchestrator, cong thuc Q-Learning); CLAUDE.md va docs/context_from_claude_chat.md (xac nhan scope PoC phase 1).

### Nen tang thuc thi PoC
- Jupyter/Notebook workflow
  - Vai tro: trien khai PoC nhanh, thu nghiem RL va danh gia metrics.
  - Bang chung: CLAUDE.md (Phase 1: PoC notebook); thu muc notebooks va cac file nb_01, nb_02, nb_03.

## 2) Platform/cong nghe muc tieu trong roadmap (chua phai trang thai production hien tai)

- MLflow
  - Muc tieu: theo doi thi nghiem/metrics.
  - Bang chung: CLAUDE.md (Tech stack va roadmap); docs/context_from_claude_chat.md (Phase 2).

- Docker
  - Muc tieu: dong goi service.
  - Bang chung: CLAUDE.md va docs/context_from_claude_chat.md (Phase 2 Dockerized single service).

- Kubernetes microservices
  - Muc tieu: tach tung agent thanh microservice.
  - Bang chung: CLAUDE.md va docs/context_from_claude_chat.md (Phase 3).

- GitLab CI/CD
  - Muc tieu: tu dong build/test/deploy pipeline.
  - Bang chung: CLAUDE.md va docs/context_from_claude_chat.md (Phase 3).

- ArgoCD
  - Muc tieu: GitOps deployment tren K8s.
  - Bang chung: CLAUDE.md va docs/context_from_claude_chat.md (Phase 3).

## 3) Ket luan ngan cho de tai PoC tu van dau tu
- Core stack hien tai: Python + CrewAI + LLM provider (Groq/Gemini/Ollama/OpenAI) + SEC/Web tools + RL orchestrator (Q-Learning) tren notebook.
- Huong mo rong platform: MLflow + Docker + Kubernetes + GitLab CI/CD + ArgoCD de nang cap tu PoC sang Alpha/Beta/Production.

## 4) Luu y khi dien giai ket qua quet
- Cac package trong uv.lock la dependency tree (bao gom transitive), khong nen mac dinh la cong nghe cot loi cua PoC neu khong co bang chung su dung trong code nghiep vu.
- Muc "roadmap" la dinh huong da duoc ghi trong tai lieu, khong dong nghia da trien khai day du trong source hien tai.
