# Fully Detailed Documentation

## Conda env setup
- ***nvidia-sim***
Wed Jun 10 12:28:19 2026
+-----------------------------------------------------------------------------------------+
| NVIDIA-SMI 581.95                 Driver Version: 581.95         CUDA Version: 13.0     |
+-----------------------------------------+------------------------+----------------------+
| GPU  Name                  Driver-Model | Bus-Id          Disp.A | Volatile Uncorr. ECC |
| Fan  Temp   Perf          Pwr:Usage/Cap |           Memory-Usage | GPU-Util  Compute M. |
|                                         |                        |               MIG M. |
|=========================================+========================+======================|
|   0  NVIDIA GeForce RTX 4060 ...  WDDM  |   00000000:01:00.0 Off |                  N/A |
| N/A   48C    P8              3W /   90W |     554MiB /   8188MiB |      0%      Default |
|                                         |                        |                  N/A |
+-----------------------------------------+------------------------+----------------------+

+-----------------------------------------------------------------------------------------+
| Processes:                                                                              |
|  GPU   GI   CI              PID   Type   Process name                        GPU Memory |
|        ID   ID                                                               Usage      |
|=========================================================================================|
|    0   N/A  N/A           11572    C+G   ....0.3967.96\msedgewebview2.exe      N/A      |
|    0   N/A  N/A           12784    C+G   ...2txyewy\CrossDeviceResume.exe      N/A      |
|    0   N/A  N/A           15292    C+G   ...aude\app-1.11187.4\claude.exe      N/A      |
|    0   N/A  N/A           16576    C+G   ..._cw5n1h2txyewy\SearchHost.exe      N/A      |
|    0   N/A  N/A           16588    C+G   ...y\StartMenuExperienceHost.exe      N/A      |
|    0   N/A  N/A           19404    C+G   ...lare WARP\Cloudflare WARP.exe      N/A      |
|    0   N/A  N/A           19652    C+G   ...\SubAgent\AlienFXSubAgent.exe      N/A      |
|    0   N/A  N/A           20812    C+G   ...5n1h2txyewy\TextInputHost.exe      N/A      |
|    0   N/A  N/A           27036    C+G   ...aude\app-1.11187.4\claude.exe      N/A      |
|    0   N/A  N/A           27056    C+G   ...8bbwe\PhoneExperienceHost.exe      N/A      |
|    0   N/A  N/A           28656    C+G   ...indows\System32\ShellHost.exe      N/A      |
|    0   N/A  N/A           30256    C+G   ...1g1gvanyjgm\WhatsApp.Root.exe      N/A      |
|    0   N/A  N/A           34040    C+G   ...yb3d8bbwe\WindowsTerminal.exe      N/A      |
|    0   N/A  N/A           36904    C+G   ...cord\app-1.0.9240\Discord.exe      N/A      |
+-----------------------------------------------------------------------------------------+
- ***conda --version***
conda 25.5.1

## Step 1 — Create Environment
***conda create -n finintel python=3.11 -y***
Activate:
***conda activate finintel***

## Step 2 — Upgrade Pip
python -m pip install --upgrade pip
Verify:
pip --version
Step 3 — Install CUDA PyTorch

Use the official CUDA 12.1 build:
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121

## Step 4 — Verify GPU Access
Run:
python
Then:
import torch
print(torch.__version__)
print(torch.cuda.is_available())
print(torch.cuda.get_device_name(0))

Expected:
True
NVIDIA GeForce RTX 4060 Laptop GPU

## Step 5 — Install Core ML Stack
Windows PowerShell alternative:
pip install numpy pandas scikit-learn matplotlib seaborn jupyter ipykernel scipy

## Step 6 — Install NLP Stack
pip install spacy sentence-transformers transformers accelerate
Then:
python -m spacy download en_core_web_sm

## Step 7 — Install OCR Stack
pip install paddleocr
For OpenCV:
pip install opencv-python
PDF tools:
pip install pdfplumber camelot-py pypdf
Excel:
pip install openpyxl xlrd

## Step 8 — Install Database Drivers
pip install neo4j psycopg2-binary sqlalchemy

## Step 9 — Install FastAPI Stack
pip install fastapi uvicorn python-multipart httpx

## Step 10 — Install Explainability Stack
pip install shap

## Step 11 — Install RAG Stack
pip install langchain langchain-community faiss-cpu

## Step 12 — Save Environment
After everything is installed:
conda env export > environment.yml
This will allow the entire team to reproduce the environment instantly.

## Step 13 — Install Rust
For the backend:
winget install Rustlang.Rustup
Verify:
rustc --version
cargo --version

# Phase 0: Infrastructure & Monorepo Setup
Our goal is:
Phase 0 Success Criteria

