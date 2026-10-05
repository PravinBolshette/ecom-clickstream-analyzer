# 📋 Project Viva Evidence Document: E-Commerce Clickstream Analyzer

This document tracks execution evidence, raw outputs, checkpoints, and Cloud Computing concepts proven throughout the pipeline implementation.

---

## 🔍 Phase 0: Initial Inspection & Baseline Verification

### 1. Inspected Files
- `docker-compose.yml`
- `mapper.py`
- `reducer.py`
- `generate_data.py`
- `part-00000`

### 2. Verified Parameters
- **Container Names (5 nodes):**
  1. `namenode` (Master: HDFS NameNode, RPC: 9000, Web UI: 9870)
  2. `datanode1` (Worker: HDFS DataNode storage)
  3. `datanode2` (Worker: HDFS DataNode storage, replication target)
  4. `resourcemanager` (Master: YARN ResourceManager, Web UI: 8088)
  5. `nodemanager` (Worker: YARN NodeManager compute container)
- **Hadoop Base Images & Python 3 Availability:**
  - Images: `bde2020/hadoop-namenode:2.0.0-hadoop3.2.1-java8`, `bde2020/hadoop-datanode:2.0.0-hadoop3.2.1-java8`, `bde2020/hadoop-resourcemanager:2.0.0-hadoop3.2.1-java8`, `bde2020/hadoop-nodemanager:2.0.0-hadoop3.2.1-java8`
  - Base Image: Debian with Oracle Java 8. **Python 3 is NOT installed by default** in these images.
- **Row-Count Variable in `generate_data.py`:**
  - Variable: `NUM_EVENTS = 100000` (Line 35)
- **Exact Key Format of `part-00000`:**
  - Tab-separated 3-column format: `<METRIC_TYPE>\t<KEY>\t<COUNT>`
  - Sample keys:
    - `FUNNEL\tADD_TO_CART\t18003`
    - `HOURLY\t00\t4178`
    - `PROD_PURCHASE\tP1001\t87`
    - `PROD_VIEW\tP1001\t823`

### 3. Checkpoint Assessment
- **Status:** **PASS** (Inspection complete with all parameters confirmed and risks identified).

---

## 🛠️ Preparation Phase: Container Customization, Line Endings & Docker Verification

### 1. Item 1 — Permanent Python 3 in Hadoop Containers
- **Created Dockerfiles:**
  - `docker/hadoop-python/Dockerfile.namenode` (based on `bde2020/hadoop-namenode:2.0.0-hadoop3.2.1-java8`)
  - `docker/hadoop-python/Dockerfile.nodemanager` (based on `bde2020/hadoop-nodemanager:2.0.0-hadoop3.2.1-java8`)
- **Debian Archive Repositories Fix:**
  - Replaced `deb.debian.org` and `security.debian.org` with `archive.debian.org`.
  - Removed deprecated `stretch-updates`/`jessie-updates`.
  - Added `-o Acquire::Check-Valid-Until=false` to bypass expired release files.
  - Linked `/usr/bin/python3` to `/usr/bin/python`.
- **`docker-compose.yml` updated:**
  - `namenode` and `nodemanager` now configured with `build:` context pointing to the new Dockerfiles.

### 2. Item 2 — Line Endings (CRLF to LF)
- **Files Converted:**
  - `mapper.py`: Converted to LF (0 CR bytes remaining).
  - `reducer.py`: Converted to LF (0 CR bytes remaining).
  - `scripts/run_mapreduce.sh`: Converted to LF (0 CR bytes remaining).
  - `scripts/upload_to_hdfs.sh`: Converted to LF (0 CR bytes remaining).
- **`.gitattributes` Added:**
  - Enforced `*.py text eol=lf` and `*.sh text eol=lf`.

### 3. Item 3 — Docker Engine Status
- **Executed `docker version`:**
  - Client: `29.8.0` (windows/amd64)
  - Server: `Docker Desktop 4.92.0 (240144)`, Engine `29.8.0`, API `1.56` (linux/amd64).
  - Daemon Status: **ACTIVE & HEALTHY**.

---

## 🚀 Phase 1: Cluster Startup & Health Verification

