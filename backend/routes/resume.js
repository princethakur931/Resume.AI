const router = require('express').Router();
const multer = require('multer');
const authMiddleware = require('../middleware/auth');
const Resume = require('../models/Resume');
const aiService = require('../services/aiService');
const latexService = require('../services/latexService');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Check pdflatex availability
router.get('/status', authMiddleware, async (req, res) => {
  const pdflatexAvailable = await latexService.checkPdflatex();
  const resume = await Resume.findOne({ userId: req.user._id }).select('-pdfBase64 -latexCode -optimizedLatex');
  res.json({ pdflatexAvailable, resume });
});

// Upload resume file
router.post('/upload', authMiddleware, upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    let text = '';
    const mime = req.file.mimetype;

    if (mime === 'application/pdf') {
      const data = await pdfParse(req.file.buffer);
      text = data.text;
    } else if (
      mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mime === 'application/msword'
    ) {
      const result = await mammoth.extractRawText({ buffer: req.file.buffer });
      text = result.value;
    } else {
      text = req.file.buffer.toString('utf-8');
    }

    if (!text || text.trim().length < 50)
      return res.status(400).json({ message: 'Could not extract text from file. Please use PDF or DOCX.' });

    // Convert resume text to LaTeX
    const latexCode = await aiService.convertToLatex(text);

    await Resume.findOneAndUpdate(
      { userId: req.user._id },
      { userId: req.user._id, originalText: text, latexCode, status: 'idle', pdfBase64: null, optimizedLatex: null },
      { upsert: true, new: true }
    );

    res.json({ message: 'Resume uploaded and converted to LaTeX successfully' });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ message: err.message });
  }
});

// Optimize with job description and compile
router.post('/optimize', authMiddleware, async (req, res) => {
  try {
    const { jobDescription } = req.body;
    if (!jobDescription || jobDescription.trim().length < 20)
      return res.status(400).json({ message: 'Please provide a job description (min 20 characters)' });

    const resume = await Resume.findOne({ userId: req.user._id });
    if (!resume || !resume.latexCode)
      return res.status(400).json({ message: 'Please upload your resume first' });

    resume.status = 'processing';
    resume.jobDescription = jobDescription;
    await resume.save();

    // Extract keywords and optimize LaTeX
    const { optimizedLatex, keywords, atsScore } = await aiService.optimizeLatex(
      resume.latexCode,
      jobDescription
    );

    // Compile to PDF
    const pdflatexAvailable = await latexService.checkPdflatex();
    let pdfBase64 = null;
    let compileError = null;

    if (pdflatexAvailable) {
      try {
        console.log('✓ pdflatex found, attempting compilation...');
        let finalLatex = optimizedLatex;
        pdfBase64 = await latexService.compile(finalLatex);

        // Enforce single-page output with minimal fallback tightening.
        let parsed = await pdfParse(Buffer.from(pdfBase64, 'base64'));
        if (parsed?.numpages > 1) {
          console.log(`⚠ PDF is ${parsed.numpages} pages, applying tightening level 1...`);
          finalLatex = aiService.applySinglePageTightening(finalLatex, 1);
          pdfBase64 = await latexService.compile(finalLatex);
          parsed = await pdfParse(Buffer.from(pdfBase64, 'base64'));
        }

        if (parsed?.numpages > 1) {
          console.log(`⚠ PDF still ${parsed.numpages} pages, applying tightening level 2...`);
          finalLatex = aiService.applySinglePageTightening(finalLatex, 2);
          pdfBase64 = await latexService.compile(finalLatex);
          parsed = await pdfParse(Buffer.from(pdfBase64, 'base64'));
        }

        resume.optimizedLatex = finalLatex;
        console.log('✓ PDF compiled successfully, pages:', parsed?.numpages || 'unknown', 'size:', pdfBase64?.length || 0, 'bytes');
      } catch (compileErr) {
        console.error('✗ LaTeX compile error:', compileErr.message);
        compileError = compileErr.message;
      }
    } else {
      console.log('✗ pdflatex not available');
    }

    if (!resume.optimizedLatex) {
      resume.optimizedLatex = optimizedLatex;
    }
    resume.extractedKeywords = keywords;
    resume.atsScore = atsScore;
    resume.pdfBase64 = pdfBase64;
    resume.status = pdfBase64 ? 'compiled' : 'error';
    await resume.save();

    res.json({
      pdfBase64,
      keywords,
      atsScore,
      optimizedLatex,
      pdflatexAvailable,
      compileError,
      status: resume.status
    });
  } catch (err) {
    console.error('Optimize error:', err);
    await Resume.findOneAndUpdate({ userId: req.user._id }, { status: 'error' });
    res.status(500).json({ message: err.message });
  }
});

// Get compiled PDF
router.get('/pdf', authMiddleware, async (req, res) => {
  try {
    const resume = await Resume.findOne({ userId: req.user._id }).select('pdfBase64 atsScore extractedKeywords status optimizedLatex');
    if (!resume) return res.status(404).json({ message: 'No resume found' });
    res.json({
      pdfBase64: resume.pdfBase64,
      atsScore: resume.atsScore,
      keywords: resume.extractedKeywords,
      status: resume.status,
      optimizedLatex: resume.optimizedLatex
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
