const { exec } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { promisify } = require('util');

const execAsync = promisify(exec);
const writeFileAsync = promisify(fs.writeFile);
const readFileAsync = promisify(fs.readFile);
const unlinkAsync = promisify(fs.unlink);

function extractLatexError(logText = '') {
  const lines = logText.split(/\r?\n/);
  const bangIndex = lines.findIndex((line) => line.trim().startsWith('!'));

  if (bangIndex >= 0) {
    const primary = lines[bangIndex].trim();
    const context = lines.slice(bangIndex + 1, bangIndex + 4).join(' ').trim();
    return context ? `${primary} ${context}` : primary;
  }

  const emergency = lines.find((line) => /Emergency stop/i.test(line));
  if (emergency) return emergency.trim();

  return '';
}

// Common MiKTeX/TeX install paths on Windows
const WIN_PATHS = [
  `C:\\Users\\${os.userInfo().username}\\AppData\\Local\\Programs\\MiKTeX\\miktex\\bin\\x64\\pdflatex.exe`,
  `C:\\Users\\${os.userInfo().username}\\AppData\\Local\\Programs\\MiKTeX\\miktex\\bin\\pdflatex.exe`,
  'C:\\Program Files\\MiKTeX\\miktex\\bin\\x64\\pdflatex.exe',
  'C:\\Program Files\\MiKTeX\\miktex\\bin\\pdflatex.exe',
  'C:\\texlive\\2023\\bin\\win32\\pdflatex.exe',
  'C:\\texlive\\2024\\bin\\win32\\pdflatex.exe',
];

let _pdflatexPath = null;

async function findPdflatex() {
  if (_pdflatexPath) return _pdflatexPath;

  // 1. Try plain command (works if PATH is set)
  try {
    await execAsync('pdflatex --version', { shell: true });
    _pdflatexPath = 'pdflatex';
    console.log('[LaTeX] Found pdflatex in PATH');
    return _pdflatexPath;
  } catch {}

  // 2. Try `where pdflatex` on Windows
  try {
    const { stdout } = await execAsync('where pdflatex', { shell: true });
    const found = stdout.trim().split('\n')[0].trim();
    if (found) {
      _pdflatexPath = `"${found}"`;
      console.log('[LaTeX] Found pdflatex via where:', found);
      return _pdflatexPath;
    }
  } catch {}

  // 3. Try known Windows paths
  for (const p of WIN_PATHS) {
    if (fs.existsSync(p)) {
      _pdflatexPath = `"${p}"`;
      console.log('[LaTeX] Found pdflatex at:', p);
      return _pdflatexPath;
    }
  }

  console.log('[LaTeX] pdflatex not found');
  return null;
}

async function checkPdflatex() {
  const p = await findPdflatex();
  return p !== null;
}

async function compile(latexCode) {
  const pdflatex = await findPdflatex();
  if (!pdflatex) throw new Error('pdflatex not found. Please install MiKTeX.');

  const tmpDir = path.resolve(process.cwd(), '.latex-temp');
  await fs.promises.mkdir(tmpDir, { recursive: true });
  const jobName = `resume_${Date.now()}`;
  const texFile = path.join(tmpDir, `${jobName}.tex`);
  const pdfFile = path.join(tmpDir, `${jobName}.pdf`);
  const logFile = path.join(tmpDir, `${jobName}.log`);

  const cleanup = async () => {
    for (const ext of ['.tex', '.pdf', '.log', '.aux', '.out']) {
      try { await unlinkAsync(path.join(tmpDir, `${jobName}${ext}`)); } catch {}
    }
  };

  try {
    console.log('[LaTeX] Writing .tex file to:', texFile);
    await writeFileAsync(texFile, latexCode, 'utf-8');

    const cmd = `${pdflatex} -interaction=nonstopmode -file-line-error -halt-on-error -output-directory="." "${jobName}.tex"`;
    console.log('[LaTeX] Running command:', cmd);

    // Some MiKTeX setups return non-zero on first pass while still succeeding on second pass.
    let firstPassError = null;
    try {
      const result1 = await execAsync(cmd, { timeout: 60000, shell: true, cwd: tmpDir });
      console.log('[LaTeX] First pass stdout:', result1.stdout?.substring(0, 200));
    } catch (passErr) {
      firstPassError = passErr;
      console.warn('[LaTeX] First pass returned non-zero, retrying second pass...');
    }

    let secondPassError = null;
    try {
      await execAsync(cmd, { timeout: 60000, shell: true, cwd: tmpDir });
      console.log('[LaTeX] Second pass completed');
    } catch (passErr) {
      secondPassError = passErr;
      console.warn('[LaTeX] Second pass returned non-zero.');
    }

    if (!fs.existsSync(pdfFile)) {
      throw secondPassError || firstPassError || new Error('pdflatex did not produce a PDF file.');
    }

    console.log('[LaTeX] Reading PDF from:', pdfFile);
    const pdfBuffer = await readFileAsync(pdfFile);
    const base64 = pdfBuffer.toString('base64');
    console.log('[LaTeX] PDF size:', base64.length, 'bytes (base64)');
    await cleanup();
    return base64;
  } catch (err) {
    let logText = '';
    try {
      logText = await readFileAsync(logFile, 'utf-8');
    } catch {}

    const texError = extractLatexError(logText);
    console.error('[LaTeX] Compilation failed:', err.message);
    if (texError) {
      console.error('[LaTeX] TeX error:', texError);
    }
    console.error('[LaTeX] Stack:', err.stack);
    await cleanup();

    // Detect specific MiKTeX errors and provide helpful messages
    const errorMsg = err.message || '';
    const stderr = err.stderr || '';
    const combinedError = `${errorMsg} ${stderr}`;

    if (combinedError.includes('not checked for MiKTeX updates')) {
      throw new Error(
        '⚠️ MiKTeX Update Required\n\n' +
        'Quick Fix: Open "MiKTeX Console" from Windows Start menu → Click "Check for updates" → Close and retry.\n\n' +
        'Alternative: Run as Admin in PowerShell:\n' +
        'initexmf --set-config-value [MPM]AutoInstall=1'
      );
    }

    if (combinedError.includes('missing package') || combinedError.includes('not found')) {
      throw new Error(
        '⚠️ Missing LaTeX Packages\n\n' +
        'Fix: Open MiKTeX Console → Settings → Enable "Install missing packages on-the-fly" → Retry optimization.'
      );
    }

    const detailSuffix = texError ? ` | ${texError}` : '';
    throw new Error(`LaTeX compilation failed: ${err.message}${detailSuffix}`);
  }
}

module.exports = { checkPdflatex, compile };