### 1. Commands Run
```powershell
docker compose build
docker compose up -d
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
docker exec namenode hdfs dfsadmin -report
docker exec namenode hdfs dfsadmin -safemode get
Invoke-WebRequest -Uri "http://localhost:9870"
Invoke-WebRequest -Uri "http://localhost:8088"
```

### 2. Key Output
- **Running Containers (5/5):**
  - `namenode` (Port 9870, 9000)
  - `datanode1` (Port 9864)
  - `datanode2` (Port 9864)
  - `resourcemanager` (Port 8088)
  - `nodemanager` (Port 8042)
- **HDFS DataNodes Status:**
  - `Live datanodes (2)`: `datanode1` (172.19.0.4) and `datanode2` (172.19.0.3)
  - Total Configured Capacity: `1.97 TB`
  - Total DFS Remaining: `1.86 TB`
- **Safe Mode:** `Safe mode is OFF`
- **Web UI Endpoints:**
  - NameNode Web UI (`http://localhost:9870`) returned HTTP `200`
  - YARN ResourceManager UI (`http://localhost:8088`) returned HTTP `200`
- **Python 3 in Containers:**
  - `namenode`: Python `3.5.3`
  - `nodemanager`: Python `3.5.3`

### 3. Checkpoint Assessment
- **Status:** **PASS** (All 5 containers running, 2 live DataNodes registered, safe mode OFF, Web UIs responding).

---

## 📈 Phase 2: Large Dataset Generation (2,000,000 Rows)

### 1. Commands Run & Edit
- **Code Edit in `generate_data.py` (Line 35):**
  - Changed from `NUM_EVENTS = 100000` to `NUM_EVENTS = 2000000`.
- **Command:**
  ```powershell
  python generate_data.py
  (Get-Item clickstream.csv).Length
  ```

### 2. Key Output
- **Console Log:**
  ```
  Generating 2,000,000 synthetic clickstream events...
  Successfully generated 2,000,000 rows and saved to 'clickstream.csv'.
  ```
- **Generated File Size:**
  - `170,622,694 bytes` (`162.72 MB`).

### 3. Checkpoint Assessment
- **Status:** **PASS** (File size `162.72 MB` exceeds the `~150 MB` checkpoint).

---

## 🐍 Python 3.5.3 Compatibility Verification

### 1. Fix Applied
- Converted f-strings to `.format()` in `mapper.py` (lines 57, 61, 66, 68) and `reducer.py` (lines 25, 37, 45).
- Backups created: `mapper.py.bak`, `reducer.py.bak`.

### 2. Four Verification Checks
1. **Line Endings Check:** `mapper.py` (0 CR), `reducer.py` (0 CR) -> **PASS**.
2. **Syntax Search Check:** Zero Python 3.6+ constructs (f-strings, walrus, variable annotations, numeric underscores) -> **PASS**.
3. **Compilation inside Container:** `python3 -m py_compile /tmp/mapper.py /tmp/reducer.py` completed with exit code 0 -> **PASS**.
4. **End-to-End 1,000-Row Pipe Test inside Container:**
   - Command: `python3 /tmp/mapper.py < /tmp/sample_1000.csv | sort | python3 /tmp/reducer.py`
   - Generated valid keys: `FUNNEL`, `HOURLY`, `PROD_VIEW`, `PROD_PURCHASE` in exact tab-separated format -> **PASS**.

---

## 📥 Phase 3: Ingestion to HDFS & Block Health Verification

### 1. Commands Run
```powershell
docker cp clickstream.csv namenode:/tmp/clickstream.csv
docker exec namenode hdfs dfs -mkdir -p /ecommerce/raw
docker exec namenode hdfs dfs -D dfs.blocksize=16777216 -D dfs.replication=2 -put -f /tmp/clickstream.csv /ecommerce/raw/clickstream.csv
docker exec namenode hdfs fsck /ecommerce/raw/clickstream.csv -files -blocks -locations
```

### 2. Key Output
- **Target File:** `/ecommerce/raw/clickstream.csv` (`170,622,694 bytes`).
- **Configured Block Size:** `16 MB` (`16,777,216 bytes`).
- **Configured Replication:** `2`.
- **FSCK Report:**
  - Total Blocks: `11` blocks (10 blocks @ 16MB + 1 block @ 2.85MB).
  - Replicas: Every block has `Live_repl=2` distributed across both `datanode1` (172.19.0.4) and `datanode2` (172.19.0.3).
  - Over/Under replicated blocks: `0`.
  - Missing blocks: `0`.
  - Health Status: **HEALTHY**.

