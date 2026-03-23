import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Download, ExternalLink, RefreshCw, ZoomIn, ZoomOut,
  FileText, AlertTriangle, CheckCircle2, BarChart3
} from 'lucide-react'

export default function PDFPreview({ pdfBase64, atsScore, keywords, status, isOptimizing, optimizedLatex, pdflatexAvailable, compileError }) {
  const [zoom, setZoom] = useState(1)
  const iframeRef = useRef(null)

  const dataUrl = pdfBase64 ? `data:application/pdf;base64,${pdfBase64}` : null

  const handleDownload = () => {
    if (!pdfBase64) return
    const link = document.createElement('a')
    link.href = dataUrl
    link.download = 'resume_optimized.pdf'
    link.click()
  }

  const handleOverleaf = () => {
    if (!optimizedLatex) return

    // Create a form that auto-submits to Overleaf with the .tex content
    const form = document.createElement('form')
    form.method = 'POST'
    form.action = 'https://www.overleaf.com/docs'
    form.target = '_blank'

    const input = document.createElement('input')
    input.type = 'hidden'
    input.name = 'snip'
    input.value = optimizedLatex

    const nameInput = document.createElement('input')
    nameInput.type = 'hidden'
    nameInput.name = 'snip_name'
    nameInput.value = 'resume_optimized.tex'

    form.appendChild(input)
    form.appendChild(nameInput)
    document.body.appendChild(form)
    form.submit()
    document.body.removeChild(form)
  }

  const scoreColor = atsScore >= 80 ? 'text-emerald-400' : atsScore >= 60 ? 'text-yellow-400' : 'text-red-400'
  const scoreBg = atsScore >= 80 ? 'bg-emerald-500/10 border-emerald-500/20' : atsScore >= 60 ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-red-500/10 border-red-500/20'

  return (
    <div className="h-full flex flex-col">
      {/* Preview header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-medium text-slate-400">PDF Preview</span>
          {status === 'compiled' && (
            <span className="flex items-center gap-1 text-xs text-emerald-400">
              <CheckCircle2 className="w-3 h-3" /> Compiled
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {dataUrl && (
            <>
              <button onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} className="p-1.5 rounded hover:bg-white/[0.06] text-slate-500 hover:text-slate-300 transition-colors">
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs text-slate-600 font-mono w-10 text-center">{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} className="p-1.5 rounded hover:bg-white/[0.06] text-slate-500 hover:text-slate-300 transition-colors">
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <div className="w-px h-4 bg-white/[0.08]" />
              <button onClick={handleDownload} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-brand-600/20 text-brand-300 hover:bg-brand-600/30 border border-brand-500/20 transition-colors font-medium">
                <Download className="w-3 h-3" /> Download PDF
              </button>
            </>
          )}
          {optimizedLatex && (
            <button onClick={handleOverleaf} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg glass text-slate-400 hover:text-white border border-white/10 hover:border-white/20 transition-colors">
              <ExternalLink className="w-3 h-3" /> Open in Overleaf
            </button>
          )}
        </div>
      </div>

      {/* ATS Score + Keywords bar */}
      {atsScore > 0 && (
        <motion.div
          className="px-4 py-3 border-b border-white/[0.06] shrink-0"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
        >
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${scoreBg}`}>
              <BarChart3 className={`w-3.5 h-3.5 ${scoreColor}`} />
              <span className="text-xs text-slate-500">ATS Score:</span>
              <span className={`text-sm font-bold ${scoreColor}`}>{atsScore}/100</span>
            </div>
            <div className="flex flex-wrap gap-1.5 flex-1 overflow-hidden">
              {keywords.slice(0, 8).map(kw => (
                <span key={kw} className="text-xs px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-300 border border-brand-500/15">
                  {kw}
                </span>
              ))}
              {keywords.length > 8 && (
                <span className="text-xs text-slate-600">+{keywords.length - 8} more</span>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* PDF View */}
      <div className="flex-1 overflow-hidden relative bg-slate-800/30">
        <AnimatePresence mode="wait">
          {dataUrl ? (
            <motion.div
              key="pdf"
              className="h-full w-full overflow-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="flex justify-center p-4 min-h-full">
                <div
                  className="bg-white shadow-2xl"
                  style={{
                    width: `${794 * zoom}px`,
                    minHeight: `${1123 * zoom}px`,
                    transform: 'none',
                    flexShrink: 0
                  }}
                >
                  <iframe
                    ref={iframeRef}
                    src={dataUrl}
                    className="pdf-frame"
                    style={{ width: `${794 * zoom}px`, height: `${1123 * zoom}px` }}
                    title="Resume PDF Preview"
                  />
                </div>
              </div>
            </motion.div>
          ) : isOptimizing ? (
            <motion.div key="optimizing" className="h-full flex items-center justify-center p-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="text-center w-full max-w-sm">
                <div className="startup-loader-logo-wrap mx-auto mb-2">
                  <img src="/Resume.AI.jpeg" alt="Resume.AI" className="startup-loader-logo" />
                  <div className="startup-loader-ring" aria-hidden="true" />
                </div>
                <h3 className="text-base font-semibold text-white mb-1">Optimizing Your Resume</h3>
                <p className="text-sm text-slate-500 mb-4">Analyzing ATS keywords and compiling your PDF...</p>
                <div className="startup-loader-bar mb-3">
                  <span className="startup-loader-bar-fill" />
                </div>
                <div className="inline-flex items-center gap-2 text-xs text-brand-300">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Please wait, this can take a few seconds
                </div>
              </div>
            </motion.div>
          ) : compileError && optimizedLatex ? (
            <motion.div key="compile-error" className="h-full flex items-center justify-center p-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="text-center max-w-md">
                <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-7 h-7 text-red-400" />
                </div>
                <h3 className="text-base font-semibold text-white mb-2">LaTeX Compilation Failed</h3>
                <p className="text-sm text-slate-500 mb-3 leading-relaxed">
                  Your resume has been optimized but pdflatex failed to compile it. You can still open it in Overleaf.
                </p>
                <div className="text-xs text-left bg-red-500/5 border border-red-500/10 rounded-lg p-3 mb-4 font-mono text-red-300 max-h-32 overflow-auto">
                  {compileError}
                </div>
                <button onClick={handleOverleaf} className="btn-primary w-full justify-center">
                  <ExternalLink className="w-4 h-4" />
                  Open in Overleaf
                </button>
              </div>
            </motion.div>
          ) : !pdflatexAvailable && optimizedLatex ? (
            <motion.div key="no-latex" className="h-full flex items-center justify-center p-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="text-center max-w-sm">
                <div className="w-14 h-14 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-7 h-7 text-yellow-400" />
                </div>
                <h3 className="text-base font-semibold text-white mb-2">pdflatex Not Installed</h3>
                <p className="text-sm text-slate-500 mb-4 leading-relaxed">
                  Your resume has been optimized! Since pdflatex is not installed on this server, use Overleaf to compile it for free.
                </p>
                {optimizedLatex && (
                  <button onClick={handleOverleaf} className="btn-primary w-full justify-center">
                    <ExternalLink className="w-4 h-4" />
                    Open in Overleaf
                  </button>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div key="empty" className="h-full flex items-center justify-center p-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-slate-700" />
                </div>
                <h3 className="text-sm font-medium text-slate-500 mb-1">No Preview Yet</h3>
                <p className="text-xs text-slate-700 max-w-48">Upload your resume and add a job description to see your optimized PDF here</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
