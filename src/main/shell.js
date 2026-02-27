const fs = require('fs');
const path = require('path');

function getShell() {
  if (process.platform === 'win32') {
    const pwsh = 'C:\\Program Files\\PowerShell\\7\\pwsh.exe';
    if (fs.existsSync(pwsh)) return pwsh;
    return 'powershell.exe';
  }
  return process.env.SHELL || '/bin/bash';
}

function getShellArgs() {
  const shell = getShell();
  const shellBase = path.basename(shell).toLowerCase().replace('.exe', '');

  if (process.platform === 'win32') {
    // PowerShell: inject a prompt function that emits OSC 9;9 for CWD tracking.
    // Uses -EncodedCommand to avoid all quoting issues.
    // For pwsh 7+, we must explicitly load the profile since -EncodedCommand skips it.
    const isPwsh7 = shellBase === 'pwsh';
    const lines = [];

    if (isPwsh7) {
      lines.push('if (Test-Path $PROFILE) { . $PROFILE }');
    }

    // Capture existing prompt and wrap with CWD reporting
    lines.push(
      '$__mtOrig = $function:prompt',
      'function global:prompt {',
      '  $e = [char]0x1b',
      '  [Console]::Write("${e}]9;9;$($PWD.Path)$([char]7)")',
      '  if ($__mtOrig) { & $__mtOrig } else {',
      "    \"PS $($executionContext.SessionState.Path.CurrentLocation)$('>' * ($nestedPromptLevel + 1)) \"",
      '  }',
      '}',
    );

    const script = lines.join('\n');
    const encoded = Buffer.from(script, 'utf16le').toString('base64');
    return ['-NoLogo', '-NoExit', '-EncodedCommand', encoded];
  }

  if (shell.endsWith('/fish')) return ['-l'];
  if (shell.endsWith('/zsh') || shell.endsWith('/bash')) return ['--login'];
  return [];
}

module.exports = { getShell, getShellArgs };
