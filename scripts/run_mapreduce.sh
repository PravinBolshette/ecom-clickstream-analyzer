#!/bin/bash
# ============================================================
#  run_mapreduce.sh
#  Runs all three Hadoop Streaming MapReduce jobs
# ============================================================

HADOOP_STREAMING_JAR=$(find $HADOOP_HOME -name "hadoop-streaming-*.jar" 2>/dev/null | head -1)
HDFS_INPUT="/user/hadoop/clickstream/raw/clickstream_logs.csv"
HDFS_OUTPUT_BASE="/user/hadoop/clickstream/output"

MAPPER_DIR="src/mapreduce"
LOCAL_OUTPUT="data/output"
mkdir -p "$LOCAL_OUTPUT"

echo "============================================"
echo "  Running MapReduce Jobs on HDFS"
echo "============================================"
echo "  Streaming JAR : $HADOOP_STREAMING_JAR"
echo "  Input         : $HDFS_INPUT"
echo ""

# ── JOB 1: Action Count ───────────────────────────────────────────────────
echo "[JOB 1] Action Count (How many times each action occurred)"
JOB1_OUTPUT="$HDFS_OUTPUT_BASE/action_count"
hdfs dfs -rm -r -f "$JOB1_OUTPUT"

hadoop jar "$HADOOP_STREAMING_JAR" \
    -files "$MAPPER_DIR/mapper_action_count.py,$MAPPER_DIR/reducer_action_count.py" \
    -mapper  "python3 mapper_action_count.py" \
    -reducer "python3 reducer_action_count.py" \
    -input   "$HDFS_INPUT" \
    -output  "$JOB1_OUTPUT"

echo "[→] Saving Job 1 results..."
hdfs dfs -getmerge "$JOB1_OUTPUT" "$LOCAL_OUTPUT/action_count.tsv"
echo "[✓] Job 1 complete → $LOCAL_OUTPUT/action_count.tsv"

# ── JOB 2: Product Views ──────────────────────────────────────────────────
echo ""
echo "[JOB 2] Product View Count (Most viewed products)"
JOB2_OUTPUT="$HDFS_OUTPUT_BASE/product_views"
hdfs dfs -rm -r -f "$JOB2_OUTPUT"

hadoop jar "$HADOOP_STREAMING_JAR" \
    -files "$MAPPER_DIR/mapper_product_views.py,$MAPPER_DIR/reducer_product_views.py" \
    -mapper  "python3 mapper_product_views.py" \
    -reducer "python3 reducer_product_views.py" \
    -input   "$HDFS_INPUT" \
    -output  "$JOB2_OUTPUT"

echo "[→] Saving Job 2 results..."
hdfs dfs -getmerge "$JOB2_OUTPUT" "$LOCAL_OUTPUT/product_views.tsv"
echo "[✓] Job 2 complete → $LOCAL_OUTPUT/product_views.tsv"

# ── JOB 3: Session Duration ───────────────────────────────────────────────
echo ""
echo "[JOB 3] Session Duration (Average browsing time)"
JOB3_OUTPUT="$HDFS_OUTPUT_BASE/session_duration"
hdfs dfs -rm -r -f "$JOB3_OUTPUT"

hadoop jar "$HADOOP_STREAMING_JAR" \
    -files "$MAPPER_DIR/mapper_session_duration.py,$MAPPER_DIR/reducer_session_duration.py" \
    -mapper  "python3 mapper_session_duration.py" \
    -reducer "python3 reducer_session_duration.py" \
    -input   "$HDFS_INPUT" \
    -output  "$JOB3_OUTPUT"

echo "[→] Saving Job 3 results..."
hdfs dfs -getmerge "$JOB3_OUTPUT" "$LOCAL_OUTPUT/session_duration.tsv"
echo "[✓] Job 3 complete → $LOCAL_OUTPUT/session_duration.tsv"

echo ""
echo "============================================"
echo "  All MapReduce Jobs Completed!"
echo "  Results saved to: $LOCAL_OUTPUT/"
echo "============================================"

# ── Quick preview ─────────────────────────────────────────────────────────
echo ""
echo "[→] Action Count Results:"
cat "$LOCAL_OUTPUT/action_count.tsv"
echo ""
echo "[→] Top 10 Most Viewed Products:"
sort -t$'\t' -k3 -rn "$LOCAL_OUTPUT/product_views.tsv" | head -10
