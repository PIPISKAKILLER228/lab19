# Lab 17 automated verification.
# The server must already be running (npm run start:dev).
# Run: npm run verify
# Custom address: powershell -ExecutionPolicy Bypass -File scripts/verify.ps1 -ServerUrl http://localhost:3100

param(
    [string]$ServerUrl = ''
)

$ErrorActionPreference = 'Continue'

$projectRoot = Split-Path $PSScriptRoot -Parent
$config = @{}
$envPath = Join-Path $projectRoot '.env'

if (Test-Path -LiteralPath $envPath) {
    foreach ($line in Get-Content -LiteralPath $envPath) {
        if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$') {
            $value = $matches[2].Trim()
            if (($value.StartsWith('"') -and $value.EndsWith('"')) -or
                ($value.StartsWith("'") -and $value.EndsWith("'"))) {
                $value = $value.Substring(1, $value.Length - 2)
            }
            $config[$matches[1]] = $value
        }
    }
}

$port = '3000'
if ($config.ContainsKey('PORT')) { $port = $config['PORT'] }
$adminEmail = 'admin@example.com'
if ($config.ContainsKey('ADMIN_EMAIL')) { $adminEmail = $config['ADMIN_EMAIL'] }
$adminPassword = 'Admin123!'
if ($config.ContainsKey('ADMIN_PASSWORD')) { $adminPassword = $config['ADMIN_PASSWORD'] }

$baseUrl = "http://localhost:$port"
if ($ServerUrl -ne '') {
    $baseUrl = $ServerUrl.TrimEnd('/')
}
$script:passed = 0
$script:failed = 0

function Invoke-Api {
    param(
        [Parameter(Mandatory = $true)][string]$Method,
        [Parameter(Mandatory = $true)][string]$Path,
        [hashtable]$Headers = @{},
        $Body = $null
    )

    $params = @{
        Method = $Method
        Uri = "$baseUrl$Path"
        Headers = $Headers
        ContentType = 'application/json; charset=utf-8'
        UseBasicParsing = $true
        ErrorAction = 'Stop'
    }

    if ($null -ne $Body) {
        $params['Body'] = ($Body | ConvertTo-Json -Depth 5 -Compress)
    }

    try {
        $response = Invoke-WebRequest @params
        $parsed = $null
        if ($response.Content) {
            try { $parsed = $response.Content | ConvertFrom-Json }
            catch { $parsed = $response.Content }
        }
        return [pscustomobject]@{ Status = [int]$response.StatusCode; Body = $parsed }
    }
    catch {
        $status = 0
        if ($null -ne $_.Exception.Response) {
            try { $status = [int]$_.Exception.Response.StatusCode } catch { $status = 0 }
        }
        $parsed = $null
        if ($_.ErrorDetails -and $_.ErrorDetails.Message) {
            try { $parsed = $_.ErrorDetails.Message | ConvertFrom-Json }
            catch { $parsed = $_.ErrorDetails.Message }
        }
        return [pscustomobject]@{ Status = $status; Body = $parsed }
    }
}

function Assert-Status {
    param([int]$Expected, $Result, [string]$Name)
    if ($Result.Status -eq $Expected) {
        Write-Host "[OK]   $Name (HTTP $($Result.Status))" -ForegroundColor Green
        $script:passed++
    }
    else {
        Write-Host "[FAIL] $Name - expected HTTP $Expected, got $($Result.Status)" -ForegroundColor Red
        if ($null -ne $Result.Body) {
            $bodyText = $Result.Body | ConvertTo-Json -Depth 5 -Compress
            Write-Host "       Body: $bodyText" -ForegroundColor DarkYellow
        }
        $script:failed++
    }
}

function Assert-True {
    param([bool]$Condition, [string]$Name)
    if ($Condition) {
        Write-Host "[OK]   $Name" -ForegroundColor Green
        $script:passed++
    }
    else {
        Write-Host "[FAIL] $Name" -ForegroundColor Red
        $script:failed++
    }
}

Write-Host ''
Write-Host '=== Lab 17: authentication / authorization verification ===' -ForegroundColor Cyan
Write-Host "Server: $baseUrl"
Write-Host ''

$health = Invoke-Api -Method GET -Path '/health'
Assert-Status 200 $health 'GET /health'
if ($health.Status -ne 200) {
    Write-Host ''
    Write-Host 'The server is not running. Start it in another terminal: npm run start:dev' -ForegroundColor Yellow
    exit 1
}

$suffix = [guid]::NewGuid().ToString('N').Substring(0, 8)
$testEmail = "student.$suffix@example.com"
$testPassword = 'Test1234!'
$registerBody = @{ email = $testEmail; name = 'Test Student'; password = $testPassword }

