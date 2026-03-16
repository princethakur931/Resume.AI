const BASE_URL = process.env.AI_BASE_URL || 'https://api.anthropic.com';
const MODEL    = 'LongCat-Flash-Lite';

const LATEX_UNICODE_REPLACEMENTS = [
  ['\u2018', "'"],
  ['\u2019', "'"],
  ['\u201C', '"'],
  ['\u201D', '"'],
  ['\u2013', '--'],
  ['\u2014', '--'],
  ['\u2022', '\\textbullet{}'],
  ['\u2026', '...'],
  ['\u00A0', ' '],
  ['\u200B', ''],
  ['\u200C', ''],
  ['\u200D', ''],
  ['\uFEFF', '']
];

const MONTH_RE = '(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)';
const DATE_LIKE_RE = new RegExp(
  `(?:${MONTH_RE}\\.?\\s*\\d{4})|(?:\\d{4}\\s*(?:--|-|to)\\s*(?:\\d{4}|Present|Current))|(?:Present|Current|Till Date)`,'i'
);

function isDateLike(text) {
  const value = (text || '').replace(/[{}]/g, '').trim();
  if (!value || value.length > 48) return false;
  return DATE_LIKE_RE.test(value);
}

function compactDateHeadings(latex) {
  const lines = latex.split('\n');

  return lines.map((line) => {
    if (!line.includes('\\\\')) return line;

    const parts = line.split('\\\\').map((p) => p.trim()).filter(Boolean);
    if (parts.length < 2) return line;

    const last = parts[parts.length - 1];
    if (!isDateLike(last)) return line;

    const date = parts.pop();
    const first = parts.shift();
    if (!first) return line;

    const rightDate = /\\textit\{/.test(date) ? date : `\\textit{${date}}`;
    const rebuilt = [`${first} \\hfill ${rightDate}`, ...parts];
    return rebuilt.join(' \\\\ ');
  }).join('\n');
}

function lockOriginalTheme(originalLatex, candidateLatex) {
  const originalStart = originalLatex.indexOf('\\begin{document}');
  const originalEnd = originalLatex.lastIndexOf('\\end{document}');
  const candidateStart = candidateLatex.indexOf('\\begin{document}');
  const candidateEnd = candidateLatex.lastIndexOf('\\end{document}');

  if (originalStart < 0 || originalEnd < 0 || candidateStart < 0 || candidateEnd < 0) {
    return candidateLatex;
  }

  const originalPreamble = originalLatex.slice(0, originalStart).trimEnd();
  const candidateBody = candidateLatex.slice(candidateStart + '\\begin{document}'.length, candidateEnd).trim();

  return `${originalPreamble}\n\n\\begin{document}\n\n${candidateBody}\n\n\\end{document}`;
}

function escapeLatexText(text = '') {
  return text
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/&/g, '\\&')
    .replace(/%/g, '\\%')
    .replace(/\$/g, '\\$')
    .replace(/#/g, '\\#')
    .replace(/_/g, '\\_')
    .replace(/{/g, '\\{')
    .replace(/}/g, '\\}')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}');
}

