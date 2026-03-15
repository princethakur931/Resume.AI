import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload, FileText, CheckCircle2, AlertCircle, X,
  CloudUpload, File, Loader2
} from 'lucide-react'
import api from '../../services/api'

export default function UploadPanel({ onUploaded }) {
  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleFile = async (f) => {
    setFile(f)
    setError('')
    setSuccess(false)
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('resume', f)
      await api.post('/resume/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setSuccess(true)
      onUploaded()
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const onDrop = useCallback(e => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [])

  const onInputChange = e => {
    const f = e.target.files[0]
    if (f) handleFile(f)
  }

  const reset = () => { setFile(null); setSuccess(false); setError('') }

  return (
    <div className="space-y-3">
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200 cursor-pointer group
          ${dragging ? 'border-brand-500 bg-brand-500/10 scale-[1.01]' : 'border-white/10 hover:border-brand-500/40 hover:bg-white/[0.02]'}
          ${success ? 'border-emerald-500/40 bg-emerald-500/5' : ''}
          ${error ? 'border-red-500/40 bg-red-500/5' : ''}`}
      >
        <input
          type="file"
          accept=".pdf,.doc,.docx,.txt"
          onChange={onInputChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={loading}
        />

        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Loader2 className="w-8 h-8 text-brand-400 animate-spin mx-auto mb-2" />
              <p className="text-sm text-slate-400">Converting to LaTeX...</p>
              <p className="text-xs text-slate-600 mt-1">AI is analyzing your resume layout</p>
            </motion.div>
          ) : success ? (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-emerald-400">Resume uploaded!</p>
              <p className="text-xs text-slate-500 mt-1">{file?.name}</p>
              <button onClick={e => { e.stopPropagation(); reset() }} className="mt-3 text-xs text-slate-600 hover:text-slate-400 flex items-center gap-1 mx-auto">
                <X className="w-3 h-3" /> Upload different file
              </button>
            </motion.div>
          ) : error ? (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
              <p className="text-sm text-red-400">{error}</p>
              <button onClick={e => { e.stopPropagation(); reset() }} className="mt-3 text-xs text-slate-500 hover:text-slate-300 underline">
                Try again
              </button>
            </motion.div>
          ) : (
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className={`w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center transition-colors
                ${dragging ? 'bg-brand-500/20' : 'bg-white/[0.04] group-hover:bg-brand-500/10'}`}>
                <CloudUpload className={`w-6 h-6 transition-colors ${dragging ? 'text-brand-400' : 'text-slate-500 group-hover:text-brand-400'}`} />
              </div>
              <p className="text-sm font-medium text-slate-300">
                {dragging ? 'Drop your resume here' : 'Drag & drop your resume'}
              </p>
              <p className="text-xs text-slate-600 mt-1">PDF, DOCX, or TXT • Max 10MB</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Supported formats */}
      <div className="flex gap-2">
        {['PDF', 'DOCX', 'TXT'].map(fmt => (
          <span key={fmt} className="text-xs px-2 py-0.5 rounded bg-white/[0.04] text-slate-600 border border-white/[0.06]">
            {fmt}
          </span>
        ))}
      </div>
    </div>
  )
}
