const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

const ATS_STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'have', 'in', 'is', 'it',
  'of', 'on', 'or', 'that', 'the', 'to', 'was', 'were', 'will', 'with', 'you', 'your', 'our', 'we',
  'this', 'these', 'those', 'their', 'they', 'them', 'can', 'should', 'must', 'not', 'able', 'using'
]);

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

function tokenize(text = '') {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+.#\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .filter((t) => t.length > 1 && !ATS_STOPWORDS.has(t));
}

function latexToPlainText(latex = '') {
  return latex
    .replace(/%.*$/gm, ' ')
    .replace(/\\[a-zA-Z]+\*?(\[[^\]]*\])?(\{[^}]*\})?/g, ' ')
    .replace(/[{}$\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildTopJobTerms(jobDescription = '', limit = 35) {
  const freq = new Map();
  for (const token of tokenize(jobDescription)) {
    if (token.length < 3) continue;
    freq.set(token, (freq.get(token) || 0) + 1);
  }

  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .slice(0, limit)
    .map(([term]) => term);
}

function getExplicitKeywordEntries(jobDescription = '') {
  return (jobDescription || '')
    .split(/[\n,;|]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((s) => s.length >= 2)
    .filter((s) => s.length <= 48);
}

function getKeywordLimit(jobDescription = '') {
  const explicit = getExplicitKeywordEntries(jobDescription);
  if (explicit.length >= 2 && explicit.length <= 10) {
    return explicit.length;
  }
  return 8;
}

function keywordPriorityInJob(keyword, jobDescription = '') {
  const normKeyword = normalizeForMatch(keyword);
  const normJob = normalizeForMatch(jobDescription);
  if (!normKeyword || !normJob) return 0;

  if (normJob.includes(normKeyword)) return 100 + normKeyword.length;
  const phraseTokens = normKeyword.split(' ').filter((t) => t.length > 1 && !ATS_STOPWORDS.has(t));
  if (!phraseTokens.length) return 0;

  let hitCount = 0;
  for (const t of phraseTokens) {
    if (normJob.includes(t)) hitCount += 1;
  }
  return hitCount * 10 + normKeyword.length;
}

function filterKeywordsFromJobDescription(aiKeywords = [], jobDescription = '') {
  const maxKeywords = getKeywordLimit(jobDescription);
  const explicitEntries = getExplicitKeywordEntries(jobDescription);
  const candidates = [...aiKeywords, ...explicitEntries]
    .map((k) => (k || '').trim())
    .filter(Boolean);

  const deduped = Array.from(new Map(
    candidates.map((k) => [normalizeForMatch(k), k])
  ).values()).filter(Boolean);

  const matched = deduped
    .filter((k) => matchesPhraseInText(jobDescription, k))
    .sort((a, b) => keywordPriorityInJob(b, jobDescription) - keywordPriorityInJob(a, jobDescription))
    .slice(0, maxKeywords);

  return matched;
}

function normalizeForMatch(text = '') {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+.#\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchesPhraseInText(text, phrase) {
  const normText = normalizeForMatch(text);
  const normPhrase = normalizeForMatch(phrase);
  if (!normText || !normPhrase) return false;
  if (normText.includes(normPhrase)) return true;

  const phraseTokens = normPhrase.split(' ').filter((t) => t.length > 1 && !ATS_STOPWORDS.has(t));
  if (!phraseTokens.length) return false;

  let hits = 0;
  for (const t of phraseTokens) {
    if (normText.includes(t)) hits += 1;
  }

  return (hits / phraseTokens.length) >= 0.7;
}

function computeRealAtsScore({ optimizedLatex, jobDescription, keywords, providerAtsScore = null }) {
  const resumePlain = latexToPlainText(optimizedLatex || '');
  const resumeLower = resumePlain.toLowerCase();
  const jobLower = (jobDescription || '').toLowerCase();

  const cleanKeywords = Array.from(new Set((keywords || [])
    .map((k) => (k || '').trim().toLowerCase())
    .filter((k) => k.length >= 2)
  ));

  // Focus on highest-signal keywords (similar to ATS evaluators that weigh top requirements).
  const prioritizedKeywords = [...cleanKeywords]
    .sort((a, b) => {
      const aScore = (jobLower.includes(a) ? 3 : 0) + Math.min(a.split(' ').length, 3);
      const bScore = (jobLower.includes(b) ? 3 : 0) + Math.min(b.split(' ').length, 3);
      return bScore - aScore || b.length - a.length;
    })
    .slice(0, Math.min(12, cleanKeywords.length));

  const matchedKeywordCount = prioritizedKeywords.filter((k) => matchesPhraseInText(resumePlain, k)).length;
  const keywordCoverage = prioritizedKeywords.length
    ? matchedKeywordCount / prioritizedKeywords.length
    : 0;

  const topTerms = buildTopJobTerms(jobDescription, 35);
  const matchedTopTerms = topTerms.filter((term) => resumeLower.includes(term)).length;
  const jdCoverage = topTerms.length ? matchedTopTerms / topTerms.length : 0;

  const sectionChecks = [
    /experience|work history/.test(resumeLower),
    /skills|technical skills/.test(resumeLower),
    /education/.test(resumeLower),
    /project/.test(resumeLower)
  ];
  const sectionScore = sectionChecks.filter(Boolean).length / sectionChecks.length;

  const wordCount = tokenize(resumePlain).length;
  const lengthScore = wordCount >= 220 && wordCount <= 900
    ? 1
    : (wordCount >= 150 && wordCount <= 1100 ? 0.75 : 0.5);

  const deterministicScore =
    (keywordCoverage * 50) +
    (jdCoverage * 30) +
    (sectionScore * 10) +
    (lengthScore * 10);

  const hasProviderScore = Number.isFinite(providerAtsScore);
  const blendedScore = hasProviderScore
    ? (deterministicScore * 0.6) + (providerAtsScore * 0.4)
    : deterministicScore;

  return Math.max(0, Math.min(100, Math.round(blendedScore)));
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
  const geminiKey = process.env.GEMINI_API_KEY;
  const legacyKey = process.env.LONGCHAT_API_KEY || process.env.ANTHROPIC_API_KEY;

  if (geminiKey) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${geminiKey}`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: maxTokens,
          temperature: 0.2
        }
      })
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('Gemini API error:', JSON.stringify(data));
      throw new Error(data?.error?.message || `Gemini API error: ${res.status}`);
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      console.error('Gemini API response missing text:', JSON.stringify(data));
      throw new Error('No content returned from Gemini API');
    }

    return text.trim();
  }

  if (legacyKey) {
    const baseUrl = process.env.AI_BASE_URL || 'https://api.longcat.chat/anthropic';
    const model = process.env.AI_MODEL || 'LongCat-Flash-Lite';
    const res = await fetch(`${baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': legacyKey,
        'Authorization': `Bearer ${legacyKey}`,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: model,
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

  throw new Error('No AI API key configured. Please set GEMINI_API_KEY in environment variables.');
}

async function convertToLatex(resumeText) {
  const prompt = `You are a senior ATS resume writer, technical recruiter, and LaTeX resume formatting expert.

Your ONLY task is to transform the candidate's SOURCE RESUME into a professional, concise, ATS-friendly, job-targeted, strictly one-page LaTeX resume using the mandatory template and rules below.

The final response MUST contain ONLY valid raw LaTeX.

1. PRIMARY OBJECTIVE

Create a resume that:
- Is optimized for Applicant Tracking Systems (ATS).
- Uses ONLY factual information supported by the SOURCE RESUME.
- Prioritizes the candidate's most relevant skills, experience, projects, and achievements.
- Uses concise, professional, recruiter-friendly language.
- Targets exactly ONE compiled page.
- Remains readable and professional without excessive formatting compression.
- Compiles successfully with standard pdfLaTeX.

Never sacrifice factual accuracy for ATS optimization.

2. STRICT FACTUAL ACCURACY — HIGHEST PRIORITY

Use ONLY information explicitly supported by the SOURCE RESUME.
NEVER invent, assume, infer, or fabricate: skills, languages, frameworks, tools, databases, cloud services, job responsibilities, project functionality, achievements, metrics, percentages, companies, job titles, employment dates, degrees, universities, GPA, certifications, awards, links, or contact information.

You MAY: rewrite existing information, correct grammar, improve clarity, shorten verbose descriptions, convert paragraphs into strong resume bullets, replace weak verbs with stronger action verbs when meaning remains unchanged.

3. WRITING STYLE

Write concise, professional resume language.
Prefer: Action Verb + Technical Contribution + Result/Impact

Strong action verbs: Developed, Built, Implemented, Designed, Optimized, Integrated, Automated, Engineered, Deployed, Configured, Analyzed, Reduced, Enhanced.

Avoid: "Worked on", "Responsible for", "Helped with", "Involved in".
Do NOT use first-person pronouns, excessive adjectives, or generic buzzword claims.

4. BULLET POINT RULES

Experience: Maximum 3 bullets per entry. Prefer 2-3 high-value bullets. Approximately 12-18 words per bullet. Start with a strong action verb.
Projects: Maximum 3 bullets. Prefer 1-2 when sufficient. Explain implementation, functionality, or impact.
Do NOT create bullets merely to fill space.

5. SUMMARY RULES

Include Summary ONLY if the source resume contains a summary OR there is enough factual information. Maximum 2-3 short lines. No generic objective statements. No unsupported years of experience or job titles. If a useful factual summary cannot be created, omit the Summary section entirely.

6. TECHNICAL SKILLS RULES

Group skills into logical ATS-readable categories. Use only categories with actual content. Prefer 4-5 compact labeled rows. Include ONLY skills supported by the SOURCE RESUME. Do not duplicate a skill across categories. Do not add proficiency ratings, progress bars, or graphical skill indicators.

Possible categories: Languages, Frameworks & Libraries, Databases, Tools & Platforms, Cloud & DevOps, Data Science & ML.

7. ONE-PAGE ENFORCEMENT

The resume MUST target exactly ONE compiled page.
- Keep descriptions concise. Remove redundancy. Max 3 bullets per experience/project.
- Do not add unnecessary vertical spacing, extra sections, or filler content.
- NEVER shrink font below 10pt, use negative spacing aggressively, or change the supplied margins.
- If all source content cannot fit on one page, prioritize the most job-relevant and recent content.

8. SECTION HANDLING

Standard preferred sections: SUMMARY, TECHNICAL SKILLS, EXPERIENCE, PROJECTS, EDUCATION, CERTIFICATIONS.
Only include a section when corresponding information exists. DO NOT create empty sections.
DO NOT output placeholder text such as N/A, Add Here, XXXXX, linkedin.com/in/..., github.com/...

9. HEADER RULES

Full Name centered, large, bold. Contact information centered on the next line with \\quad|\\quad between available fields. Use ONLY fields present in the SOURCE RESUME. Do not invent missing links.

10. DATE AND ALIGNMENT RULES

For EVERY experience entry:
\\textbf{Job Title} \\hfill \\textit{Date Range}\\\\
\\textit{Company Name, Location}

For EVERY project:
\\textbf{Project Name} \\hfill \\textit{Date}\\\\
\\textit{Tech Stack: ...}

For EVERY education entry:
\\textbf{Degree Name} \\hfill \\textit{Date Range}\\\\
\\textit{University Name, Location} \\hfill GPA/CGPA if available

Never put the date on a separate line. Never invent missing dates.

11. LATEX SAFETY

Escape special LaTeX characters in candidate-provided text: & -> \\&, % -> \\%, $ -> \\$, # -> \\#, _ -> \\_
Do NOT escape valid LaTeX commands. Ensure every opening brace has a closing brace. Every \\begin has a matching \\end.

12. ATS DESIGN RESTRICTIONS

DO NOT use: colors, colored rules, icons, images, text boxes, sidebars, tables, two-column layouts, headers/footers, page numbers, graphical rating systems, custom font packages, TikZ, FontAwesome.
USE: white background, black text, standard LaTeX fonts, standard bullets, thin section divider rules.

13. MANDATORY LATEX TEMPLATE

Use EXACTLY this preamble. DO NOT change document class, font size, geometry margins, section styling, bullet styling, or baseline stretch:

\\documentclass[10pt]{article}
\\usepackage[T1]{fontenc}
\\usepackage[utf8]{inputenc}
\\usepackage[top=0.4in, bottom=0.4in, left=0.5in, right=0.5in]{geometry}
\\usepackage{enumitem}
\\usepackage{hyperref}
\\usepackage{titlesec}

\\pagestyle{empty}
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{0pt}

\\titleformat{\\section}{\\bfseries\\large}{}{0em}{}[\\vspace{-2pt}\\rule{\\linewidth}{0.5pt}\\vspace{-6pt}]
\\titlespacing{\\section}{0pt}{6pt}{4pt}

\\setlist[itemize]{leftmargin=1.2em, itemsep=0pt, topsep=1pt, parsep=0pt, partopsep=0pt}

\\renewcommand{\\baselinestretch}{0.96}

\\begin{document}

{\\centering
{\\LARGE \\textbf{FULL NAME}}\\\\[2pt]
CONTACT INFO WITH \\quad|\\quad SEPARATORS\\\\
\\par}

\\vspace{4pt}

\\section*{SUMMARY}
PROFESSIONAL SUMMARY

\\section*{TECHNICAL SKILLS}
\\begin{itemize}
\\item \\textbf{CATEGORY:} SKILLS
\\end{itemize}

\\section*{EXPERIENCE}
\\textbf{JOB TITLE} \\hfill \\textit{DATE RANGE}\\\\
\\textit{COMPANY, LOCATION}
\\begin{itemize}
\\item ACHIEVEMENT
\\end{itemize}

\\section*{PROJECTS}
\\textbf{PROJECT NAME} \\hfill \\textit{DATE}\\\\
\\textit{Tech Stack: TECHNOLOGIES}
\\begin{itemize}
\\item CONTRIBUTION
\\end{itemize}

\\section*{EDUCATION}
\\textbf{DEGREE} \\hfill \\textit{DATE RANGE}\\\\
\\textit{UNIVERSITY, LOCATION} \\hfill GPA IF AVAILABLE

\\section*{CERTIFICATIONS}
\\begin{itemize}
\\item CERTIFICATION -- ISSUER (YEAR)
\\end{itemize}

\\end{document}

14. ABSOLUTE OUTPUT CONTRACT

Your response MUST:
1. Begin EXACTLY with: \\documentclass
2. End EXACTLY with: \\end{document}
3. Contain ONLY raw LaTeX.
4. NOT contain Markdown code fences, explanations, comments about changes, JSON, XML, analysis, or placeholder values.

Failure to follow the output contract means the response is invalid.

INPUT DATA

SOURCE RESUME:
<<<RESUME_START>>>
${resumeText}
<<<RESUME_END>>>

JOB DESCRIPTION:
<<<JOB_DESCRIPTION_START>>>
Not provided — optimize for the candidate's apparent professional domain using only information in the SOURCE RESUME.
<<<JOB_DESCRIPTION_END>>>`;

  let latex = await callAI(prompt, 8000);
  return ensureNoPageNumber(sanitizeLatexDocument(latex));
}

async function optimizeLatex(latexCode, jobDescription) {
  const prompt = `You are a senior ATS resume writer, technical recruiter, and LaTeX resume formatting expert.

Your ONLY task is to transform the candidate's SOURCE RESUME (provided as LaTeX) into a professional, concise, ATS-friendly, job-targeted, strictly one-page LaTeX resume optimized for the provided JOB DESCRIPTION.

1. PRIMARY OBJECTIVE

Create a resume that:
- Is fully optimized for the provided JOB DESCRIPTION.
- Uses ONLY factual information supported by the SOURCE RESUME.
- Prioritizes the candidate's most relevant skills, experience, projects, and achievements for this specific job.
- Uses concise, professional, recruiter-friendly language.
- Targets exactly ONE compiled page.
- Compiles successfully with standard pdfLaTeX.

Never sacrifice factual accuracy for ATS optimization.

2. STRICT FACTUAL ACCURACY — HIGHEST PRIORITY

Use ONLY information explicitly supported by the SOURCE RESUME.
NEVER invent, assume, infer, or fabricate: skills, languages, frameworks, tools, databases, cloud services, job responsibilities, project functionality, achievements, metrics, percentages, companies, job titles, employment dates, degrees, universities, GPA, certifications, awards, links, or contact information.

You MAY: rewrite existing information, correct grammar, improve clarity, shorten verbose descriptions, replace weak verbs with stronger action verbs, reorder words for better ATS matching, use JD terminology ONLY when the SOURCE RESUME clearly supports the same concept.

3. ATS OPTIMIZATION

Identify important JD keywords: technical skills, frameworks, databases, tools, engineering concepts, role-specific terminology.
Compare against SOURCE RESUME. Naturally include ONLY keywords that are BOTH relevant to the JD AND supported by the source resume.
Do NOT keyword-stuff. Do NOT repeat keywords unnaturally. Never add unsupported keywords.

4. WRITING STYLE

Prefer: Action Verb + Technical Contribution + Result/Impact
Strong verbs: Developed, Built, Implemented, Designed, Optimized, Integrated, Automated, Engineered, Deployed, Analyzed, Reduced, Enhanced.
Avoid: "Worked on", "Responsible for", "Helped with". Do NOT use first-person pronouns.

5. BULLET RULES

Experience: Max 3 bullets per entry, ~12-18 words each, start with action verb.
Projects: Max 3 bullets, prefer 1-2. No filler bullets.

6. ONE-PAGE ENFORCEMENT

Must compile to exactly ONE page. Max 3 bullets per entry. Keep Summary to 2-3 lines. Keep Skills compact. No unnecessary sections or filler.
NEVER shrink font below 10pt or change supplied margins.

7. SECTION HANDLING

Standard sections: SUMMARY, TECHNICAL SKILLS, EXPERIENCE, PROJECTS, EDUCATION, CERTIFICATIONS.
Only include sections with actual content. DO NOT create empty sections. DO NOT output placeholder text.

8. DATE AND ALIGNMENT RULES

\\textbf{Job Title} \\hfill \\textit{Date Range}\\\\
\\textit{Company Name, Location}

\\textbf{Project Name} \\hfill \\textit{Date}\\\\
\\textit{Tech Stack: ...}

\\textbf{Degree} \\hfill \\textit{Date Range}\\\\
\\textit{University, Location} \\hfill GPA if available

Never put date on a separate line. Never invent missing dates.

9. LATEX SAFETY

Escape special chars in candidate text: & -> \\&, % -> \\%, $ -> \\$, # -> \\#, _ -> \\_
Do NOT escape valid LaTeX commands. Ensure balanced braces and matched environments.

10. ATS DESIGN RESTRICTIONS

DO NOT use: colors, icons, images, text boxes, tables, two-column layouts, page numbers, custom fonts, TikZ, FontAwesome.
USE: white background, black text, standard LaTeX fonts, standard bullets, thin section rules.

11. MANDATORY LATEX TEMPLATE — DO NOT CHANGE PREAMBLE

\\documentclass[10pt]{article}
\\usepackage[T1]{fontenc}
\\usepackage[utf8]{inputenc}
\\usepackage[top=0.4in, bottom=0.4in, left=0.5in, right=0.5in]{geometry}
\\usepackage{enumitem}
\\usepackage{hyperref}
\\usepackage{titlesec}

\\pagestyle{empty}
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{0pt}

\\titleformat{\\section}{\\bfseries\\large}{}{0em}{}[\\vspace{-2pt}\\rule{\\linewidth}{0.5pt}\\vspace{-6pt}]
\\titlespacing{\\section}{0pt}{6pt}{4pt}

\\setlist[itemize]{leftmargin=1.2em, itemsep=0pt, topsep=1pt, parsep=0pt, partopsep=0pt}

\\renewcommand{\\baselinestretch}{0.96}

12. ABSOLUTE OUTPUT CONTRACT

Respond using EXACTLY this format (nothing else before or after):

<LATEX>
[complete optimized LaTeX code from \\documentclass to \\end{document}]
</LATEX>
<KEYWORDS>keyword1, keyword2, keyword3, keyword4, keyword5</KEYWORDS>
<ATS_SCORE>85</ATS_SCORE>

The <LATEX> block must begin with \\documentclass and end with \\end{document}.
The <KEYWORDS> block: 4-8 most important JD keywords that are supported by and naturally included in the resume.
The <ATS_SCORE> block: integer 0-100 reflecting how well the optimized resume matches the JD.

INPUT DATA

SOURCE RESUME:
<<<RESUME_START>>>
${latexCode}
<<<RESUME_END>>>

JOB DESCRIPTION:
<<<JOB_DESCRIPTION_START>>>
${jobDescription}
<<<JOB_DESCRIPTION_END>>>`;


  const responseText = await callAI(prompt, 6000);

  // Extract LaTeX between tags
  const latexMatch = responseText.match(/<LATEX>([\s\S]*?)<\/LATEX>/);
  const keywordsMatch = responseText.match(/<KEYWORDS>([\s\S]*?)<\/KEYWORDS>/);
  const scoreMatch = responseText.match(/<ATS_SCORE>(\d+)<\/ATS_SCORE>/);
  const rawKeywords = keywordsMatch ? keywordsMatch[1].split(',').map(k => k.trim()).filter(Boolean) : [];
  const keywords = filterKeywordsFromJobDescription(rawKeywords, jobDescription);
  const providerAtsScore = scoreMatch ? Math.max(0, Math.min(100, parseInt(scoreMatch[1], 10))) : null;
  const originalTemplateLatex = sanitizeLatexDocument(latexCode);
  const aiGeneratedLatexRaw = latexMatch ? latexMatch[1].trim() : '';

  let optimizedLatex = originalTemplateLatex;

  // Prefer the model-generated ATS-friendly resume body when valid.
  if (aiGeneratedLatexRaw) {
    try {
      const aiGeneratedLatex = sanitizeLatexDocument(aiGeneratedLatexRaw);
      optimizedLatex = lockOriginalTheme(originalTemplateLatex, aiGeneratedLatex);
    } catch (err) {
      console.warn('Falling back to template-preserving optimization due to invalid AI LaTeX:', err.message);
    }
  }

  // Ensure validated JD keywords are present in ATS-relevant sections.
  optimizedLatex = injectKeywordsPreservingTemplate(optimizedLatex, keywords);
  optimizedLatex = sanitizeLatexDocument(ensureNoPageNumber(optimizedLatex));

  // Use calibrated ATS scoring with deterministic coverage and provider signal.
  const atsScore = computeRealAtsScore({ optimizedLatex, jobDescription, keywords, providerAtsScore });

  return { optimizedLatex, keywords, atsScore };
}

module.exports = {
  convertToLatex,
  optimizeLatex,
  sanitizeLatexDocument,
  applySinglePageTightening
};
