<#
.SYNOPSIS
  Let this network reach the panel, for exactly as long as the server runs.

.DESCRIPTION
  A phone cannot install the pendant it cannot load, and Windows blocks the
  connection before anything in this repository gets a say. Node's own
  firewall rules on this machine cover the *Public* profile only, and a home
  network is normally *Private* -- so the port answers on the PC and nowhere
  else, which looks exactly like a server that is not running.

  The rule is not left behind. Given -Watch, this adds it, holds it while
  anything is listening on the port, and takes it away once nothing is --
  including when the server is killed rather than stopped, because the watcher
  is a separate elevated program that outlives it.

  It watches the *port*, not a process id. The first version took a pid from
  the shell, and `$$` in Git Bash is an MSYS id from a different namespace
  than the one `Wait-Process` knows: it matched nothing, returned at once, and
  removed the rule a second after adding it. A port is the same number to
  everybody.

  One elevation prompt per server start, and none at all if the rule happens
  to be there already. That is the least Windows allows: a firewall change
  needs administrator whichever direction it goes, so adding on start and
  removing on exit cannot be done silently.

  Narrow on purpose: one port, TCP only, inbound only, and only on the
  networks Windows already considers trusted. Nothing is opened to the
  internet -- a Public profile is a coffee shop, and the panel has no business
  being reachable there.

  ASCII only, deliberately. Windows PowerShell 5.1 reads a .ps1 with no BOM
  as ANSI, so a stray em dash arrives as mojibake and takes the string it was
  inside with it. The first version of this file did exactly that.

.PARAMETER Port
  The port the panel is served on. 8000 unless told otherwise.

.PARAMETER Watch
  Hold the rule open while something is listening on the port, and take it
  away once nothing is. This is the whole point.

.PARAMETER Remove
  Take the rule away now, and exit.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts/allow-lan.ps1 -Watch
  powershell -ExecutionPolicy Bypass -File scripts/allow-lan.ps1 -Remove
#>
param(
  [int]$Port = 8000,
  [switch]$Watch,
  [switch]$Remove
)

$ErrorActionPreference = 'Stop'
$ruleName = "cncjs panel $Port"

function Test-Elevated {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  return ([Security.Principal.WindowsPrincipal]$identity).IsInRole(
    [Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Get-Rule {
  try {
    return Get-NetFirewallRule -DisplayName $ruleName -ErrorAction Stop
  } catch {
    return $null
  }
}

function Add-Rule {
  if (Get-Rule) { return }
  New-NetFirewallRule `
    -DisplayName $ruleName `
    -Description 'Added while the cncjs panel is running. Removed when it stops.' `
    -Direction Inbound `
    -Protocol TCP `
    -LocalPort $Port `
    -Action Allow `
    -Profile Private, Domain | Out-Null
}

function Remove-Rule {
  if (Get-Rule) {
    Remove-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
  }
}

# ---------------------------------------------------------------------------
# Elevated: do the work.
# ---------------------------------------------------------------------------
if (Test-Elevated) {
  if ($Remove) {
    Remove-Rule
    Write-Output "- removed '$ruleName'"
    exit 0
  }

  Add-Rule

  if (-not $Watch) {
    Write-Output "- added '$ruleName'"
    exit 0
  }

  <#
    Hold it while the server is up, then clean up.

    Two phases, and the first one matters: the rule is opened *before* the
    server finishes booting, so watching immediately would see an empty port
    and tidy up a second later. So wait for it to come up first, with a
    ceiling in case it never does.

    Then a few consecutive empty checks rather than one -- a port can be
    momentarily absent while a listener is replaced, and closing the firewall
    on that would be a restart that quietly loses the phone.

    `try/finally` so the rule comes off even if this is itself killed.
  #>
  try {
    for ($i = 0; $i -lt 120; $i++) {
      if (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue) { break }
      Start-Sleep -Seconds 1
    }

    $missed = 0
    while ($missed -lt 3) {
      Start-Sleep -Seconds 1
      if (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue) {
        $missed = 0
      } else {
        $missed++
      }
    }
  } finally {
    Remove-Rule
  }
  exit 0
}

# ---------------------------------------------------------------------------
# Not elevated: hand the job to a copy of this file that is.
# ---------------------------------------------------------------------------
if (-not $Remove -and -not $Watch -and (Get-Rule)) {
  Write-Output "- '$ruleName' is already in place"
  exit 0
}

if ($Remove -and -not (Get-Rule)) {
  Write-Output "- no rule named '$ruleName', nothing to remove"
  exit 0
}

<#
  Re-launching *this* file rather than a command string: a quoted command
  passed through two shells is a thing that breaks on a path with a space in
  it, and this repository lives under E:\projekty\desktop, which is one
  rename away from having one.

  Not `-Wait` when watching: the elevated copy has to outlive this call and
  sit there until the server ends. Hidden, because it is a caretaker rather
  than something to look at.
#>
$arguments = @(
  '-NoProfile', '-ExecutionPolicy', 'Bypass',
  '-File', "`"$PSCommandPath`"",
  '-Port', $Port
)
if ($Remove) { $arguments += '-Remove' }
if ($Watch) { $arguments += '-Watch' }

try {
  if ($Watch) {
    Start-Process powershell -Verb RunAs -WindowStyle Hidden -ArgumentList $arguments
    # Give the elevated copy a moment to actually add it, so the caller can
    # print an address that already works.
    for ($i = 0; $i -lt 40 -and -not (Get-Rule); $i++) { Start-Sleep -Milliseconds 250 }
  } else {
    Start-Process powershell -Verb RunAs -ArgumentList $arguments -Wait
  }
} catch {
  Write-Output "- elevation refused; the panel will answer on this PC only"
  Write-Output ""
  Write-Output "  To open it by hand, in a PowerShell started as administrator:"
  Write-Output "    New-NetFirewallRule -DisplayName '$ruleName' -Direction Inbound -Protocol TCP -LocalPort $Port -Action Allow -Profile Private,Domain"
  exit 1
}

if ($Remove) {
  if (Get-Rule) { Write-Output "- still present, it was not removed"; exit 1 }
  Write-Output "- removed"
  exit 0
}

if (Get-Rule) {
  $note = if ($Watch) { ", and will go when the server does" } else { "" }
  Write-Output "- opened TCP $Port to this network$note"
  exit 0
}

Write-Output "- could not open TCP $Port; the panel will answer on this PC only"
exit 1
