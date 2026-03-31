$ErrorActionPreference = 'Stop'

$base = 'http://localhost:8081'

function Get-Token([string]$email, [string]$password) {
  $login = Invoke-RestMethod -Method Post -Uri "$base/api/auth/login" -ContentType 'application/json' -Body (@{ email = $email; password = $password } | ConvertTo-Json -Compress)
  return $login.token
}

$adminToken = Get-Token 'admin@acadex.com' 'admin123'
$adminHeaders = @{ Authorization = "Bearer $adminToken" }

$targets = @(
  @{ email='prof.algebra@acadex.com'; subjectCode='MATH201'; display='Prof Algebra' },
  @{ email='prof.physics@acadex.com'; subjectCode='PHY201'; display='Prof Physics' },
  @{ email='prof.chem@acadex.com'; subjectCode='CHEM201'; display='Prof Chemistry' }
)

$facultyUsers = Invoke-RestMethod -Method Get -Uri "$base/api/admin/users?role=faculty" -Headers $adminHeaders
$subjects = Invoke-RestMethod -Method Get -Uri "$base/api/subjects" -Headers $adminHeaders
$courseId = 104
$roomId = 101

foreach ($t in $targets) {
  $faculty = $facultyUsers | Where-Object { $_.email -eq $t.email } | Select-Object -First 1
  if (-not $faculty) { throw "Faculty missing: $($t.email)" }

  # Normalize role for Spring hasRole('FACULTY') checks.
  Invoke-RestMethod -Method Put -Uri "$base/api/admin/users/$($faculty.id)" -Headers $adminHeaders -ContentType 'application/json' -Body (@{
    role = 'FACULTY'
    department = 'Engineering'
    section = 'A'
  } | ConvertTo-Json -Compress) | Out-Null

  $subject = $subjects | Where-Object { $_.subjectCode -eq $t.subjectCode } | Select-Object -First 1
  if (-not $subject) { throw "Subject missing: $($t.subjectCode)" }

  # Bind subject to faculty so attendance mark authorization passes.
  Invoke-RestMethod -Method Put -Uri "$base/api/subjects/$($subject.id)" -Headers $adminHeaders -ContentType 'application/json' -Body (@{
    facultyId = $faculty.id
    department = 'Engineering'
    section = 'A'
    semester = 'Sem-1'
  } | ConvertTo-Json -Compress) | Out-Null

  # Ensure course-faculty mapping exists for timetable creation precondition.
  try {
    Invoke-RestMethod -Method Post -Uri "$base/api/courses/$courseId/faculty" -Headers $adminHeaders -ContentType 'application/json' -Body (@{
      facultyId = $faculty.id
      section = 'A'
      role = 'FACULTY'
    } | ConvertTo-Json -Compress) | Out-Null
  } catch {
    $resp = $_.Exception.Response
    if (-not $resp -or [int]$resp.StatusCode -ne 400) {
      throw
    }
  }
}

$today = (Get-Date).DayOfWeek.ToString().ToUpper()
$slots = @(
  @{ start='09:00'; end='09:50' },
  @{ start='10:00'; end='10:50' },
  @{ start='11:00'; end='11:50' }
)

$facultyUsers = Invoke-RestMethod -Method Get -Uri "$base/api/admin/users?role=faculty" -Headers $adminHeaders
$timetable = Invoke-RestMethod -Method Get -Uri "$base/api/timetable" -Headers $adminHeaders

for ($i = 0; $i -lt $targets.Count; $i++) {
  $t = $targets[$i]
  $faculty = $facultyUsers | Where-Object { $_.email -eq $t.email } | Select-Object -First 1
  $already = $timetable | Where-Object {
    $_.faculty.id -eq $faculty.id -and $_.course.id -eq $courseId -and $_.dayOfWeek -eq $today
  } | Select-Object -First 1

  if (-not $already) {
    $slot = $slots[$i]
    Invoke-RestMethod -Method Post -Uri "$base/api/timetable" -Headers $adminHeaders -ContentType 'application/json' -Body (@{
      course = @{ id = $courseId }
      faculty = @{ id = $faculty.id }
      room = @{ id = $roomId }
      dayOfWeek = $today
      startTime = $slot.start
      endTime = $slot.end
    } | ConvertTo-Json -Compress) | Out-Null
  }
}

$subjects = Invoke-RestMethod -Method Get -Uri "$base/api/subjects" -Headers $adminHeaders

Write-Output '--- Faculty Attendance Access Check ---'
foreach ($t in $targets) {
  $token = Get-Token $t.email 'faculty123'
  $headers = @{ Authorization = "Bearer $token" }
  $subject = $subjects | Where-Object { $_.subjectCode -eq $t.subjectCode } | Select-Object -First 1

  $mySubjects = Invoke-RestMethod -Method Get -Uri "$base/api/attendance/my-scheduled-subjects" -Headers $headers
  $students = Invoke-RestMethod -Method Get -Uri "$base/api/attendance/students?subjectId=$($subject.id)" -Headers $headers

  Write-Output ("OK {0} -> mySubjects={1}, studentsFor{2}={3}" -f $t.email, $mySubjects.Count, $t.subjectCode, $students.Count)
}

Write-Output '--- Timetable For Target Faculties ---'
$timetable = Invoke-RestMethod -Method Get -Uri "$base/api/timetable" -Headers $adminHeaders
$targetIds = @($facultyUsers | Where-Object { $_.email -in $targets.email } | Select-Object -ExpandProperty id)
$timetable |
  Where-Object { $targetIds -contains $_.faculty.id } |
  Select-Object id,@{N='faculty';E={$_.faculty.name}},@{N='course';E={$_.course.courseCode}},dayOfWeek,startTime,endTime,@{N='room';E={$_.room.name}} |
  Format-Table -AutoSize |
  Out-String |
  Write-Output
