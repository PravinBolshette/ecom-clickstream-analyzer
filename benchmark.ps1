# benchmark.ps1
# E-Commerce Clickstream MapReduce Scalability Benchmark
# Tests MapReduce processing performance over 100K, 1M, and 2M rows.

$ErrorActionPreference = "Stop"

$csvFile = "benchmark_results.csv"
"rows,file_size_bytes,block_count,elapsed_seconds" | Set-Content -Path $csvFile -Encoding utf8

$testSizes = @(100000, 1000000, 2000000)

Write-Host "=================================================="
Write-Host "Starting Scalability Benchmark (100K, 1M, 2M)"
Write-Host "=================================================="

foreach ($rows in $testSizes) {
    Write-Host "`n--------------------------------------------------"
    Write-Host "Processing Dataset Size: $rows rows"
    Write-Host "--------------------------------------------------"

    # Step 1: Regenerate data
    Write-Host ">> [1/4] Generating $rows clickstream events..."
    (Get-Content generate_data.py) -replace 'NUM_EVENTS = \d+', "NUM_EVENTS = $rows" | Set-Content generate_data.py -Encoding utf8
    python -c "import generate_data; generate_data.generate_clickstream_dataset($rows, 'clickstream.csv')"
    
    $fileItem = Get-Item "clickstream.csv"
    $fileSizeBytes = $fileItem.Length
    $fileSizeMB = [math]::Round($fileSizeBytes / 1MB, 2)
    Write-Host "   Generated file size: $fileSizeBytes bytes ($fileSizeMB MB)"

    # Step 2: Ingest into HDFS
    Write-Host ">> [2/4] Ingesting clickstream.csv into HDFS..."
    docker cp clickstream.csv namenode:/tmp/clickstream.csv
    docker exec namenode hdfs dfs -mkdir -p /ecommerce/raw
    docker exec namenode hdfs dfs -D dfs.blocksize=16777216 -D dfs.replication=2 -put -f /tmp/clickstream.csv /ecommerce/raw/clickstream.csv

    # Step 3: Get block count from HDFS FSCK
    $fsckLines = docker exec namenode hdfs fsck /ecommerce/raw/clickstream.csv
    $fsckText = $fsckLines -join "`n"
    $blockCount = 1
    if ($fsckText -match 'Total blocks \(validated\):\s+(\d+)') {
        $blockCount = [int]$Matches[1]
    }
    Write-Host "   HDFS Block Count: $blockCount blocks (16MB block size, replication factor 2)"

    # Step 4: Run MapReduce job and measure execution time
    Write-Host ">> [3/4] Running MapReduce Streaming on YARN..."
    docker exec namenode hdfs dfs -rm -r -f /ecommerce/out

    $mrElapsed = Measure-Command {
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
            -output /ecommerce/out
    }

    $elapsedSec = [math]::Round($mrElapsed.TotalSeconds, 2)
    Write-Host ">> [4/4] Job Completed in $elapsedSec seconds"

    # Append to CSV
    "$rows,$fileSizeBytes,$blockCount,$elapsedSec" | Out-File -FilePath $csvFile -Append -Encoding utf8
}

# Ensure final 2M output is copied to local host for UI
docker exec namenode hdfs dfs -get -f /ecommerce/out/part-00000 /tmp/part-00000
docker cp namenode:/tmp/part-00000 ./part-00000

Write-Host "`n=================================================="
Write-Host "Benchmark Complete! Results in $csvFile"
Write-Host "=================================================="
Get-Content $csvFile