$register = Invoke-Api -Method POST -Path '/auth/register' -Body $registerBody
Assert-Status 201 $register 'POST /auth/register'
Assert-True ([bool]($register.Body.user.roles -contains 'user')) 'New user receives role "user"'
Assert-True (-not ($register.Body.user.PSObject.Properties.Name -contains 'passwordHash')) 'Registration response does not expose passwordHash'

$duplicate = Invoke-Api -Method POST -Path '/auth/register' -Body $registerBody
Assert-Status 409 $duplicate 'Duplicate registration is rejected'

$wrongLogin = Invoke-Api -Method POST -Path '/auth/login' -Body @{ email = $testEmail; password = 'WrongPass1!' }
Assert-Status 401 $wrongLogin 'Wrong password is rejected'

$login = Invoke-Api -Method POST -Path '/auth/login' -Body @{ email = $testEmail; password = $testPassword }
Assert-Status 200 $login 'POST /auth/login (LocalStrategy)'
$token = $login.Body.access_token
Assert-True ([bool]$token) 'Login returns access_token'
Assert-True (($token -split '\.').Count -eq 3) 'JWT consists of 3 parts'

if ($token) {
    $payloadPart = ($token -split '\.')[1]
    $padding = $payloadPart.Length % 4
    if ($padding -ne 0) { $payloadPart += ('=' * (4 - $padding)) }
    $payloadJson = [Text.Encoding]::UTF8.GetString(
        [Convert]::FromBase64String($payloadPart.Replace('-', '+').Replace('_', '/'))
    )
    $payload = $payloadJson | ConvertFrom-Json
    Assert-True ([bool]($payload.sub -gt 0)) 'JWT payload contains user id (sub)'
    Assert-True ([bool]($payload.email -eq $testEmail)) 'JWT payload contains email'
}

$userHeaders = @{ Authorization = "Bearer $token" }

$noToken = Invoke-Api -Method GET -Path '/tasks'
Assert-Status 401 $noToken 'GET /tasks without token is denied'

$profile = Invoke-Api -Method GET -Path '/auth/profile' -Headers $userHeaders
Assert-Status 200 $profile 'GET /auth/profile with token'
Assert-True ([bool]($profile.Body.user.email -eq $testEmail)) 'Profile returns the authenticated user'

$task = Invoke-Api -Method POST -Path '/tasks' -Headers $userHeaders -Body @{
    title = 'Lab 17 test task'
    description = 'Created by scripts/verify.ps1'
}
Assert-Status 201 $task 'POST /tasks with token'
$taskId = $task.Body.id
Assert-True ([bool]($taskId -gt 0)) 'Created task has an id'

$taskList = Invoke-Api -Method GET -Path '/tasks' -Headers $userHeaders
Assert-Status 200 $taskList 'GET /tasks with token'
Assert-True (@($taskList.Body | Where-Object { $_.id -eq $taskId }).Count -eq 1) 'User sees own task'

$adminLogin = Invoke-Api -Method POST -Path '/auth/login' -Body @{ email = $adminEmail; password = $adminPassword }
Assert-Status 200 $adminLogin 'POST /auth/login (administrator)'
$adminToken = $adminLogin.Body.access_token
$adminHeaders = @{ Authorization = "Bearer $adminToken" }

$adminTasks = Invoke-Api -Method GET -Path '/tasks' -Headers $adminHeaders
Assert-Status 200 $adminTasks 'GET /tasks as administrator'
Assert-True (@($adminTasks.Body | Where-Object { $_.id -eq $taskId }).Count -eq 1) 'Administrator sees all tasks'

$userDelete = Invoke-Api -Method DELETE -Path "/tasks/$taskId" -Headers $userHeaders
Assert-Status 403 $userDelete 'DELETE /tasks/:id as user is forbidden (RBAC)'

$adminDelete = Invoke-Api -Method DELETE -Path "/tasks/$taskId" -Headers $adminHeaders
Assert-Status 200 $adminDelete 'DELETE /tasks/:id as administrator is allowed'

$deletedTask = Invoke-Api -Method GET -Path "/tasks/$taskId" -Headers $adminHeaders
Assert-Status 404 $deletedTask 'Deleted task is no longer available'

Write-Host ''
if ($script:failed -eq 0) {
    Write-Host "ALL CHECKS PASSED ($($script:passed) checks)." -ForegroundColor Green
    exit 0
}
else {
    Write-Host "FAILED: $($script:failed), passed: $($script:passed)." -ForegroundColor Red
    exit 1
}
