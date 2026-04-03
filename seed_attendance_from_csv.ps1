$ErrorActionPreference = 'Stop'

function Get-Token($email, $password) {
  $body = @{ email = $email; password = $password } | ConvertTo-Json
  $res = Invoke-RestMethod -Uri 'http://localhost:8081/api/auth/login' -Method POST -ContentType 'application/json' -Body $body
  return $res.token
}

$adminToken = Get-Token 'admin@acadex.com' 'admin123'
$adminHeaders = @{ Authorization = "Bearer $adminToken" }

$facultySeeds = @(
  @{ name='Prof Algebra'; email='prof.algebra@acadex.com'; password='faculty123'; role='FACULTY'; department='Engineering'; section='A' },
  @{ name='Prof Systems'; email='prof.systems@acadex.com'; password='faculty123'; role='FACULTY'; department='Computer Science'; section='A' }
)

foreach ($f in $facultySeeds) {
  try {
    Invoke-RestMethod -Uri 'http://localhost:8081/api/admin/users' -Method POST -Headers $adminHeaders -ContentType 'application/json' -Body ($f | ConvertTo-Json) | Out-Null
    Write-Output "Created faculty: $($f.email)"
  } catch {
    Write-Output "Faculty exists or skipped: $($f.email)"
  }
}

$allUsers = Invoke-RestMethod -Uri 'http://localhost:8081/api/admin/users?role=faculty' -Method GET -Headers $adminHeaders
$facultyByEmail = @{}
foreach ($u in $allUsers) { $facultyByEmail[$u.email] = $u.id }

$subjectSeeds = @(
  @{ subjectName='Data Structures'; subjectCode='CS201'; facultyEmail='prof.algebra@acadex.com'; section='A'; department='Computer Science'; semester='Sem-3' },
  @{ subjectName='Operating Systems'; subjectCode='CS301'; facultyEmail='prof.systems@acadex.com'; section='A'; department='Computer Science'; semester='Sem-3' },
  @{ subjectName='Database Management'; subjectCode='CS302'; facultyEmail='prof.algebra@acadex.com'; section='A'; department='Computer Science'; semester='Sem-3' }
)

$subjects = Invoke-RestMethod -Uri 'http://localhost:8081/api/subjects' -Method GET -Headers $adminHeaders
$subjectByCode = @{}
foreach ($s in $subjects) { $subjectByCode[$s.subjectCode] = $s }

foreach ($s in $subjectSeeds) {
  $facultyId = $facultyByEmail[$s.facultyEmail]
  if (-not $facultyId) { throw "Faculty not found for $($s.facultyEmail)" }

  if ($subjectByCode.ContainsKey($s.subjectCode)) {
    $existing = $subjectByCode[$s.subjectCode]
    $upd = @{ subjectName=$s.subjectName; subjectCode=$s.subjectCode; facultyId=$facultyId; section=$s.section; department=$s.department; semester=$s.semester } | ConvertTo-Json
    Invoke-RestMethod -Uri "http://localhost:8081/api/subjects/$($existing.id)" -Method PUT -Headers $adminHeaders -ContentType 'application/json' -Body $upd | Out-Null
    Write-Output "Updated subject: $($s.subjectCode)"
  } else {
    $create = @{ subjectName=$s.subjectName; subjectCode=$s.subjectCode; facultyId=$facultyId; section=$s.section; department=$s.department; semester=$s.semester } | ConvertTo-Json
    $newS = Invoke-RestMethod -Uri 'http://localhost:8081/api/subjects' -Method POST -Headers $adminHeaders -ContentType 'application/json' -Body $create
    $subjectByCode[$s.subjectCode] = $newS
    Write-Output "Created subject: $($s.subjectCode)"
  }
}

$subjectStudentMap = @{}
foreach ($s in $subjectSeeds) {
  $subject = $subjectByCode[$s.subjectCode]
  if (-not $subject) { continue }
  $facultyToken = Get-Token $s.facultyEmail 'faculty123'
  $facultyHeaders = @{ Authorization = "Bearer $facultyToken" }
  $subjectStudentMap[$s.subjectCode] = Invoke-RestMethod -Uri "http://localhost:8081/api/attendance/students?subjectId=$($subject.id)" -Method GET -Headers $facultyHeaders
}

$csvPath = 'd:\acadex\ml-risk-service\student_data.csv'
$csv = Import-Csv -Path $csvPath
if (-not $csv -or $csv.Count -eq 0) { throw "CSV empty: $csvPath" }

function Get-RowForStudent($student, $csvRows) {
  $digits = ([regex]::Matches($student.email, '\d+') | ForEach-Object { $_.Value }) -join ''
  if (-not $digits) { $digits = ([Math]::Abs($student.id.GetHashCode())).ToString() }
  $tail = if ($digits.Length -gt 9) { $digits.Substring($digits.Length - 9) } else { $digits }
  $n = 0
  [void][long]::TryParse($tail, [ref]$n)
  $idx = [int]($n % $csvRows.Count)
  return $csvRows[$idx]
}

$sessionCount = 10
$seedSummary = @()

foreach ($s in $subjectSeeds) {
  $facultyToken = Get-Token $s.facultyEmail 'faculty123'
  $facultyHeaders = @{ Authorization = "Bearer $facultyToken" }

  $subject = $subjectByCode[$s.subjectCode]
  $subjectId = $subject.id

  $students = $subjectStudentMap[$s.subjectCode]
  if (-not $students -or $students.Count -eq 0) {
    Write-Output "No students found for subject $($s.subjectCode), skipping"
    continue
  }

  for ($d = $sessionCount; $d -ge 1; $d--) {
    $date = (Get-Date).AddDays(-$d).ToString('yyyy-MM-dd')
    $studentStatuses = @()

    foreach ($stu in $students) {
      $row = Get-RowForStudent $stu $csv
      $abs = [double]$row.absences
      $targetPresent = [Math]::Max(5, [Math]::Min(98, 100 - (($abs / 75.0) * 100)))
      $roll = Get-Random -Minimum 0 -Maximum 100
      $status = if ($roll -lt $targetPresent) { 'present' } else { 'absent' }
      $studentStatuses += @{ studentId = $stu.id; status = $status }
    }

    $markBody = @{
      subjectId = [int64]$subjectId
      date = $date
      topicId = 1
      notes = 'CSV-seeded attendance'
      students = $studentStatuses
    } | ConvertTo-Json -Depth 8

    Invoke-RestMethod -Uri 'http://localhost:8081/api/attendance/mark' -Method POST -Headers $facultyHeaders -ContentType 'application/json' -Body $markBody | Out-Null
  }

  $seedSummary += @{ subjectCode = $s.subjectCode; students = $students.Count; sessions = $sessionCount }
  Write-Output "Seeded $($s.subjectCode): students=$($students.Count), sessions=$sessionCount"
}

$stats = Invoke-RestMethod -Uri 'http://localhost:8081/api/attendance/stats' -Method GET -Headers $adminHeaders
Write-Output '--- Updated Attendance Stats ---'
$stats | Select-Object totalSubjects,totalRecords,totalPresent,overallPresentPercentage,shortageCount | Format-List | Out-String

Write-Output '--- Seed Summary ---'
$seedSummary | Format-Table -AutoSize | Out-String