### 3. Checkpoint Assessment
- **Status:** **PASS** (11 blocks, replication factor 2 verified on independent DataNodes, status HEALTHY).

---

## ⚡ Phase 4: MapReduce on YARN & Metric Aggregation

### 1. Commands Run
```powershell
docker exec namenode hadoop jar /opt/hadoop-3.2.1/share/hadoop/tools/lib/hadoop-streaming-3.2.1.jar \
  -D mapreduce.framework.name=yarn \
  -D yarn.resourcemanager.hostname=resourcemanager \
  -D yarn.app.mapreduce.am.env=HADOOP_MAPRED_HOME=/opt/hadoop-3.2.1 \
  -D mapreduce.map.env=HADOOP_MAPRED_HOME=/opt/hadoop-3.2.1 \
  -D mapreduce.reduce.env=HADOOP_MAPRED_HOME=/opt/hadoop-3.2.1 \
  -D mapreduce.application.classpath=/etc/hadoop:/opt/hadoop-3.2.1/share/hadoop/common/lib/*:/opt/hadoop-3.2.1/share/hadoop/common/*:/opt/hadoop-3.2.1/share/hadoop/hdfs:/opt/hadoop-3.2.1/share/hadoop/hdfs/lib/*:/opt/hadoop-3.2.1/share/hadoop/hdfs/*:/opt/hadoop-3.2.1/share/hadoop/mapreduce/lib/*:/opt/hadoop-3.2.1/share/hadoop/mapreduce/*:/opt/hadoop-3.2.1/share/hadoop/yarn:/opt/hadoop-3.2.1/share/hadoop/yarn/lib/*:/opt/hadoop-3.2.1/share/hadoop/yarn/* \
  -D stream.num.map.output.key.fields=2 \
  -files /tmp/mapper.py,/tmp/reducer.py \
  -mapper "python3 mapper.py" \
  -reducer "python3 reducer.py" \
  -input /ecommerce/raw/clickstream.csv \
  -output /ecommerce/out
```

### 2. Key Output
- **YARN Application Tracking:**
  - Application ID: `application_1791205390297_0003`
  - Name: `streamjob5353045954196523357.jar`
  - State: `FINISHED`
  - Final Status: `SUCCEEDED`
  - Progress: `100.0%`
- **Map & Reduce Task Counters:**
  - `Launched map tasks = 11` (100% matched input split count of 11 HDFS blocks)
  - `Launched reduce tasks = 1`
  - `Map input records = 2,000,001`
  - `Map output records = 4,940,282`
  - `Reduce output records = 128` (consolidated aggregation)
- **Output Inspection (`/ecommerce/out/part-00000`):**
  - Funnel metrics: `ADD_TO_CART: 359,210`, `PURCHASE: 138,387`, `SEARCH: 700,508`, `VIEW: 801,895`
  - Hourly metrics: 24 hourly buckets
  - Product metrics: 50 products (`P1001` - `P1050`) with view & purchase totals

### 3. Checkpoint Assessment
- **Status:** **PASS** (Job SUCCEEDED on YARN, map task count 11 equals block count 11, visible at ResourceManager UI).

---

## 📊 Phase 5: Bring Results Back & UI Parser Verification

### 1. Commands Run
```powershell
Copy-Item part-00000 part-00000.bak
docker exec namenode hdfs dfs -get -f /ecommerce/out/part-00000 /tmp/part-00000
docker cp namenode:/tmp/part-00000 ./part-00000
Get-Content part-00000 -TotalCount 10
Invoke-RestMethod -Uri "http://localhost:4000/api/metrics"
```

### 2. Key Output
- **Backup Created:** `part-00000.bak` verified on host.
- **First 10 Lines of Updated `part-00000`:**
  ```tsv
  FUNNEL	ADD_TO_CART	359210
  FUNNEL	PURCHASE	138387
  FUNNEL	SEARCH	700508
  FUNNEL	VIEW	801895
  HOURLY	00	85074
  HOURLY	01	84142
  HOURLY	02	84023
  HOURLY	03	84912
  HOURLY	04	83707
  HOURLY	05	82674
  ```