function normalizeKeyword(text = '') {
  return text.toLowerCase().replace(/[^a-z0-9+.#]/g, ' ').replace(/\s+/g, ' ').trim();
}

function dedupeCsvValues(raw = '') {
  const parts = raw.split(',').map((x) => x.trim()).filter(Boolean);
  const seen = new Set();
  const out = [];

  for (const p of parts) {
    const key = normalizeKeyword(p);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }

  return out;
}

function classifyKeywordSection(keyword) {
  const k = normalizeKeyword(keyword);

  if (/(^| )html( |$)|(^| )css( |$)|javascript|typescript|react|angular|vue|bootstrap|tailwind/.test(k)) {
    return 'frameworks';
  }
  if (/mysql|postgres|postgresql|mongodb|sql|nosql|elasticsearch|redis|database/.test(k)) {
    return 'databases';
  }
  if (/git|github|docker|kubernetes|aws|azure|gcp|linux|jira|postman|vscode|ci cd|jenkins/.test(k)) {
    return 'tools';
  }
  if (/python|java|c\+\+|c#|golang|go( |$)|rust|php|ruby/.test(k)) {
    return 'languages';
  }

  // Default for API/AI/ML keywords like RAG, LangChain, FastAPI, REST APIs, NLP, etc.
  return 'core';
}

function updateSkillLine(latex, labelRegex, additions = []) {
  const regex = new RegExp(`(\\s*(?:\\\\item\\s*)?${labelRegex}\\s*)([^\\n]*)(\\\\\\\\)?`, 'i');
  const match = latex.match(regex);
  if (!match) return latex;

  const prefix = match[1] || '';
  const currentRaw = match[2] || '';
  const suffix = match[3] || '';

  const currentValues = dedupeCsvValues(currentRaw);
  const currentKeys = new Set(currentValues.map((v) => normalizeKeyword(v)));
  const merged = [...currentValues];
  // Keep skill lines compact so layout stays close to the original 1-page design.
  const MAX_LINE_LEN = 118;

  for (const add of additions.map((x) => escapeLatexText(x))) {
    const key = normalizeKeyword(add);
    if (!key || currentKeys.has(key)) continue;
    const next = [...merged, add].join(', ');
    if (next.length > MAX_LINE_LEN) break;
    merged.push(add);
    currentKeys.add(key);
  }

  return latex.replace(match[0], `${prefix}${merged.join(', ')}${suffix}`);
}

function containsKeyword(haystack, keyword) {
  return haystack.toLowerCase().includes((keyword || '').toLowerCase());
}

function trimSentence(text = '', maxLen = 600) {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLen) return clean;
  const clipped = clean.slice(0, maxLen);
  const cutAt = Math.max(clipped.lastIndexOf('. '), clipped.lastIndexOf(', '), clipped.lastIndexOf(' '));
  return `${(cutAt > 80 ? clipped.slice(0, cutAt) : clipped).trim()}`;
}

function compactSectionBullets(sectionName, blockText) {
  // Preserve all bullets as-is — do not truncate or drop any content
  return blockText;
}

function enforceOnePageContent(latex) {
  let out = latex;
  // Collapse excessive blank lines only — preserve all content, spacing, and bullets
  out = out.replace(/\n{4,}/g, '\n\n\n');
  return out;
}

function ensureNoPageNumber(latex) {
  let out = latex;
  out = out.replace(/\\pagestyle\{[^}]*\}/g, '\\pagestyle{empty}');
  if (!out.includes('\\pagestyle{empty}')) {
    out = out.replace(/\\begin\{document\}/, '\\begin{document}\n\\pagestyle{empty}');
  }
  return out;
}

function applySinglePageTightening(latex, level = 1) {
  let out = ensureNoPageNumber(latex);

  // Progressively tighten margins only when needed; keep the same template style.
  const marginByLevel = {
    1: 'top=0.44in, bottom=0.44in, left=0.55in, right=0.55in',
    2: 'top=0.40in, bottom=0.40in, left=0.52in, right=0.52in'
  };
  const geometryOpts = marginByLevel[level] || marginByLevel[2];
  const geometryLine = `\\usepackage[${geometryOpts}]{geometry}`;

  if (/\\usepackage\s*\[[^\]]*\]\s*\{geometry\}/.test(out)) {
    out = out.replace(/\\usepackage\s*\[[^\]]*\]\s*\{geometry\}/, geometryLine);
  } else if (/\\usepackage\s*\{geometry\}/.test(out)) {
    out = out.replace(/\\usepackage\s*\{geometry\}/, geometryLine);
  } else {
    out = out.replace(/(\\documentclass[^\n]*\n)/, `$1${geometryLine}\n`);
  }

  // Insert compact spacing commands in preamble once.
  const compactBlock = [
    '\\usepackage{enumitem}',
    '\\setlist[itemize]{noitemsep, topsep=0pt, parsep=0pt, partopsep=0pt, leftmargin=*}',
    '\\setlength{\\parskip}{0pt}',
    '\\setlength{\\parsep}{0pt}',
    '\\setlength{\\parindent}{0pt}',
    '\\linespread{0.97}\\selectfont',
    '\\emergencystretch=1em'
  ].join('\n');

  if (!out.includes('\\emergencystretch=1em')) {
    out = out.replace(/(\\begin\{document\})/, `${compactBlock}\n$1`);
  }

  return enforceOnePageContent(out);
}

