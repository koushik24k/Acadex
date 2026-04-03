$ErrorActionPreference = 'Stop'

$base = 'http://localhost:8081'

function Get-Token([string]$email, [string]$password) {
  $res = Invoke-RestMethod -Method Post -Uri "$base/api/auth/login" -ContentType 'application/json' -Body (@{ email = $email; password = $password } | ConvertTo-Json -Compress)
  return $res.token
}

$token = Get-Token 'admin@acadex.com' 'admin123'
$headers = @{ Authorization = "Bearer $token" }

$subjects = Invoke-RestMethod -Method Get -Uri "$base/api/subjects" -Headers $headers
$existingTopics = Invoke-RestMethod -Method Get -Uri "$base/api/topics" -Headers $headers

$topicCatalog = @{
  'CS101' = @(
    @{ unitNo = 1; topicName = 'Arrays and Linked Lists' },
    @{ unitNo = 1; topicName = 'Stacks and Queues' },
    @{ unitNo = 2; topicName = 'Binary Trees' },
    @{ unitNo = 2; topicName = 'Binary Search Trees' },
    @{ unitNo = 3; topicName = 'Graphs and Traversals' },
    @{ unitNo = 4; topicName = 'Hash Tables' },
    @{ unitNo = 5; topicName = 'Algorithm Complexity' }
  )
  'CS102' = @(
    @{ unitNo = 1; topicName = 'Greedy Algorithms' },
    @{ unitNo = 2; topicName = 'Dynamic Programming' },
    @{ unitNo = 3; topicName = 'Divide and Conquer' },
    @{ unitNo = 4; topicName = 'Backtracking and NP Concepts' },
    @{ unitNo = 5; topicName = 'Amortized Analysis' }
  )
  'CS201' = @(
    @{ unitNo = 1; topicName = 'Process Management' },
    @{ unitNo = 1; topicName = 'CPU Scheduling' },
    @{ unitNo = 2; topicName = 'Memory Management' },
    @{ unitNo = 2; topicName = 'Virtual Memory' },
    @{ unitNo = 3; topicName = 'File Systems' },
    @{ unitNo = 3; topicName = 'Deadlocks' },
    @{ unitNo = 4; topicName = 'System Calls and Shells' }
  )
  'CS301' = @(
    @{ unitNo = 1; topicName = 'OSI Model' },
    @{ unitNo = 2; topicName = 'TCP/IP Suite' },
    @{ unitNo = 3; topicName = 'Routing Protocols' },
    @{ unitNo = 4; topicName = 'Network Security Basics' },
    @{ unitNo = 5; topicName = 'Wireless and Mobile Networks' }
  )
  'CS302' = @(
    @{ unitNo = 1; topicName = 'ER Modeling' },
    @{ unitNo = 1; topicName = 'Relational Algebra' },
    @{ unitNo = 2; topicName = 'SQL Queries' },
    @{ unitNo = 2; topicName = 'Normalization' },
    @{ unitNo = 3; topicName = 'Transactions and Concurrency' },
    @{ unitNo = 3; topicName = 'Indexing and Hashing' },
    @{ unitNo = 4; topicName = 'Query Optimization' }
  )
  'CS334' = @(
    @{ unitNo = 1; topicName = 'HTML and CSS Foundations' },
    @{ unitNo = 2; topicName = 'JavaScript Basics' },
    @{ unitNo = 3; topicName = 'React Components' },
    @{ unitNo = 4; topicName = 'REST API Integration' },
    @{ unitNo = 5; topicName = 'Deployment and Hosting' }
  )
  'CS092' = @(
    @{ unitNo = 1; topicName = 'Recursion' },
    @{ unitNo = 2; topicName = 'Sorting Algorithms' },
    @{ unitNo = 3; topicName = 'Trees and Graphs' },
    @{ unitNo = 4; topicName = 'Advanced Problem Solving' },
    @{ unitNo = 5; topicName = 'Greedy Techniques' }
  )
}

$created = 0
$skipped = 0

foreach ($s in $subjects) {
  $code = if ($null -ne $s.subjectCode) { $s.subjectCode.ToString().Trim().ToUpper() } else { '' }
  if (-not $topicCatalog.ContainsKey($code)) {
    continue
  }

  $currentForSubject = @($existingTopics | Where-Object { $_.subjectId -eq $s.id })

  foreach ($t in $topicCatalog[$code]) {
    $exists = $currentForSubject | Where-Object { $_.topicName -eq $t.topicName -and [int]$_.unitNo -eq [int]$t.unitNo } | Select-Object -First 1
    if ($exists) {
      $skipped++
      continue
    }

    Invoke-RestMethod -Method Post -Uri "$base/api/topics" -Headers $headers -ContentType 'application/json' -Body (@{
      subjectId = [int64]$s.id
      unitNo = [int]$t.unitNo
      topicName = $t.topicName
    } | ConvertTo-Json -Compress) | Out-Null

    $created++
  }
}

$allTopics = Invoke-RestMethod -Method Get -Uri "$base/api/topics" -Headers $headers

Write-Output ("TOPIC_SEED_DONE created={0} skipped={1} total={2}" -f $created, $skipped, $allTopics.Count)

foreach ($s in $subjects) {
  $count = @($allTopics | Where-Object { $_.subjectId -eq $s.id }).Count
  if ($count -gt 0) {
    Write-Output ("{0} ({1}) -> {2} topics" -f $s.subjectName, $s.subjectCode, $count)
  }
}