- **UI API Response (`http://localhost:4000/api/metrics`):**
  - `demo`: `false` (real MapReduce aggregation loaded)
  - `views`: `801,895`
  - `carts`: `359,210`
  - `purchases`: `138,387`
  - `conversion`: `17.26%`
  - `abandonment`: `61.47%`
  - `hourly`: 24 entries parsed successfully
  - `products`: 8 top-viewed products parsed successfully
- **Parser Compatibility:** All keys matched expected format; no parser adjustments were necessary.

### 3. Checkpoint Assessment
- **Status:** **PASS** (Results copied, old file backed up, parser format matches 100% with live metrics).

---

## 🛡️ Phase 6: Fault Tolerance & High Availability Verification

### 1. Objectives & Scenario
Demonstrate HDFS data redundancy and distributed compute resilience under worker failure:
1. Terminate `datanode2` container while keeping `namenode` and `datanode1` operational.
2. Verify HDFS block replication health via `hdfs fsck` (detect under-replicated blocks).
3. Read clickstream data through NameNode to verify 100% data accessibility despite lost node.
4. Execute full Python MapReduce Streaming job on YARN over 2,000,000 records with `datanode2` offline to verify compute resiliency.
5. Recover `datanode2` and verify automatic cluster recovery to `HEALTHY` with 0 under-replicated blocks.

### 2. Commands Executed
```powershell
# Step 1: Simulate node failure by stopping datanode2
docker stop datanode2
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Step 2: Check HDFS block health and replication under failure
docker exec namenode hdfs fsck /ecommerce/raw/clickstream.csv -files -blocks -locations

# Step 3: Verify read accessibility through NameNode
docker exec namenode hdfs dfs -cat /ecommerce/raw/clickstream.csv | Select-Object -First 10

# Step 4: Run MapReduce job on YARN under single DataNode condition
docker exec namenode hdfs dfs -rm -r -f /ecommerce/out_fault_tolerance
docker exec namenode hadoop jar /opt/hadoop-3.2.1/share/hadoop/tools/lib/hadoop-streaming-3.2.1.jar `
  -D mapreduce.framework.name=yarn `
  -D yarn.resourcemanager.hostname=resourcemanager `
  -D yarn.app.mapreduce.am.env=HADOOP_MAPRED_HOME=/opt/hadoop-3.2.1 `
  -D mapreduce.map.env=HADOOP_MAPRED_HOME=/opt/hadoop-3.2.1 `
  -D mapreduce.reduce.env=HADOOP_MAPRED_HOME=/opt/hadoop-3.2.1 `
  -D mapreduce.application.classpath=/etc/hadoop:/opt/hadoop-3.2.1/share/hadoop/common/lib/*:/opt/hadoop-3.2.1/share/hadoop/common/*:/opt/hadoop-3.2.1/share/hadoop/hdfs:/opt/hadoop-3.2.1/share/hadoop/hdfs/lib/*:/opt/hadoop-3.2.1/share/hadoop/hdfs/*:/opt/hadoop-3.2.1/share/hadoop/mapreduce/lib/*:/opt/hadoop-3.2.1/share/hadoop/mapreduce/*:/opt/hadoop-3.2.1/share/hadoop/yarn:/opt/hadoop-3.2.1/share/hadoop/yarn/lib/*:/opt/hadoop-3.2.1/share/hadoop/yarn/* `
  -D stream.num.map.output.key.fields=2 `
  -files /tmp/mapper.py,/tmp/reducer.py `
  -mapper "python3 mapper.py" `
  -reducer "python3 reducer.py" `
  -input /ecommerce/raw/clickstream.csv `
  -output /ecommerce/out_fault_tolerance

# Step 5: Restore datanode2 and verify recovery
docker start datanode2
Start-Sleep -Seconds 10
docker exec namenode hdfs fsck /ecommerce/raw/clickstream.csv
```

### 3. Key Outputs & Viva Evidence

#### Step 1: DataNode Failure
- `datanode2` stopped. Active containers: `namenode`, `datanode1`, `resourcemanager`, `nodemanager`.