// Patch LaTeX preamble to use tight margins + compact list/para spacing so all
// content fits on ONE page without removing or truncating any text.
function patchGeometryForOnePage(latex) {
  let out = latex;

  // 1. Force tight margins by replacing or injecting the geometry package
  const tightGeometry = '\\usepackage[top=0.38in, bottom=0.38in, left=0.50in, right=0.50in]{geometry}';
  if (/\\usepackage\s*\[[^\]]*\]\s*\{geometry\}/.test(out)) {
    out = out.replace(/\\usepackage\s*\[[^\]]*\]\s*\{geometry\}/, tightGeometry);
  } else if (/\\usepackage\s*\{geometry\}/.test(out)) {
    out = out.replace(/\\usepackage\s*\{geometry\}/, tightGeometry);
  } else {
    out = out.replace(/(\\documentclass[^\n]*\n)/, `$1${tightGeometry}\n`);
  }

  // 2. Reduce font size to 10pt if larger
  out = out.replace(/\\documentclass\[(1[12])pt\]/, '\\documentclass[10pt]');

  // 3. Inject compact spacing commands into preamble (before \begin{document})
  const compactSpacing = [
    '\\usepackage{enumitem}',
    '\\setlist[itemize]{noitemsep, topsep=1pt, parsep=0pt, partopsep=0pt, leftmargin=*}',
    '\\setlength{\\parskip}{1pt}',
    '\\setlength{\\parsep}{0pt}',
  ].join('\n');

  // Only inject if not already present
  if (!out.includes('\\setlist[itemize]')) {
    out = out.replace(/(\\begin\{document\})/, `${compactSpacing}\n$1`);
  }

  return out;
}

function injectKeywordsPreservingTemplate(originalLatex, keywords = []) {
  let latex = originalLatex;
  const uniqueKeywords = Array.from(new Set((keywords || []).map((k) => k.trim()).filter(Boolean)));
  if (!uniqueKeywords.length) return ensureNoPageNumber(latex);

  // Clean existing duplicates in skill lines first.
  latex = updateSkillLine(latex, 'Programming Languages:', []);
  latex = updateSkillLine(latex, 'Frameworks\\s*\\\\&\\s*Libraries:', []);
  latex = updateSkillLine(latex, 'Databases\\s*\\\\&\\s*Search Engines:', []);
  latex = updateSkillLine(latex, 'Core Skills:', []);
  latex = updateSkillLine(latex, 'Tools\\s*\\\\&\\s*Technologies:', []);

  const lowerDoc = latex.toLowerCase();
  // Keep visual balance of the original template: inject only a focused subset.
  const toInject = uniqueKeywords
    .filter((kw) => !lowerDoc.includes(kw.toLowerCase()))
    .filter((kw) => kw.length <= 24)
    .slice(0, 6);
  if (!toInject.length) return ensureNoPageNumber(latex);

  const bucket = {
    languages: [],
    frameworks: [],
    databases: [],
    core: [],
    tools: []
  };

  for (const kw of toInject) {
    bucket[classifyKeywordSection(kw)].push(kw);
  }

  latex = updateSkillLine(latex, 'Programming Languages:', bucket.languages);
  latex = updateSkillLine(latex, 'Frameworks\\s*\\\\&\\s*Libraries:', bucket.frameworks);
  latex = updateSkillLine(latex, 'Databases\\s*\\\\&\\s*Search Engines:', bucket.databases);
  latex = updateSkillLine(latex, 'Core Skills:', bucket.core);
  latex = updateSkillLine(latex, 'Tools\\s*\\\\&\\s*Technologies:', bucket.tools);

  return ensureNoPageNumber(enforceOnePageContent(latex));
}

