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

  // Resume bullets are often returned as markdown-like '--'. Convert them to itemize.
  latex = latex.replace(/(^|\n)--\s+/g, '$1\\item ');

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
1. Preserve the EXACT structure and content of the original resume
2. The LaTeX output MUST compile to exactly 1 page (use geometry package with tight margins)
3. Use a clean, ATS-friendly layout with proper sections
4. Use standard LaTeX packages only: geometry, fontenc, inputenc, hyperref, titlesec, enumitem, parskip
5. Do NOT use any exotic packages that may not be installed
6. Include \\documentclass[10pt]{article} with tight margins
7. Set margins: top=0.5in, bottom=0.5in, left=0.6in, right=0.6in
8. Each section: Education, Experience, Skills, Projects (only include if present in original)
9. Escape LaTeX-sensitive characters in plain text: &, %, $, #, _, {, }, ~, ^
10. Use proper list environments (itemize + \item). Never use raw markdown bullets like '-', '*', or '--'
11. Output ONLY raw LaTeX from \documentclass ... \end{document}; no explanation, no markdown code blocks, no XML tags

Resume Text:
${resumeText}`;

  let latex = await callAI(prompt, 4096);
  return sanitizeLatexDocument(latex);
}

async function optimizeLatex(latexCode, jobDescription) {
  const prompt = `You are an expert ATS resume optimizer. Optimize the given LaTeX resume for the job description.

TASK:
1. Extract the 10-15 most critical ATS keywords and skills from the job description
2. Integrate these keywords naturally into the correct resume sections (rephrase existing content, do NOT fabricate)
3. Output MUST compile to EXACTLY 1 PAGE
4. Keep all existing content — only enhance/rephrase, never remove
5. Add a Skills section if missing
6. Return a complete LaTeX document and preserve valid LaTeX syntax
7. Escape LaTeX-sensitive characters in plain text: &, %, $, #, _, {, }, ~, ^
8. Use proper LaTeX lists (itemize with \item). Do not output markdown bullets

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

  if (!latexMatch) throw new Error('AI did not return valid LaTeX. Please try again.');

  const optimizedLatex = sanitizeLatexDocument(latexMatch[1]);
  const keywords = keywordsMatch ? keywordsMatch[1].split(',').map(k => k.trim()).filter(Boolean) : [];
  const atsScore = scoreMatch ? Math.max(0, Math.min(100, parseInt(scoreMatch[1], 10))) : 75;

  return { optimizedLatex, keywords, atsScore };
}

module.exports = { convertToLatex, optimizeLatex };
