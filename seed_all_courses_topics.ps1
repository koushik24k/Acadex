$ErrorActionPreference = 'Stop'

$base = 'http://localhost:8081'

function Get-Token([string]$email, [string]$password) {
  $res = Invoke-RestMethod -Method Post -Uri "$base/api/auth/login" -ContentType 'application/json' -Body (@{ email = $email; password = $password } | ConvertTo-Json -Compress)
  return $res.token
}

function Ensure-SubjectTopics($headers) {
  $subjects = Invoke-RestMethod -Method Get -Uri "$base/api/subjects" -Headers $headers
  $topics = Invoke-RestMethod -Method Get -Uri "$base/api/topics" -Headers $headers

  $defaultSubjectTopics = @(
    @{ unitNo = 1; topicName = 'Introduction and Overview' },
    @{ unitNo = 1; topicName = 'Core Concepts' },
    @{ unitNo = 2; topicName = 'Problem Solving Techniques' },
    @{ unitNo = 2; topicName = 'Applied Examples' },
    @{ unitNo = 3; topicName = 'Advanced Discussion' },
    @{ unitNo = 3; topicName = 'Revision and Practice' }
  )

  $created = 0
  foreach ($s in $subjects) {
    $current = @($topics | Where-Object { $_.subjectId -eq $s.id })
    if ($current.Count -gt 0) { continue }

    foreach ($t in $defaultSubjectTopics) {
      Invoke-RestMethod -Method Post -Uri "$base/api/topics" -Headers $headers -ContentType 'application/json' -Body (@{
        subjectId = [int64]$s.id
        unitNo = [int]$t.unitNo
        topicName = $t.topicName
      } | ConvertTo-Json -Compress) | Out-Null
      $created++
    }
  }

  return $created
}

function Ensure-CourseTopics($headers) {
  $courses = Invoke-RestMethod -Method Get -Uri "$base/api/courses" -Headers $headers

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

  $createdUnits = 0
  $createdTopics = 0

  foreach ($c in $courses) {
    $existingTopics = @(Invoke-RestMethod -Method Get -Uri "$base/api/courses/$($c.id)/topics" -Headers $headers)
    if ($existingTopics.Count -gt 0) { continue }

    $existingUnits = @(Invoke-RestMethod -Method Get -Uri "$base/api/courses/$($c.id)/units" -Headers $headers)

    if ($courseTemplate.ContainsKey($c.courseCode)) {
      $plan = $courseTemplate[$c.courseCode]
    } else {
      $plan = @(
        @{ unitNo = 1; unitTitle = 'Unit 1'; topics = @('Topic 1.1', 'Topic 1.2') },
        @{ unitNo = 2; unitTitle = 'Unit 2'; topics = @('Topic 2.1', 'Topic 2.2') },
        @{ unitNo = 3; unitTitle = 'Unit 3'; topics = @('Topic 3.1', 'Topic 3.2') }
      )
    }

    foreach ($u in $plan) {
      $unit = $existingUnits | Where-Object { [int]$_.unitNumber -eq [int]$u.unitNo } | Select-Object -First 1
      if (-not $unit) {
        $unit = Invoke-RestMethod -Method Post -Uri "$base/api/courses/$($c.id)/units" -Headers $headers -ContentType 'application/json' -Body (@{
          unitNumber = [int]$u.unitNo
          unitTitle = $u.unitTitle
          expectedHours = 12
        } | ConvertTo-Json -Compress)
        $createdUnits++
      }

      foreach ($topicName in $u.topics) {
        Invoke-RestMethod -Method Post -Uri "$base/api/courses/$($c.id)/topics" -Headers $headers -ContentType 'application/json' -Body (@{
          unitId = [int64]$unit.id
          topicName = $topicName
          description = 'Auto-seeded for attendance readiness'
        } | ConvertTo-Json -Compress) | Out-Null
        $createdTopics++
      }
    }
  }

  return @{ units = $createdUnits; topics = $createdTopics }
}

$token = Get-Token 'admin@acadex.com' 'admin123'
$headers = @{ Authorization = "Bearer $token" }

$createdSubjectTopics = Ensure-SubjectTopics $headers
$courseResult = Ensure-CourseTopics $headers

Write-Output ("DONE subjectTopicsCreated={0} courseUnitsCreated={1} courseTopicsCreated={2}" -f $createdSubjectTopics, $courseResult.units, $courseResult.topics)

$courses = Invoke-RestMethod -Method Get -Uri "$base/api/courses" -Headers $headers
Write-Output '--- Final Course Topic Coverage ---'
foreach ($c in $courses) {
  $ct = @(Invoke-RestMethod -Method Get -Uri "$base/api/courses/$($c.id)/topics" -Headers $headers)
  Write-Output ("{0} ({1}) -> {2} topics" -f $c.courseName, $c.courseCode, $ct.Count)
}

$subjects = Invoke-RestMethod -Method Get -Uri "$base/api/subjects" -Headers $headers
$topics = Invoke-RestMethod -Method Get -Uri "$base/api/topics" -Headers $headers
Write-Output '--- Final Subject Topic Coverage ---'
foreach ($s in $subjects) {
  $count = @($topics | Where-Object { $_.subjectId -eq $s.id }).Count
  Write-Output ("{0} ({1}) -> {2} topics" -f $s.subjectName, $s.subjectCode, $count)
}