#### Step 2: Under-Replication FSCK Evidence
- `Number of data-nodes: 1` (Only `datanode1` at `172.19.0.4` active).
- `Total blocks (validated): 11`
- `Under-replicated blocks: 11 (100.0 %)`
- Every block reported: `Target Replicas is 2 but found 1 live replica(s)`.
- `Missing blocks: 0` (Zero data loss).

#### Step 3: Data Read Accessibility
- Successfully streamed lines from `/ecommerce/raw/clickstream.csv` via `hdfs dfs -cat`:
  ```csv
  event_id,user_id,session_id,timestamp,action,product_id,category,price,device,location
  E112076,U109,S7337,2026-10-05T00:00:06Z,VIEW,P1032,Electronics,1199.63,Tablet,Hyderabad
  E117596,U3434,S4102,2026-10-05T00:00:12Z,SEARCH,P1048,Home,324.95,Desktop,Delhi
  ```

#### Step 4: MapReduce Execution under Failure
- YARN Job ID: `job_1791205390297_0004`
- Map / Reduce Progress: `map 100% reduce 100%`
- Counters:
  - `Launched map tasks = 11`
  - `Launched reduce tasks = 1`
  - `Map input records = 2,000,001`
  - `Map output records = 4,940,282`
  - `Reduce output records = 128`
  - Status: **SUCCEEDED** without errors.

#### Step 5: Post-Recovery FSCK Report
- `datanode2` restarted and successfully rejoined cluster.
- `Number of data-nodes: 2`
- `Under-replicated blocks: 0 (0.0 %)`
- `Missing replicas: 0 (0.0 %)`
- Health Status: **HEALTHY**

### 4. Cloud Computing Concept Proved
- **High Availability & Fault Tolerance:** With a replication factor of 2, HDFS ensures that an arbitrary single DataNode failure causes zero downtime and zero data loss.
- **Compute Resilience:** YARN schedules map tasks against remaining replica blocks on `datanode1`, allowing complete job execution without failure.
- **Self-Healing Cluster:** When the failed node comes back online, the NameNode detects block reports and restores the desired replication factor automatically.

### 5. Checkpoint Assessment
- **Status:** **PASS** (Node failure simulated, under-replication detected, read verified, MapReduce succeeded on single node, recovery verified as HEALTHY).

---

## 📈 Phase 7: Scalability & Performance Benchmarking

### 1. Script & Setup
- **Automation Script:** `benchmark.ps1`
- **Measured Pipeline:** For each dataset scale (100K, 1M, 2M):
  1. Generate synthetic clickstream dataset via `generate_data.py`.
  2. Record exact byte length.
  3. Ingest into HDFS (`dfs.blocksize=16MB`, `dfs.replication=2`).
  4. Query block count via `hdfs fsck`.
  5. Execute Python MapReduce Streaming on YARN and measure execution time using `Measure-Command`.
  6. Export records to `benchmark_results.csv`.

### 2. Execution Results & Metrics
Raw output from `benchmark_results.csv`:
```csv
rows,file_size_bytes,block_count,elapsed_seconds
100000,8435649,1,24.41
1000000,84705056,6,33.51
2000000,170246526,11,59.15
```

### 3. Scalability Analysis Table

| Dataset Scale | Row Count | File Size (MB) | HDFS Blocks (16MB) | Map Tasks | Reduce Tasks | Execution Time (s) | Throughput (Rows/s) |
|---|---|---|---|---|---|---|---|
| **Small** | 100,000 | 8.04 MB | 1 | 1 | 1 | **24.41 s** | 4,096 rows/s |
| **Medium** | 1,000,000 | 80.78 MB | 6 | 6 | 1 | **33.51 s** | 29,841 rows/s |
| **Large** | 2,000,000 | 162.36 MB | 11 | 11 | 1 | **59.15 s** | 33,812 rows/s |

### 4. Analysis of the Scaling Trend
1. **Sub-linear Scaling & Fixed Cluster Overhead:**
   - Increasing the dataset from 100K to 1M rows represents a **10x increase in data volume** (8.04 MB to 80.78 MB), yet execution time only increased by **1.37x** (from 24.41s to 33.51s).
   - This proves the classic distributed computing characteristic: Hadoop and YARN incur a fixed baseline overhead (JVM initialization, ApplicationMaster negotiation, container allocation, JAR localization, and reducer setup) of approximately 18–20 seconds regardless of data size.
