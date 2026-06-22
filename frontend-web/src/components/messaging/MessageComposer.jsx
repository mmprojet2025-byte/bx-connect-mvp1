import { useEffect, useRef, useState } from 'react'
import EmojiPicker from 'emoji-picker-react'
import AppIcon from '../ui/AppIcons'
import { useTranslation } from 'react-i18next'

export default function MessageComposer({
  value,
  onChange,
  onSubmit,
  placeholder,
  sendLabel,
  accent = 'indigo',
}) {
  const { t } = useTranslation()
  const [pickerOpen, setPickerOpen] = useState(false)
  const wrapperRef = useRef(null)
  const inputRef = useRef(null)
  const accentClasses = getAccentClasses(accent)

  useEffect(() => {
    const closeOnOutsideClick = event => {
      if (!wrapperRef.current?.contains(event.target)) {
        setPickerOpen(false)
      }
    }

    document.addEventListener('mousedown', closeOnOutsideClick)
    return () => document.removeEventListener('mousedown', closeOnOutsideClick)
  }, [])

  const insertEmoji = emojiData => {
    const emoji = emojiData.emoji || ''
    const input = inputRef.current
    const start = input?.selectionStart ?? value.length
    const end = input?.selectionEnd ?? value.length
    const nextValue = `${value.slice(0, start)}${emoji}${value.slice(end)}`

    onChange(nextValue)
    setPickerOpen(false)
    window.requestAnimationFrame(() => {
      input?.focus()
      const cursor = start + emoji.length
      input?.setSelectionRange(cursor, cursor)
    })
  }

  return (
    <form onSubmit={onSubmit} className="border-t border-gray-100 bg-white px-4 py-3">
      <div ref={wrapperRef} className="relative flex items-center gap-2">
        {pickerOpen && (
          <div className="absolute bottom-full right-12 z-30 mb-3 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/15">
            <EmojiPicker
              onEmojiClick={insertEmoji}
              width={320}
              height={380}
              previewConfig={{ showPreview: false }}
              searchDisabled
              skinTonesDisabled
            />
          </div>
        )}

        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={event => onChange(event.target.value)}
          className={`flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-3 text-sm transition focus:outline-none focus:ring-2 ${accentClasses.focus}`}
        />
        <button
          type="button"
          onClick={() => setPickerOpen(open => !open)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-xl transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300"
          aria-label={t('messaging.addEmoji')}
          aria-expanded={pickerOpen}
        >
          😊
        </button>
        <button
          type="submit"
          disabled={!value.trim()}
          className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white transition disabled:bg-gray-300 ${accentClasses.button}`}
        >
          <AppIcon name="Send" className="h-4 w-4" />
          {sendLabel}
        </button>
      </div>
    </form>
  )
}

function getAccentClasses(accent) {
  if (accent === 'teal') {
    return {
      focus: 'focus:ring-teal-400',
      button: 'bg-teal-700 hover:bg-teal-600',
    }
  }

  return {
    focus: 'focus:ring-indigo-400',
    button: 'bg-indigo-600 hover:bg-indigo-500',
  }
}
