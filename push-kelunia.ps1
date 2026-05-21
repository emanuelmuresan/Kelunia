param(
  [Parameter(Position = 0, ValueFromRemainingArguments = $true)]
  [string[]] $MessageParts
)

$ErrorActionPreference = "Stop"

function Invoke-Git {
  param(
    [Parameter(Mandatory = $true)]
    [string[]] $Arguments
  )

  Write-Host ""
  Write-Host "git $($Arguments -join ' ')" -ForegroundColor Cyan
  & git @Arguments

  if ($LASTEXITCODE -ne 0) {
    throw "Git command failed: git $($Arguments -join ' ')"
  }
}

Set-Location -LiteralPath $PSScriptRoot

$isRepo = (& git rev-parse --is-inside-work-tree 2>$null).Trim()
if ($LASTEXITCODE -ne 0 -or $isRepo -ne "true") {
  throw "This folder is not a Git repository."
}

$branch = (& git branch --show-current).Trim()
if ([string]::IsNullOrWhiteSpace($branch)) {
  throw "Git is in detached HEAD state. Checkout a branch before pushing."
}

$message = ($MessageParts -join " ").Trim()
$statusBefore = & git status --porcelain

if ($statusBefore) {
  if ([string]::IsNullOrWhiteSpace($message)) {
    $message = (Read-Host "Commit message").Trim()
  }

  if ([string]::IsNullOrWhiteSpace($message)) {
    throw "Commit message cannot be empty."
  }

  Invoke-Git -Arguments @("add", "-A")

  & git diff --cached --quiet
  $hasStagedChanges = $LASTEXITCODE -ne 0

  if ($hasStagedChanges) {
    Invoke-Git -Arguments @("commit", "-m", $message)
  } else {
    Write-Host "No staged changes to commit." -ForegroundColor Yellow
  }
} else {
  Write-Host "No local changes to commit." -ForegroundColor Yellow
}

Invoke-Git -Arguments @("pull", "--rebase", "--autostash", "origin", $branch)
Invoke-Git -Arguments @("push", "origin", $branch)

Write-Host ""
Write-Host "Done. Branch '$branch' is synced with GitHub." -ForegroundColor Green
