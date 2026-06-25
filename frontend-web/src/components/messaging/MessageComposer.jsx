import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import AppIcon from '../ui/AppIcons'

const EmojiPicker = lazy(() => import('emoji-picker-react'))

export default function MessageComposer({
  value,
  onChange,
  onSubmit,
  placeholder,
  sendLabel,
  emojiLabel = 'Emoji',
  attachmentLabel = 'Ajouter une pièce jointe',
  attachmentRemoveLabel,
  attachmentLocalOnlyLabel,
  attachmentDropLabel,
  accent = 'indigo',
}) {
  const inputRef = useRef(null)
  const composerRef = useRef(null)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [draftFile, setDraftFile] = useState(null)
  const accentClasses = getAccentClasses(accent)
  const hasDraftFile = Boolean(draftFile)

  const previewUrl = useMemo(() => {
    if (!draftFile?.type?.startsWith('image/')) return ''
    return URL.createObjectURL(draftFile)
  }, [draftFile])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  useEffect(() => {
    if (!emojiOpen) return undefined

    const handlePointerDown = (event) => {
      if (!composerRef.current?.contains(event.target)) {
        setEmojiOpen(false)
      }
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setEmojiOpen(false)
        inputRef.current?.focus()
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [emojiOpen])

  const onDrop = useCallback((acceptedFiles) => {
    const [file] = acceptedFiles
    if (file) setDraftFile(file)
  }, [])

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    multiple: false,
    noClick: true,
    noKeyboard: true,
  })

  const handleEmoji = (emojiData) => {
    onChange(`${value}${emojiData.emoji}`)
    setEmojiOpen(false)
    window.requestAnimationFrame(() => inputRef.current?.focus())
  }

  const canSend = value.trim() && !hasDraftFile

  return (
    <form onSubmit={onSubmit} className="shrink-0 border-t border-gray-100 bg-white px-3 py-2">
      <div
        {...getRootProps({
          refKey: 'ref',
          className: `relative rounded-2xl transition ${isDragActive ? 'bg-blue-50 ring-2 ring-teal-300' : ''}`,
        })}
      >
        <input {...getInputProps()} />

        {isDragActive && (
          <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center rounded-2xl border border-dashed border-teal-300 bg-blue-50/90 text-sm font-black text-teal-800">
            {attachmentDropLabel}
          </div>
        )}

        {draftFile && (
          <DraftAttachmentPreview
            file={draftFile}
            previewUrl={previewUrl}
            onRemove={() => setDraftFile(null)}
            removeLabel={attachmentRemoveLabel}
            localOnlyLabel={attachmentLocalOnlyLabel}
          />
        )}

        <div ref={composerRef} className="relative flex items-center gap-2 rounded-full bg-slate-100 p-1.5 transition focus-within:bg-white focus-within:ring-2 focus-within:ring-teal-300">
          <button
            type="button"
            onClick={() => setEmojiOpen(open => !open)}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-white hover:text-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-300"
            aria-label={emojiLabel}
            aria-expanded={emojiOpen}
          >
            <AppIcon name="Smile" className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={open}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-white hover:text-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-300"
            aria-label={attachmentLabel}
          >
            <AppIcon name="Paperclip" className="h-4 w-4" />
          </button>

          {emojiOpen && (
            <div className="messaging-emoji-panel absolute bottom-full left-0 z-30 mb-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
              <Suspense fallback={<div className="h-[360px] w-[310px] animate-pulse bg-slate-50" />}>
                <EmojiPicker
                  onEmojiClick={handleEmoji}
                  lazyLoadEmojis
                  searchDisabled
                  skinTonesDisabled
                  width={310}
                  height={360}
                />
              </Suspense>
            </div>
          )}

          <input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={value}
            onChange={event => onChange(event.target.value)}
            className="min-w-0 flex-1 border-0 bg-transparent px-1 py-2 text-sm outline-none placeholder:text-slate-400"
          />
          <button
            type="submit"
            disabled={!canSend}
            className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:bg-gray-300 disabled:shadow-none ${accentClasses.button}`}
          >
            <AppIcon name="Send" className="h-4 w-4" />
            <span className="sr-only">{sendLabel}</span>
          </button>
        </div>
      </div>
    </form>
  )
}

function DraftAttachmentPreview({ file, previewUrl, onRemove, removeLabel, localOnlyLabel }) {
  return (
    <div className="mb-2 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-white ring-1 ring-slate-200">
        {previewUrl ? (
          <img src={previewUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <AppIcon name="FileText" className="h-5 w-5 text-slate-500" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black text-slate-900">{file.name}</p>
        <p className="text-xs font-semibold text-slate-500">{formatFileSize(file.size)}</p>
        <p className="mt-0.5 text-[11px] font-semibold text-amber-700">{localOnlyLabel}</p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-white hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-200"
        aria-label={removeLabel}
      >
        <AppIcon name="X" className="h-4 w-4" />
      </button>
    </div>
  )
}

function formatFileSize(size) {
  if (!Number.isFinite(size)) return ''
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function getAccentClasses(accent) {
  if (accent === 'teal') {
    return {
      button: 'bg-teal-700 hover:bg-teal-600',
    }
  }

  return {
    button: 'bg-indigo-600 hover:bg-indigo-500',
  }
}
