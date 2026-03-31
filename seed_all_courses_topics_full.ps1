$ErrorActionPreference = 'Stop'

$base = 'http://localhost:8081'

function Get-Token([string]$email, [string]$password) {
  $res = Invoke-RestMethod -Method Post -Uri "$base/api/auth/login" -ContentType 'application/json' -Body (@{ email = $email; password = $password } | ConvertTo-Json -Compress)
  return $res.token
}

$courseTemplate = @{
  'CS202' = @(
    @{ unitNo = 1; unitTitle = 'Database Fundamentals'; topics = @('ER Model and Schema Design', 'Relational Model and Keys') },
    @{ unitNo = 2; unitTitle = 'SQL and Normalization'; topics = @('SQL Queries and Joins', 'Normalization 1NF to BCNF') },
    @{ unitNo = 3; unitTitle = 'Transactions and Indexing'; topics = @('ACID and Concurrency Control', 'Indexing and Query Optimization') }
  )
  'CS201' = @(
    @{ unitNo = 1; unitTitle = 'Process Management'; topics = @('Process States and Scheduling', 'Synchronization and Deadlocks') },
    @{ unitNo = 2; unitTitle = 'Memory Management'; topics = @('Paging and Segmentation', 'Virtual Memory') },
    @{ unitNo = 3; unitTitle = 'Storage Systems'; topics = @('File Systems', 'I/O Management') }
  )
  'CS101' = @(
    @{ unitNo = 1; unitTitle = 'Data Structure Basics'; topics = @('Arrays and Strings', 'Linked Lists') },
    @{ unitNo = 2; unitTitle = 'Stacks, Queues, Trees'; topics = @('Stacks and Queues', 'Binary Trees and Traversals') },
    @{ unitNo = 3; unitTitle = 'Hashing and Graphs'; topics = @('Hash Tables', 'Graph Representation and BFS DFS') }
  )
  'CS102' = @(
    @{ unitNo = 1; unitTitle = 'Algorithm Analysis'; topics = @('Asymptotic Complexity', 'Recurrence Relations') },
    @{ unitNo = 2; unitTitle = 'Design Techniques'; topics = @('Greedy and Divide-and-Conquer', 'Dynamic Programming') },
    @{ unitNo = 3; unitTitle = 'Graph and String Algorithms'; topics = @('Shortest Paths and MST', 'Pattern Matching Algorithms') }
  )
  'CS301' = @(
    @{ unitNo = 1; unitTitle = 'Network Fundamentals'; topics = @('OSI and TCP IP Models', 'Transmission Media and Devices') },
    @{ unitNo = 2; unitTitle = 'Routing and Transport'; topics = @('IP Addressing and Routing', 'TCP and UDP Protocols') },
    @{ unitNo = 3; unitTitle = 'Application and Security'; topics = @('HTTP DNS and Email Protocols', 'Network Security Basics') }
  )
  'CS334' = @(
    @{ unitNo = 1; unitTitle = 'Programming Foundations'; topics = @('Language Basics and OOP', 'Exception Handling and Collections') },
    @{ unitNo = 2; unitTitle = 'Full Stack Concepts'; topics = @('REST API Design', 'Frontend Backend Integration') },
    @{ unitNo = 3; unitTitle = 'Deployment and Testing'; topics = @('Automated Testing Basics', 'Build and Deployment Pipeline') }
  )
  'cs092' = @(
    @{ unitNo = 1; unitTitle = 'Data Structures Foundation'; topics = @('Arrays and Linked Lists', 'Stacks and Queues') },
    @{ unitNo = 2; unitTitle = 'Trees and Graphs'; topics = @('Tree Traversals', 'Graph Traversals') },
    @{ unitNo = 3; unitTitle = 'Searching and Sorting'; topics = @('Searching Techniques', 'Sorting Techniques') }
  )
}

$defaultPlan = @(
  @{ unitNo = 1; unitTitle = 'Unit 1'; topics = @('Topic 1.1', 'Topic 1.2') },
  @{ unitNo = 2; unitTitle = 'Unit 2'; topics = @('Topic 2.1', 'Topic 2.2') },
  @{ unitNo = 3; unitTitle = 'Unit 3'; topics = @('Topic 3.1', 'Topic 3.2') }
)

$token = Get-Token 'admin@acadex.com' 'admin123'
$headers = @{ Authorization = "Bearer $token" }
$courses = Invoke-RestMethod -Method Get -Uri "$base/api/courses" -Headers $headers

$unitsCreated = 0
$unitsUpdated = 0
$topicsCreated = 0

foreach ($c in $courses) {
  $plan = if ($courseTemplate.ContainsKey($c.courseCode)) { $courseTemplate[$c.courseCode] } else { $defaultPlan }

  $units = @(Invoke-RestMethod -Method Get -Uri "$base/api/courses/$($c.id)/units" -Headers $headers)
  $topics = @(Invoke-RestMethod -Method Get -Uri "$base/api/courses/$($c.id)/topics" -Headers $headers)

  foreach ($u in $plan) {
    $unit = $units | Where-Object { [int]$_.unitNumber -eq [int]$u.unitNo } | Select-Object -First 1

    if (-not $unit) {
      $unit = Invoke-RestMethod -Method Post -Uri "$base/api/courses/$($c.id)/units" -Headers $headers -ContentType 'application/json' -Body (@{
        unitNumber = [int]$u.unitNo
        unitTitle = $u.unitTitle
        expectedHours = 12
      } | ConvertTo-Json -Compress)
      $unitsCreated++
      $units += $unit
    } elseif (-not $unit.unitTitle -or $unit.unitTitle.Trim() -eq '') {
      Invoke-RestMethod -Method Put -Uri "$base/api/courses/$($c.id)/units/$($unit.id)" -Headers $headers -ContentType 'application/json' -Body (@{
        unitNumber = [int]$u.unitNo
        unitTitle = $u.unitTitle
        expectedHours = 12
      } | ConvertTo-Json -Compress) | Out-Null
      $unitsUpdated++
    }

    foreach ($topicName in $u.topics) {
      $exists = $topics | Where-Object { $_.topicName -eq $topicName } | Select-Object -First 1
      if ($exists) { continue }

      Invoke-RestMethod -Method Post -Uri "$base/api/courses/$($c.id)/topics" -Headers $headers -ContentType 'application/json' -Body (@{
        unitId = [int64]$unit.id
        topicName = $topicName
        description = 'Auto-seeded for attendance readiness'
      } | ConvertTo-Json -Compress) | Out-Null
      $topicsCreated++
      $topics += @{ topicName = $topicName }
    }
  }
}

Write-Output ("COURSE_TOPUP_DONE unitsCreated={0} unitsUpdated={1} topicsCreated={2}" -f $unitsCreated, $unitsUpdated, $topicsCreated)
Write-Output '--- Final Course Topic Coverage ---'
$courses = Invoke-RestMethod -Method Get -Uri "$base/api/courses" -Headers $headers
foreach ($c in $courses) {
  $t = @(Invoke-RestMethod -Method Get -Uri "$base/api/courses/$($c.id)/topics" -Headers $headers)
  Write-Output ("{0} ({1}) -> {2} topics" -f $c.courseName, $c.courseCode, $t.Count)
}
