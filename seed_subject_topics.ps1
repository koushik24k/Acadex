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
  'MATH101' = @(
    @{ unitNo = 1; topicName = 'Functions and Graphs' },
    @{ unitNo = 1; topicName = 'Matrices and Determinants' },
    @{ unitNo = 2; topicName = 'Differential Calculus Basics' },
    @{ unitNo = 2; topicName = 'Applications of Derivatives' },
    @{ unitNo = 3; topicName = 'Integral Calculus Fundamentals' },
    @{ unitNo = 3; topicName = 'Definite Integral Applications' }
  )
  'PHY101' = @(
    @{ unitNo = 1; topicName = 'Kinematics and Motion' },
    @{ unitNo = 1; topicName = 'Newtonian Mechanics' },
    @{ unitNo = 2; topicName = 'Work, Energy and Power' },
    @{ unitNo = 2; topicName = 'Waves and Oscillations' },
    @{ unitNo = 3; topicName = 'Electrostatics Basics' },
    @{ unitNo = 3; topicName = 'Current Electricity' }
  )
  'MATH201' = @(
    @{ unitNo = 1; topicName = 'Advanced Algebraic Methods' },
    @{ unitNo = 1; topicName = 'Vector Spaces and Linear Maps' },
    @{ unitNo = 2; topicName = 'Series and Convergence' },
    @{ unitNo = 2; topicName = 'Partial Differential Equations' },
    @{ unitNo = 3; topicName = 'Numerical Methods' },
    @{ unitNo = 3; topicName = 'Optimization Techniques' }
  )
  'PHY201' = @(
    @{ unitNo = 1; topicName = 'Modern Physics Introduction' },
    @{ unitNo = 1; topicName = 'Quantum Concepts' },
    @{ unitNo = 2; topicName = 'Semiconductor Physics' },
    @{ unitNo = 2; topicName = 'Optical Fiber Basics' },
    @{ unitNo = 3; topicName = 'Electromagnetic Waves' },
    @{ unitNo = 3; topicName = 'Laser Principles and Applications' }
  )
  'CHEM201' = @(
    @{ unitNo = 1; topicName = 'Atomic Structure and Bonding' },
    @{ unitNo = 1; topicName = 'Chemical Thermodynamics' },
    @{ unitNo = 2; topicName = 'Electrochemistry' },
    @{ unitNo = 2; topicName = 'Corrosion and Prevention' },
    @{ unitNo = 3; topicName = 'Water Treatment Techniques' },
    @{ unitNo = 3; topicName = 'Polymer Chemistry Basics' }
  )
}

$created = 0
$skipped = 0

foreach ($s in $subjects) {
  $code = $s.subjectCode
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