✅ Monorepo created
✅ Rust backend boots
✅ Python services boot
✅ PostgreSQL container runs
✅ Neo4j container runs
✅ Docker Compose starts everything
✅ Health checks work
✅ Service-to-service communication ready

## Step 1: Project structure
finintel/
│
├── backend/
│
├── ml-services/
│   ├── ocr/
│   ├── standardize/
│   ├── entity/
│   ├── anomaly/
│   ├── temporal/
│   ├── graph-ml/
│   └── explainer/
│
├── frontend/
├── graph-db/
├── storage/
├── scripts/
├── docs/
│
├── docker-compose.yml
├── .env
└── README.md

## Step 2: Initialize Rust Backend
backend/
├── Cargo.toml
└── src/
    └── main.rs

- ***cargo init***

## Step 3: Configure rust dependencies
- backend/Cargo.toml

## Step 4: Backend API Health Rust
- backend/src/main.rs
- Working Fine

http://localhost:8080/health

## Step 5: Python Service tempelate
## Step 6: OCR Service
ml-services/ocr/
│
├── main.py
└── requirements.txt

***uvicorn main:app --reload --port 8001***
http://localhost:8001/health
- Working Fine

## Step 7: Create .env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=finintel

POSTGRES_PORT=5432

NEO4J_USER=neo4j
NEO4J_PASSWORD=password

NEO4J_HTTP_PORT=7474
NEO4J_BOLT_PORT=7687

## Step 8: Docker Compose 
- ***docker compose up -d***
- verify ***docker ps***
- working fine
finintel-postgres
finintel-neo4j

## Step 9: Create PostgreSQL Schema

We want the database structure finalized before any ingestion code is written.
scripts/
└── init_postgres.sql

## Step 10: Neo4j Constraints
graph-db/
└── constraints.cypher

http://localhost:7474

## Step 11: Shared services contract model
ml-services/
└── shared/
    └── models.py

## Step 12: Remaining microservices skeleton
- standardize : port 8002
- entity : port 8003
- anomaly : 8004
- temporal : 8005
- graph ml : 8006
- explainer : 8007

## Step 13: Rust service registry
backend/src/config/services.rs
- Service Communication working fine

finintel/
│
├── backend/
│
├── ml-services/
│   │
│   ├── shared/
│   │   └── models.py
│   │
│   ├── ocr/
│   │   ├── main.py
│   │   ├── requirements.txt
│   │   └── Dockerfile
│   │
│   ├── standardize/
│   │   ├── main.py
│   │   ├── requirements.txt
│   │   └── Dockerfile
│   │
│   ├── entity/
│   │   ├── main.py
│   │   ├── requirements.txt
│   │   └── Dockerfile
│   │
│   ├── anomaly/
│   │   ├── main.py
│   │   ├── requirements.txt
│   │   └── Dockerfile
│   │
│   ├── temporal/
│   │   ├── main.py
│   │   ├── requirements.txt
│   │   └── Dockerfile
│   │
│   ├── graph-ml/
│   │   ├── main.py
│   │   ├── requirements.txt
│   │   └── Dockerfile
│   │
│   └── explainer/
│       ├── main.py
│       ├── requirements.txt
│       └── Dockerfile
│
├── frontend/
├── graph-db/
├── storage/
├── scripts/
└── docker-compose.yml

## Step 14: Test
http://localhost:8080/services/health

- all the services working and reported to rust
{
  "backend": {
    "service": "finintel-backend",
    "status": "healthy"
  },
  "services": {
    "ocr": {
      "service": "ocr",
      "status": "healthy"
    },
    "standardize": {
      "service": "standardize",
      "status": "healthy"
    },
    "entity": {
      "service": "entity",
      "status": "healthy"
    },
    "anomaly": {
      "service": "anomaly",
      "status": "healthy"
    },
    "temporal": {
      "service": "temporal",
      "status": "healthy"
    },
    "graph_ml": {
      "service": "graph_ml",
      "status": "healthy"
    },
    "explainer": {
      "service": "explainer",
      "status": "healthy"
    }
  }
}

## Step 15: Refactoring the rust backend
- Done
src/
│
├── main.rs
│
├── config/
│   ├── mod.rs
│   └── services.rs
│
├── routes/
│   ├── mod.rs
│   └── health_routes.rs
│
├── handlers/
│   ├── mod.rs
│   └── health_handler.rs
│
├── services/
│   ├── mod.rs
│   └── service_checker.rs
│
├── models/
│   ├── mod.rs
│   └── health.rs
│
├── repositories/
│   └── mod.rs
│
└── state/
    ├── mod.rs
    └── app_state.rs
