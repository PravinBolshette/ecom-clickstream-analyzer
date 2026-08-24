# E-Commerce Clickstream Log Analyzer with Multi-Node Hadoop & Streamlit Dashboard

A end-to-end Big Data & Cloud Computing pipeline that generates synthetic e-commerce clickstream logs, stores them in a multi-node **Apache Hadoop HDFS** cluster, processes aggregations using **Python MapReduce Streaming**, visualizes business metrics on an interactive **Streamlit + Plotly** dashboard, and deploys to **AWS EC2**.

---

## 🚀 Step 1: Generate Synthetic Clickstream Dataset

Run `generate_data.py` to generate 100,000+ realistic e-commerce clickstream log rows with session-level funnel rules.

### Prerequisites
- Python 3.8+
- Required libraries: `faker` (optional), standard libraries `csv`, `random`, `uuid`, `datetime`

### Command
```bash
python generate_data.py
```

### Dataset Schema (`clickstream.csv`)
| Column | Type | Example | Description |
|---|---|---|---|
| `event_id` | String | `E100001` | Unique event ID |
| `user_id` | String | `U142` | User ID (U101 to U5000) |
| `session_id` | String | `S1205` | Session ID (S1001 to S20000) |
| `timestamp` | ISO String | `2026-08-16T14:30:00Z` | Event timestamp (24-hour spread) |
| `action` | Enum | `SEARCH`, `VIEW`, `ADD_TO_CART`, `PURCHASE` | Weighted funnel action |
| `product_id` | String | `P1024` | Product ID (P1001 to P1050) |
| `category` | String | `Electronics`, `Fashion`, `Home`, `Sports`, `Books` | Product Category |
| `price` | Float | `299.99` | Product price |
| `device` | Enum | `Mobile`, `Desktop`, `Tablet` | User device |
| `location` | Enum | `Pune`, `Mumbai`, `Delhi`, `Bangalore`, `Hyderabad` | User location |

> 💡 **Session Funnel Logic Enforced**: A session with a `PURCHASE` action is strictly guaranteed to have previous `VIEW` or `ADD_TO_CART` actions in the same session.

---

## 🐳 Step 2: Configure Multi-Node Hadoop Cluster

The multi-node Hadoop 3.x cluster is containerized with Docker Compose.

### Cluster Topology (`docker-compose.yml`)
- **`namenode`**: Master Node (HDFS NameNode + Web UI on port `9870`, HDFS RPC port `9000`)
- **`datanode1`**: DataNode 1 (Storage container)
- **`datanode2`**: DataNode 2 (Storage container for replication)
- **`resourcemanager`**: YARN Master (ResourceManager Web UI on port `8088`)
- **`nodemanager`**: YARN Worker (NodeManager)

### Cluster Operations Commands

#### 1. Start Cluster
```bash
docker compose up -d
```

#### 2. Verify Connected Nodes
```bash
# Check Docker status
docker compose ps

# Verify HDFS DataNodes connected via NameNode CLI
docker exec -it namenode hdfs dfsadmin -report
```

#### 3. Access NameNode Container via Bash
```bash
docker exec -it namenode bash
```

---

## 📥 Step 3: Ingest Data into HDFS & Test Fault Tolerance

### Step-by-Step Command Guide

#### 1. Copy CSV from Host to NameNode Container
```bash
docker cp clickstream.csv namenode:/tmp/clickstream.csv
```

#### 2. Create HDFS Directory & Upload CSV (Replication Factor = 2)
```bash
# Inside NameNode or via docker exec
docker exec -it namenode hdfs dfs -mkdir -p /ecommerce/raw/
docker exec -it namenode hdfs dfs -D dfs.replication=2 -put -f /tmp/clickstream.csv /ecommerce/raw/clickstream.csv
```

#### 3. Inspect File Blocks, Block Locations & Health Status
```bash
docker exec -it namenode hdfs fsck /ecommerce/raw/clickstream.csv -files -blocks -locations
```

#### 4. Fault Tolerance Demonstration
To demonstrate fault tolerance, manually stop `datanode2` and verify data accessibility from `datanode1`:

```bash
# 1. Stop DataNode 2
docker stop datanode2

# 2. Verify HDFS is still operational and serving clickstream.csv from DataNode 1
docker exec -it namenode hdfs dfs -cat /ecommerce/raw/clickstream.csv | head -n 10

# 3. Check HDFS health report (shows 1 Live DataNode, file still accessible)
docker exec -it namenode hdfs fsck /ecommerce/raw/clickstream.csv

# 4. Restart DataNode 2 after test
docker start datanode2
```

---

## ⚡ Step 4: Python MapReduce Streaming Jobs

The MapReduce logic is implemented in modular Python scripts `mapper.py` and `reducer.py`.

### 1. Mapper Logic (`mapper.py`)
- Safely skips CSV headers and malformed lines via `try/except`.
- Emits key-value records for:
  - **Funnel Counts**: `FUNNEL\t<action>\t1`
  - **Hourly Traffic**: `HOURLY\t<HH>\t1`
  - **Product Views**: `PROD_VIEW\t<product_id>\t1`
  - **Product Purchases**: `PROD_PURCHASE\t<product_id>\t1`