2. **Parallel Map Task Efficiency:**
   - As data size increases, HDFS automatically splits the input into multiple 16MB blocks (1 split -> 6 splits -> 11 splits). YARN schedules parallel map tasks against these splits.
   - Processing throughput increases by over **8.2x** (from 4,096 rows/sec at 100K to 33,812 rows/sec at 2M), demonstrating high data-parallel efficiency.
3. **Linearity at Scale:**
   - From 1M rows (6 blocks, 33.51s) to 2M rows (11 blocks, 59.15s), the data volume doubles (2x) and execution time scales near-linearly (1.76x), reflecting container slot saturation and shuffle/spill costs for 4.9M intermediate key-value records.

### 5. Checkpoint Assessment
- **Status:** **PASS** (`benchmark.ps1` executed cleanly, all three dataset scales completed on YARN, results exported to `benchmark_results.csv`, scaling trend documented).

---

## 💻 Phase 8: UI Dashboard & Real-Time Endpoints Verification

### 1. Commands Executed
```powershell
# Verify running servers
Get-NetTCPConnection -LocalPort 4000, 5173 -State Listen

# Query /api/metrics
curl.exe -s http://localhost:4000/api/metrics

# Query /api/cluster
curl.exe -s http://localhost:4000/api/cluster
```

### 2. Endpoints Output & Verification

#### `/api/metrics` JSON:
```json
{
  "demo": false,
  "views": 802574,
  "carts": 360035,
  "purchases": 138275,
  "conversion": 17.228940882709882,
  "abandonment": 61.59401169330759,
  "hourly": [
    {"hour": 0, "events": 83814},
    {"hour": 1, "events": 83575},
    {"hour": 2, "events": 83586},
    {"hour": 3, "events": 82671},
    {"hour": 4, "events": 83069},
    {"hour": 5, "events": 81777},
    {"hour": 6, "events": 82291},
    {"hour": 7, "events": 82705},
    {"hour": 8, "events": 83799},
    {"hour": 9, "events": 83926},
    {"hour": 10, "events": 84803},
    {"hour": 11, "events": 83918},
    {"hour": 12, "events": 82482},
    {"hour": 13, "events": 83441},
    {"hour": 14, "events": 83159},
    {"hour": 15, "events": 83977},
    {"hour": 16, "events": 83738},
    {"hour": 17, "events": 84083},
    {"hour": 18, "events": 83885},
    {"hour": 19, "events": 83734},
    {"hour": 20, "events": 83341},
    {"hour": 21, "events": 82744},
    {"hour": 22, "events": 82605},
    {"hour": 23, "events": 82877}
  ],
  "products": [
    {"id": "P1038", "views": 16422, "purchases": 2768},
    {"id": "P1007", "views": 16307, "purchases": 2753},
    {"id": "P1024", "views": 16280, "purchases": 2818},
    {"id": "P1010", "views": 16245, "purchases": 2785},
    {"id": "P1013", "views": 16224, "purchases": 2703},
    {"id": "P1041", "views": 16204, "purchases": 2890},
    {"id": "P1035", "views": 16195, "purchases": 2742},
    {"id": "P1046", "views": 16173, "purchases": 2777}
  ]
}
```

#### `/api/cluster` JSON:
```json
{
  "live": true,
  "replication": 2,
  "liveNodes": 2,
  "deadNodes": 0,
  "underReplicated": 32
}
```

### 3. Checkpoint Assessment
- **`demo: false`:** Confirmed (production MapReduce dataset loaded into UI).
- **Metric Parity with `part-00000`:**
  - Views: 802,574 (Exact match with `FUNNEL VIEW 802574`)
  - Carts: 360,035 (Exact match with `FUNNEL ADD_TO_CART 360035`)
  - Purchases: 138,275 (Exact match with `FUNNEL PURCHASE 138275`)
- **Status:** **PASS** (Node API on port 4000 and React dev server on port 5173 operational, serving real cluster data).