function wrapOrphanListItems(latex) {
  const lines = latex.split('\n');
  const out = [];
  let listDepth = 0;
  let autoItemizeOpen = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (autoItemizeOpen) {
      if (/^\\item\b/.test(trimmed) || trimmed === '') {
        out.push(line);
        continue;
      }
      out.push('\\end{itemize}');
      autoItemizeOpen = false;
    }

    if (/^\\begin\{(itemize|enumerate|description)\}/.test(trimmed)) {
      listDepth += 1;
      out.push(line);
      continue;
    }

    if (/^\\end\{(itemize|enumerate|description)\}/.test(trimmed)) {
      listDepth = Math.max(0, listDepth - 1);
      out.push(line);
      continue;
    }

    if (/^\\item\b/.test(trimmed) && listDepth === 0) {
      out.push('\\begin{itemize}');
      out.push(line);
      autoItemizeOpen = true;
      continue;
    }

    out.push(line);
  }

  if (autoItemizeOpen) {
    out.push('\\end{itemize}');
  }

  return out.join('\n');
}

function sanitizeLatexDocument(rawLatex) {
  if (!rawLatex || typeof rawLatex !== 'string') {
    throw new Error('AI returned empty LaTeX output.');
  }

  let latex = rawLatex.trim();

  // Remove markdown fences or accidental wrapper tags around the document.
  latex = latex
    .replace(/^```(?:latex)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .replace(/^<LATEX>\s*/i, '')
    .replace(/\s*<\/LATEX>$/i, '')
    .trim();

  // Keep only the LaTeX document body if the model adds extra narration.
  const docStart = latex.indexOf('\\documentclass');
  if (docStart >= 0) {
    latex = latex.slice(docStart);
  }
  const docEnd = latex.lastIndexOf('\\end{document}');
  if (docEnd >= 0) {
    latex = latex.slice(0, docEnd + '\\end{document}'.length);
  }

  latex = latex.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  for (const [bad, good] of LATEX_UNICODE_REPLACEMENTS) {
    latex = latex.split(bad).join(good);
  }

  latex = compactDateHeadings(latex);
  latex = wrapOrphanListItems(latex);

  if (!latex.includes('\\documentclass')) {
    throw new Error('AI output is not a valid LaTeX document (missing \\documentclass).');
  }
  if (!latex.includes('\\begin{document}') || !latex.includes('\\end{document}')) {
    throw new Error('AI output is not a complete LaTeX document.');
  }

  return latex.trim();
}

async function callAI(prompt, maxTokens = 4096) {
  const key = process.env.LONGCHAT_API_KEY || process.env.ANTHROPIC_API_KEY;
  const res = await fetch(`${BASE_URL}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'Authorization': `Bearer ${key}`,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  const data = await res.json();

  if (!res.ok) {
    console.error('AI API error:', JSON.stringify(data));
    throw new Error(data?.error?.message || `AI API error: ${res.status}`);
  }

  return data.content[0].text.trim();
}

async function convertToLatex(resumeText) {
  const prompt = `You are an expert LaTeX resume writer. Convert the following resume text into a clean, professional LaTeX resume.

CRITICAL REQUIREMENTS:
1. Preserve the EXACT structure and ALL content of the original resume — do NOT drop, shorten, or omit any bullet points, skills, or sections
2. Include EVERY bullet point, skill, and detail exactly as written in the original
3. Use a clean, ATS-friendly layout with proper sections
4. Use standard LaTeX packages only: geometry, fontenc, inputenc, hyperref, titlesec, enumitem, parskip
5. Do NOT use any exotic packages that may not be installed
6. Include \\documentclass[10pt]{article}
7. Use compact vertical spacing: \\setlength{\\parskip}{2pt}, \\setlength{\\itemsep}{1pt}, \\setlength{\\topsep}{2pt} so content fits in 1 page
8. Include ALL sections present in original: Summary, Technical Skills, Experience, Open Source, Projects, Education, Certifications (whatever is in the original)
9. Escape LaTeX-sensitive characters in plain text: &, %, $, #, _, {, }, ~, ^
10. Use proper list environments (itemize + \\item). Never use raw markdown bullets like '-', '*', or '--'
11. For experience/project/education entries: keep role or project title on ONE line and put dates on the SAME line at right using \\hfill (do not place dates on a separate line)
12. Keep the original section order/structure unchanged (no section renaming/reordering)
13. Preserve ALL skills listed under Technical Skills — include every single skill, tool, language, and technology
14. Output ONLY raw LaTeX from \\documentclass ... \\end{document}; no explanation, no markdown code blocks, no XML tags

Resume Text:
${resumeText}`;

  let latex = await callAI(prompt, 8000);
  return ensureNoPageNumber(sanitizeLatexDocument(latex));
}

async function optimizeLatex(latexCode, jobDescription) {
  const prompt = `You are an expert ATS resume optimizer. Optimize the given LaTeX resume for the job description.

TASK:
1. Extract ALL important ATS keywords, skills, tools, technologies, and domain terms from the job description (aim for 20-40 keywords)
2. Integrate these keywords naturally into the correct resume sections (rephrase existing content, do NOT fabricate)
3. Preserve ALL existing content — do NOT drop bullet points, shorten skills, or remove sections
4. Keep all existing sections and hierarchy — only enhance/rephrase content
5. Add a Skills section if missing
6. Return a complete LaTeX document and preserve valid LaTeX syntax
7. Escape LaTeX-sensitive characters in plain text: &, %, $, #, _, {, }, ~, ^
8. Use proper LaTeX lists (itemize with \\item). Do not output markdown bullets
9. CRITICAL: Preserve the original visual design exactly (same preamble, colors, fonts, symbols, spacing style, headings style)
10. CRITICAL: Preserve section order and section names exactly as in the provided LaTeX
11. Keep all dates on the SAME heading line as role/project title using \\hfill (never date on a separate line)
12. Do NOT remove or shorten any bullet points or skill entries from the original

Respond using EXACTLY this format with these XML tags (nothing else before or after):

<LATEX>
[complete optimized LaTeX code here]
</LATEX>
<KEYWORDS>keyword1, keyword2, keyword3, keyword4, keyword5</KEYWORDS>
<ATS_SCORE>85</ATS_SCORE>

Current LaTeX Resume:
${latexCode}

Job Description:
${jobDescription}`;

  const responseText = await callAI(prompt, 6000);

  // Extract LaTeX between tags
  const latexMatch = responseText.match(/<LATEX>([\s\S]*?)<\/LATEX>/);
  const keywordsMatch = responseText.match(/<KEYWORDS>([\s\S]*?)<\/KEYWORDS>/);
  const scoreMatch = responseText.match(/<ATS_SCORE>(\d+)<\/ATS_SCORE>/);

  const keywords = keywordsMatch ? keywordsMatch[1].split(',').map(k => k.trim()).filter(Boolean) : [];
  const atsScore = scoreMatch ? Math.max(0, Math.min(100, parseInt(scoreMatch[1], 10))) : 75;
  const originalTemplateLatex = sanitizeLatexDocument(latexCode);

  // Keep user's design/template unchanged: optimize content in-place.
  const optimizedLatex = injectKeywordsPreservingTemplate(originalTemplateLatex, keywords);

  return { optimizedLatex, keywords, atsScore };
}

module.exports = {
  convertToLatex,
  optimizeLatex,
  sanitizeLatexDocument,
  applySinglePageTightening
};