### 2. Reducer Logic (`reducer.py`)
- Reads key-value pairs sorted by Hadoop Streaming.
- Aggregates counts per metric type and key, outputting final lines to `part-00000`.

### Terminal Execution Command on NameNode
```bash
# Copy mapper.py and reducer.py into NameNode
docker cp mapper.py namenode:/tmp/mapper.py
docker cp reducer.py namenode:/tmp/reducer.py

# Make executable inside NameNode
docker exec -it namenode chmod +x /tmp/mapper.py /tmp/reducer.py

# Execute Hadoop Streaming MapReduce Job
docker exec -it namenode mapred streaming \
  -files /tmp/mapper.py,/tmp/reducer.py \
  -mapper /tmp/mapper.py \
  -reducer /tmp/reducer.py \
  -input /ecommerce/raw/clickstream.csv \
  -output /ecommerce/output/
```

### Inspect Output File
```bash
# Inspect output directly in HDFS
docker exec -it namenode hdfs dfs -cat /ecommerce/output/part-00000 | head -n 30

# Extract output file to local host
docker exec -it namenode hdfs dfs -get /ecommerce/output/part-00000 ./part-00000
docker cp namenode:part-00000 ./part-00000
```

---

## 📊 Step 5: Streamlit Interactive Dashboard

The Streamlit dashboard (`app.py`) presents business insights using Plotly charts and fallback sample data for immediate standalone execution.

### Key Features
1. **KPI Scorecards**:
   - Total Visitors / Events
   - Conversion Rate: `(Purchases / Viewers) * 100`
   - Cart Abandonment Rate: `((Add to Cart - Purchases) / Add to Cart) * 100`
   - Peak Shopping Hour
2. **Interactive Visualizations**:
   - **Line Chart**: 24-Hour Traffic Pattern with peak window highlighting.
   - **Funnel Chart**: User Conversion Journey (`SEARCH` → `VIEW` → `ADD_TO_CART` → `PURCHASE`).
   - **Horizontal Bar Chart**: Top 10 Most Viewed vs Top 10 Most Purchased Products.
   - **Donut Chart**: Category-wise distribution.

### Run Dashboard Locally
```bash
pip install streamlit plotly pandas
streamlit run app.py
```

---

## ☁️ Step 6: Deploy to Cloud VM (AWS EC2 / GCP)

### 1. AWS Security Group Configuration
In the AWS EC2 Console, configure Inbound Rules for your Security Group:

| Type | Protocol | Port Range | Source | Description |
|---|---|---|---|---|
| Custom TCP | TCP | `8501` | `0.0.0.0/0` | Streamlit Dashboard |
| Custom TCP | TCP | `9870` | `0.0.0.0/0` | Hadoop NameNode Web UI |
| Custom TCP | TCP | `8088` | `0.0.0.0/0` | YARN ResourceManager UI |
| SSH | TCP | `22` | `0.0.0.0/0` | Remote Terminal Access |

### 2. Server Setup Commands (Ubuntu 22.04 LTS)

SSH into your EC2 instance (`t3.xlarge` or `t2.medium` with swap space):

```bash
# Update System Packages
sudo apt update && sudo apt upgrade -y

# Configure 4GB Swap Space (Recommended for t2.medium)
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Install Docker & Docker Compose
sudo apt install -y docker.io docker-compose git python3-pip
sudo usermod -aG docker ubuntu
newgrp docker

# Clone / Copy Project Repository
git clone <your-repo-url> ecom-clickstream
cd ecom-clickstream

# Install Python Requirements for Dashboard
pip3 install -r requirements.txt
```

### 3. Run Pipeline in Headless / Detached Mode

#### Option A: Using `systemd` Service
Create systemd service `/etc/systemd/system/streamlit-dashboard.service`:
```ini
[Unit]
Description=Streamlit E-Commerce Dashboard
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/ecom-clickstream
ExecStart=/home/ubuntu/.local/bin/streamlit run app.py --server.port 8501 --server.address 0.0.0.0
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable & start service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now streamlit-dashboard
```

#### Option B: Using `tmux`
```bash
# Start a detached tmux session
tmux new-session -d -s dashboard 'streamlit run app.py --server.port 8501 --server.address 0.0.0.0'
```

### 4. Access Live Public Application
Open your web browser and navigate to:
- **Streamlit Dashboard**: `http://<EC2-PUBLIC-IP>:8501`
- **Hadoop NameNode UI**: `http://<EC2-PUBLIC-IP>:9870`
- **YARN Resource UI**: `http://<EC2-PUBLIC-IP>:8088`

---

## 🛠 Project File Structure
```
Cloud_Computing_CP/
├── clickstream.csv           # Generated raw dataset (100,000+ rows)
├── generate_data.py          # Synthetic dataset generator script
├── docker-compose.yml        # Multi-node Hadoop 3.x cluster compose definition
├── mapper.py                 # Hadoop Streaming Mapper script
├── reducer.py                # Hadoop Streaming Reducer script
├── app.py                    # Streamlit + Plotly interactive dashboard
├── requirements.txt          # Python dependencies
└── README.md                 # Master project documentation & step-by-step guide
```
