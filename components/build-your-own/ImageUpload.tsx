'use client'

import { useState, useRef, useEffect } from 'react'
import { Upload, Camera, X, Loader2, Check, AlertCircle, Sparkles } from 'lucide-react'

interface ExtractedOption {
  title: string
  description?: string
  confidence: 'high' | 'medium' | 'low'
  source_type: 'ai_extracted'
  metadata: Record<string, any>
}

interface ImageUploadProps {
  onOptionsExtracted: (options: ExtractedOption[]) => void
  disabled?: boolean
}

export default function ImageUpload({ onOptionsExtracted, disabled = false }: ImageUploadProps) {
  const [state, setState] = useState<{
    dragActive: boolean
    uploading: boolean
    analyzing: boolean
    previewUrl: string
    error: string
    success: boolean
  }>({
    dragActive: false,
    uploading: false,
    analyzing: false,
    previewUrl: '',
    error: '',
    success: false
  })
  
  const [isMobile, setIsMobile] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Detect if device is mobile using multiple methods
    const checkMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase()
      const isMobileUA = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent)
      const isSmallScreen = window.innerWidth <= 768
      
      // Only consider it mobile if it's actually a mobile device OR very small screen
      return isMobileUA || isSmallScreen
    }
    
    setIsMobile(checkMobile())
    
    // Also listen for resize events to update mobile state
    const handleResize = () => {
      setIsMobile(checkMobile())
    }
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleFiles = async (files: FileList) => {
    if (files.length === 0) return
    
    const file = files[0]
    if (!file.type.startsWith('image/')) {
      setState(prev => ({ ...prev, error: 'Please upload an image file' }))
      return
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      setState(prev => ({ ...prev, error: 'Image must be smaller than 10MB' }))
      return
    }

    setState(prev => ({ ...prev, error: '', success: false, uploading: true }))

    try {
      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setState(prev => ({ ...prev, previewUrl: e.target?.result as string }))
      }
      reader.readAsDataURL(file)

      // Convert to base64 for API
      const base64 = await fileToBase64(file)
      
      setState(prev => ({ ...prev, uploading: false, analyzing: true }))

      // Analyze image with OpenAI
      const response = await fetch('/api/analyze-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: base64,
          context: 'This image contains voting options or ideas from a workshop or brainstorming session'
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to analyze image')
      }

      const result = await response.json()
      
      if (!result.success || !result.options || result.options.length === 0) {
        throw new Error('No options could be extracted from this image')
      }

      onOptionsExtracted(result.options)
      setState(prev => ({ ...prev, success: true }))
      
      // Clear success message after 3 seconds
      setTimeout(() => setState(prev => ({ ...prev, success: false })), 3000)

    } catch (err) {
      setState(prev => ({ 
        ...prev, 
        error: err instanceof Error ? err.message : 'Failed to process image',
        previewUrl: ''
      }))
    } finally {
      setState(prev => ({ ...prev, uploading: false, analyzing: false }))
    }
  }

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = error => reject(error)
    })
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setState(prev => ({ ...prev, dragActive: true }))
    } else if (e.type === 'dragleave') {
      setState(prev => ({ ...prev, dragActive: false }))
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setState(prev => ({ ...prev, dragActive: false }))
    
    if (disabled) return
    
    const files = e.dataTransfer.files
    handleFiles(files)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files)
    }
  }

  const clearPreview = () => {
    setState(prev => ({ ...prev, previewUrl: '', error: '', success: false }))
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (cameraInputRef.current) cameraInputRef.current.value = ''
  }

  const isProcessing = state.uploading || state.analyzing

  return (
    <div className="space-y-4">
      
      {/* Single Interactive Area */}
      {isMobile ? (
        // Mobile: Just buttons, no drag & drop
        <div className="space-y-3">
          {state.previewUrl && (
            <div className="relative mb-4">
              <img 
                src={state.previewUrl} 
                alt="Preview" 
                className="max-h-48 mx-auto rounded-lg shadow-sm"
              />
              <button
                onClick={clearPreview}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {isProcessing ? (
            <div className="flex flex-col items-center py-8">
              <Loader2 className="w-8 h-8 text-electric-purple animate-spin mb-2" />
              <p className="text-sm font-medium text-white">
                {state.uploading ? 'Uploading image...' : 'Analyzing with AI...'}
              </p>
              <p className="text-xs text-white/70">
                {state.analyzing ? 'Extracting voting options from your image' : 'Please wait'}
              </p>
            </div>
          ) : state.success ? (
            <div className="flex flex-col items-center py-8">
              <Check className="w-8 h-8 text-green-400 mb-2" />
              <p className="text-sm font-medium text-green-400">Options extracted successfully!</p>
            </div>
          ) : (
            <div className="flex flex-col space-y-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || isProcessing}
                className="w-full flex items-center justify-center px-4 py-4 bg-white/10 backdrop-blur-sm rounded-2xl text-sm font-medium text-white hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all border border-white/20"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Image
              </button>
              
              <button
                onClick={() => cameraInputRef.current?.click()}
                disabled={disabled || isProcessing}
                className="w-full flex items-center justify-center px-4 py-4 bg-white/10 backdrop-blur-sm rounded-2xl text-sm font-medium text-white hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all border border-white/20"
              >
                <Camera className="w-4 h-4 mr-2" />
                Take Photo
              </button>
            </div>
          )}

          {state.error && (
            <div className="mt-3 flex items-center justify-center text-red-400">
              <AlertCircle className="w-4 h-4 mr-1" />
              <span className="text-sm">{state.error}</span>
            </div>
          )}
        </div>
      ) : (
        // Desktop: Drag & drop area with upload button
        <div
          className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-200 cursor-pointer ${
            state.dragActive 
              ? 'border-electric-purple bg-electric-purple/10 scale-105' 
              : state.error 
              ? 'border-red-400 bg-red-400/10' 
              : state.success
              ? 'border-green-400 bg-green-400/10'
              : 'border-white/30 bg-white/5 hover:border-electric-purple hover:bg-electric-purple/5'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => !disabled && !isProcessing && fileInputRef.current?.click()}
        >
          
          {state.previewUrl && (
            <div className="relative mb-4">
              <img 
                src={state.previewUrl} 
                alt="Preview" 
                className="max-h-48 mx-auto rounded-lg shadow-sm"
              />
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  clearPreview()
                }}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="space-y-3">
            {isProcessing ? (
              <div className="flex flex-col items-center">
                <Loader2 className="w-8 h-8 text-electric-purple animate-spin mb-2" />
                <p className="text-sm font-medium text-white">
                  {state.uploading ? 'Uploading image...' : 'Analyzing with AI...'}
                </p>
                <p className="text-xs text-white/70">
                  {state.analyzing ? 'Extracting voting options from your image' : 'Please wait'}
                </p>
              </div>
            ) : state.success ? (
              <div className="flex flex-col items-center">
                <Check className="w-8 h-8 text-green-400 mb-2" />
                <p className="text-sm font-medium text-green-400">Options extracted successfully!</p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <Sparkles className="w-12 h-12 text-white/50 mb-4" />
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    fileInputRef.current?.click()
                  }}
                  disabled={disabled || isProcessing}
                  className="bg-gradient-electric text-white px-6 py-3 rounded-xl text-sm font-medium hover:scale-105 disabled:opacity-50 transition-all mb-3"
                >
                  <Upload className="w-4 h-4 inline mr-2" />
                  Upload Image
                </button>
                <p className="text-xs text-white/70">
                  or drag & drop an image here • JPG, PNG up to 10MB
                </p>
              </div>
            )}
          </div>

          {state.error && (
            <div className="mt-3 flex items-center justify-center text-red-400">
              <AlertCircle className="w-4 h-4 mr-1" />
              <span className="text-sm">{state.error}</span>
            </div>
          )}
        </div>
      )}

      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Help Text */}
      <div className="text-xs text-white/50 space-y-1">
        <p className="font-medium text-white/70">Best results with:</p>
        <ul className="list-disc list-inside space-y-0.5 text-xs">
          <li>Clear, well-lit photos of whiteboards or sticky notes</li>
          <li>High contrast text (dark text on light background)</li>
          <li>Multiple distinct options or ideas visible</li>
          <li>Minimal background clutter</li>
        </ul>
      </div>
    </div>
  )
}
