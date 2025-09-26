'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft, 
  Plus, 
  X, 
  Sparkles, 
  Type,
  Camera,
  GripVertical,
  Edit3,
  Loader2,
  Play,
  Wrench
} from 'lucide-react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import ImageUpload from '@/components/build-your-own/ImageUpload'

interface CustomOption {
  id: string
  title: string
  description?: string
  source_type: 'manual' | 'ai_extracted' | 'ai_generated'
  metadata?: Record<string, any>
}

export default function BuildYourOwnPage() {
  const router = useRouter()
  
  // Check if multi-person sessions are enabled
  const isMultiPersonEnabled = process.env.NEXT_PUBLIC_ENABLE_MULTI_PERSON === 'true'
  
  // Form state
  const [sessionTitle, setSessionTitle] = useState('')
  const [requireNames, setRequireNames] = useState(false)
  const [inviteCount, setInviteCount] = useState<number>(2)
  const [options, setOptions] = useState<CustomOption[]>([])
  
  // UI state
  const [isCreating, setIsCreating] = useState(false)
  const [activeTab, setActiveTab] = useState<'manual' | 'ai-generate'>('manual')
  const [isReorderMode, setIsReorderMode] = useState(false)
  const [editingOptionId, setEditingOptionId] = useState<string | null>(null)
  
  // Manual entry state
  const [optionTitle, setOptionTitle] = useState('')
  const [optionDescription, setOptionDescription] = useState('')
  
  // AI text generation state
  const [aiDescription, setAiDescription] = useState('')
  const [aiOptionCount, setAiOptionCount] = useState(8)
  const [isGenerating, setIsGenerating] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const addManualOption = () => {
    if (!optionTitle.trim()) return

    const newOption: CustomOption = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      title: optionTitle.trim(),
      description: optionDescription.trim() || undefined,
      source_type: 'manual'
    }

    setOptions([...options, newOption])
    setOptionTitle('')
    setOptionDescription('')
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      addManualOption()
    }
  }

  const removeOption = (id: string) => {
    setOptions(options.filter(option => option.id !== id))
    setEditingOptionId(null)
  }

  const updateOption = (id: string, updates: Partial<CustomOption>) => {
    setOptions(options.map(option => 
      option.id === id ? { ...option, ...updates } : option
    ))
  }

  const handleDragEnd = (event: any) => {
    const { active, over } = event

    if (active.id !== over.id) {
      setOptions((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id)
        const newIndex = items.findIndex(item => item.id === over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  const handleImageOptionsExtracted = (extractedOptions: any[]) => {
    const newOptions: CustomOption[] = extractedOptions.map((extracted) => ({
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      title: extracted.title,
      description: extracted.description,
      source_type: 'ai_extracted' as const,
      metadata: extracted.metadata
    }))
    
    // Replace all existing options with new ones
    setOptions(newOptions)
  }

  const generateAiOptions = async () => {
    if (!aiDescription.trim()) return
    
    setIsGenerating(true)
    try {
      const response = await fetch('/api/generate-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: aiDescription.trim(),
          count: aiOptionCount,
          sessionTitle: sessionTitle.trim()
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate options')
      }

      const result = await response.json()
      
      if (!result.success || !result.options || result.options.length === 0) {
        throw new Error('No options could be generated from this description')
      }

      const newOptions: CustomOption[] = result.options.map((generated: any) => ({
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        title: generated.title,
        description: generated.description,
        source_type: 'ai_generated' as const,
        metadata: generated.metadata
      }))
      
      // Replace all existing options with new ones
      setOptions(newOptions)
      setAiDescription('')
      
    } catch (err) {
      console.error('Error generating options:', err)
      // You might want to show a toast notification here
    } finally {
      setIsGenerating(false)
    }
  }

  const createSession = async () => {
    if (!sessionTitle.trim() || options.length < 2) return

    setIsCreating(true)
    
    try {
      const response = await fetch('/api/streaming-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category: 'build-your-own',
          sessionTitle: sessionTitle.trim(),
          requireNames,
          inviteCount,
          customOptions: options.map(opt => ({
            title: opt.title,
            description: opt.description,
            source_type: opt.source_type,
            metadata: opt.metadata || {}
          }))
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create session')
      }

      const result = await response.json()
      
      // Redirect to session page
      router.push(`/session/${result.sessionId}?t=${result.shareToken}`)
      
    } catch (error) {
      console.error('Error creating session:', error)
      // You might want to show a toast notification here
    } finally {
      setIsCreating(false)
    }
  }

  const canStartSession = () => {
    return sessionTitle.trim() && options.length >= 2
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-primary overflow-hidden" style={{ height: '100dvh' }}>
      {/* Header - Fixed */}
      <div className="flex justify-between items-center p-4 flex-shrink-0 bg-gradient-primary backdrop-blur border-b border-white/10 relative z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/')}
            className="text-white/70 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 
              className="text-2xl font-outfit font-black leading-tight logo-chunky cursor-pointer hover:scale-105 transition-transform"
              onClick={() => router.push('/')}
            >
              <div>
                <span className="gradient-text">CHOOSING </span>
                <span className="text-white">ANYTHING </span>
                <span className="gradient-text">SUCKS</span>
              </div>
            </h1>
            <p className="text-white/70 text-sm font-semibold">
              Create your own options and we'll help you decide
            </p>
          </div>
        </div>
        <div className="p-2 rounded-xl">
          <Wrench className="h-6 w-6 text-white/70" />
        </div>
      </div>
      
      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-4 space-y-6">
          {/* Session Title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10"
          >
            <h2 className="text-lg font-bold text-white mb-4">What are you trying to decide?</h2>
            <input
              type="text"
              value={sessionTitle}
              onChange={(e) => setSessionTitle(e.target.value)}
              placeholder="e.g., Who's the most superior superhero?"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-electric-purple focus:border-transparent"
            />
            
            {isMultiPersonEnabled && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    How many people?
                  </label>
                  <select
                    value={inviteCount}
                    onChange={(e) => setInviteCount(parseInt(e.target.value))}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-electric-purple focus:border-transparent"
                  >
                    {[2, 3, 4, 5, 6].map(num => (
                      <option key={num} value={num} className="bg-gray-800">
                        {num} people
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={requireNames}
                      onChange={(e) => setRequireNames(e.target.checked)}
                      className="w-4 h-4 text-electric-purple bg-white/10 border-white/20 rounded focus:ring-electric-purple focus:ring-2"
                    />
                    <span className="text-sm text-white">Require names</span>
                  </label>
                </div>
              </div>
            )}
          </motion.div>

          {/* Add Options */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10"
          >
            <h2 className="text-lg font-bold text-white mb-4">Add Options</h2>
            
            {/* Tab Navigation */}
            <div className="flex space-x-1 mb-6 bg-white/5 rounded-xl p-1">
              <button
                onClick={() => setActiveTab('manual')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'manual'
                    ? 'bg-gradient-electric text-white'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <Type className="w-4 h-4" />
                Manual
              </button>
              <button
                onClick={() => setActiveTab('ai-generate')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'ai-generate'
                    ? 'bg-gradient-electric text-white'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                AI Generate
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'manual' && (
              <div className="space-y-4">
                <input
                  type="text"
                  value={optionTitle}
                  onChange={(e) => setOptionTitle(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type option and press Enter..."
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-electric-purple focus:border-transparent"
                  autoFocus
                />
                {optionTitle && (
                  <textarea
                    value={optionDescription}
                    onChange={(e) => setOptionDescription(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Optional description (press Enter to add)"
                    rows={2}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-electric-purple focus:border-transparent resize-none"
                  />
                )}
                <div className="text-xs text-white/50 hidden sm:block">
                  Press Enter to add • Shift+Enter for new line
                </div>
              </div>
            )}

            {activeTab === 'ai-generate' && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <textarea
                    value={aiDescription}
                    onChange={(e) => setAiDescription(e.target.value)}
                    placeholder="Describe what you're trying to decide... (e.g., 'Superheroes from the Marvel Cinematic Universe')"
                    rows={3}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-electric-purple focus:border-transparent resize-none"
                  />
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-white">Options:</label>
                      <select
                        value={aiOptionCount}
                        onChange={(e) => setAiOptionCount(parseInt(e.target.value))}
                        className="px-3 py-1 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-electric-purple focus:border-transparent"
                      >
                        {[4, 6, 8, 10, 12, 15, 20].map(num => (
                          <option key={num} value={num} className="bg-gray-800">
                            {num}
                          </option>
                        ))}
                      </select>
                    </div>
                  <button
                    onClick={generateAiOptions}
                    disabled={!aiDescription.trim() || !sessionTitle.trim() || isGenerating}
                    className="flex items-center gap-2 bg-gradient-electric text-white px-4 py-2 rounded-xl text-sm font-medium hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all"
                  >
                      {isGenerating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Generate Options
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* OR Divider */}
                <div className="flex items-center gap-4">
                  <div className="flex-1 h-px bg-white/20"></div>
                  <span className="text-white/70 text-sm font-medium">OR</span>
                  <div className="flex-1 h-px bg-white/20"></div>
                </div>

                {/* Photo Upload */}
                <ImageUpload 
                  onOptionsExtracted={handleImageOptionsExtracted}
                  disabled={isCreating || !sessionTitle.trim()}
                  sessionTitle={sessionTitle.trim()}
                />
              </div>
            )}
          </motion.div>

          {/* Options Preview */}
          {options.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white">
                  Your Options ({options.length})
                </h2>
                {options.length > 1 && (
                  <button
                    onClick={() => setIsReorderMode(!isReorderMode)}
                    className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs transition-all ${
                      isReorderMode 
                        ? 'bg-gradient-electric text-white' 
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    <GripVertical className="w-3 h-3" />
                    {isReorderMode ? 'Done' : 'Reorder'}
                  </button>
                )}
              </div>

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={options.map(o => o.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {options.map((option, index) => (
                      <SortableOption
                        key={option.id}
                        option={option}
                        index={index}
                        isReorderMode={isReorderMode}
                        isEditing={editingOptionId === option.id}
                        onRemove={removeOption}
                        onEdit={setEditingOptionId}
                        onUpdate={updateOption}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
              
              {options.length < 2 && (
                <div className="text-sm text-white/50 italic text-center py-2">
                  Add at least 2 options to create your session
                </div>
              )}
            </motion.div>
          )}

          {/* Start Button */}
          <motion.div 
            className="space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <button
              onClick={createSession}
              disabled={!canStartSession() || isCreating}
              className={`
                w-full py-4 rounded-2xl font-bold text-xl transition-all duration-300 transform
                flex items-center justify-center gap-3
                ${canStartSession() && !isCreating
                  ? 'bg-gradient-pink text-white shadow-lg hover:scale-105 active:scale-95' 
                  : 'bg-white/20 text-white/50 cursor-not-allowed'
                }
              `}
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-6 w-6 animate-spin" />
                  Creating Session...
                </>
              ) : (
                <>
                  <Play className="h-6 w-6" />
                  Start Swipe Session
                </>
              )}
            </button>

            {!canStartSession() && (
              <p className="text-white/60 text-sm text-center">
                Add a title and at least 2 options to start your session
              </p>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  )
}

// Sortable Option Component
function SortableOption({ 
  option, 
  index, 
  isReorderMode, 
  isEditing,
  onRemove, 
  onEdit,
  onUpdate
}: {
  option: CustomOption
  index: number
  isReorderMode: boolean
  isEditing: boolean
  onRemove: (id: string) => void
  onEdit: (id: string | null) => void
  onUpdate: (id: string, updates: Partial<CustomOption>) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: option.id, disabled: !isReorderMode })

  const [editTitle, setEditTitle] = useState(option.title)
  const [editDescription, setEditDescription] = useState(option.description || '')

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const saveEdit = () => {
    onUpdate(option.id, {
      title: editTitle.trim(),
      description: editDescription.trim() || undefined
    })
    onEdit(null)
  }

  const cancelEdit = () => {
    setEditTitle(option.title)
    setEditDescription(option.description || '')
    onEdit(null)
  }

  const getSourceIcon = () => {
    switch (option.source_type) {
      case 'ai_extracted':
        return <Camera className="w-3 h-3" />
      case 'ai_generated':
        return <Sparkles className="w-3 h-3" />
      default:
        return <Type className="w-3 h-3" />
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white/10 border border-white/20 rounded-xl p-4 ${
        isDragging ? 'shadow-lg' : ''
      } ${isReorderMode ? 'cursor-grab' : ''}`}
      {...(isReorderMode ? { ...attributes, ...listeners } : {})}
    >
      {isEditing ? (
        <div className="space-y-3">
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-electric-purple focus:border-transparent"
            autoFocus
          />
          <textarea
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            placeholder="Optional description"
            rows={2}
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-electric-purple focus:border-transparent resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={saveEdit}
              className="bg-green-500 text-white px-3 py-1 rounded-lg text-sm hover:bg-green-600 transition-colors"
            >
              Save
            </button>
            <button
              onClick={cancelEdit}
              className="bg-gray-500 text-white px-3 py-1 rounded-lg text-sm hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3">
          {isReorderMode && (
            <div className="flex-shrink-0 mt-1">
              <GripVertical className="w-4 h-4 text-white/50" />
            </div>
          )}
          
          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-medium text-white">
            {getSourceIcon()}
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-white truncate">{option.title}</h4>
            {option.description && (
              <p className="text-xs text-white/70 mt-1 line-clamp-2">{option.description}</p>
            )}
            {option.source_type !== 'manual' && (
              <span className="inline-block text-xs bg-white/20 text-white/80 px-2 py-0.5 rounded-full mt-1">
                {option.source_type === 'ai_extracted' ? 'From Photo' : 'AI Generated'}
              </span>
            )}
          </div>

          <div className="flex gap-1">
            {!isReorderMode && (
              <button
                onClick={() => onEdit(option.id)}
                className="p-1 text-white/50 hover:text-white hover:bg-white/10 rounded transition-colors"
              >
                <Edit3 className="w-3 h-3" />
              </button>
            )}
            <button
              onClick={() => onRemove(option.id)}
              className="p-1 text-white/50 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
