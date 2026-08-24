#!/bin/bash
# ============================================================
#  upload_to_hdfs.sh
#  Uploads generated clickstream CSV to HDFS
# ============================================================

HDFS_CMD="hdfs dfs"
RAW_LOG="data/raw/clickstream_logs.csv"
HDFS_DIR="/user/hadoop/clickstream/raw"
HDFS_OUT="/user/hadoop/clickstream/output"

echo "============================================"
echo "  Uploading Clickstream Data to HDFS"
echo "============================================"

# Check if log file exists
if [ ! -f "$RAW_LOG" ]; then
    echo "[!] Log file not found: $RAW_LOG"
    echo "    Run: python src/data_generator/clickstream_generator.py"
    exit 1
fi

# Create HDFS directories
echo "[→] Creating HDFS directories..."
$HDFS_CMD -mkdir -p "$HDFS_DIR"
$HDFS_CMD -mkdir -p "$HDFS_OUT"

# Remove old file if exists
$HDFS_CMD -rm -f "$HDFS_DIR/clickstream_logs.csv" 2>/dev/null

# Upload
echo "[→] Uploading $RAW_LOG → $HDFS_DIR ..."
$HDFS_CMD -put "$RAW_LOG" "$HDFS_DIR/"

# Verify
echo "[→] Verifying upload..."
$HDFS_CMD -ls "$HDFS_DIR"

echo ""
echo "[✓] Upload complete."
echo "    HDFS path: $HDFS_DIR/clickstream_logs.csv"
echo "============================================"
