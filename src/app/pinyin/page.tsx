"use client";
import "./pinyin.css";
import { useEffect, useMemo, useRef, useState } from 'react'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { pinyin } from 'pinyin-pro'

const STORAGE_KEY = 'pinyin-ruby-editor-entries'
const CJK_CHAR_REGEX = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/
const PHRASE_TRANSLATIONS = {
  你好吗: 'How are you?',
  你好: 'Hello.',
  谢谢: 'Thank you.',
  对不起: 'Sorry.',
  没关系: "It's okay.",
  我爱你: 'I love you.',
  我喜欢学习中文: 'I like learning Chinese.',
  我是老师: 'I am a teacher.',
  我是学生: 'I am a student.',
}
const CHAR_TRANSLATIONS = {
  你: 'you',
  我: 'I',
  他: 'he',
  她: 'she',
  们: '(plural)',
  好: 'good',
  吗: '(question)',
  很: 'very',
  是: 'am/is/are',
  学: 'learn',
  生: 'student',
  老: 'old',
  师: 'teacher',
  爱: 'love',
  喜: 'like',
  欢: 'like',
  谢: 'thank',
  对: 'toward',
  不: 'not',
  起: 'rise',
  没: 'not',
  关: 'concern',
  系: 'relation',
  中: 'middle',
  文: 'language',
  今: 'today',
  天: 'day',
  气: 'weather',
}
const PUNCTUATION_REGEX = /[，。！？；：、“”‘’（）《》〈〉,.!?;:'"()\-—]/

const createEntry = () => ({
  id: crypto.randomUUID(),
  chinese: '',
  autoEnglish: '',
  finalEnglish: '',
  isEnglishCustom: false,
  customPinyin: {},
  keyVocabulary: '',
  languagePoints: '',
  sentencePattern: '',
  grammarNotes: '',
  teachingNotes: '',
})

const readStoredEntries = () => {
  const initial = [createEntry()]
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return initial
    }
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return initial
    }
    return parsed.map((entry) => ({
      id: entry.id || crypto.randomUUID(),
      chinese: typeof entry.chinese === 'string' ? entry.chinese : '',
      autoEnglish: typeof entry.autoEnglish === 'string' ? entry.autoEnglish : '',
      finalEnglish:
        typeof entry.finalEnglish === 'string'
          ? entry.finalEnglish
          : typeof entry.english === 'string'
            ? entry.english
            : '',
      isEnglishCustom: Boolean(entry.isEnglishCustom),
      customPinyin:
        entry.customPinyin && typeof entry.customPinyin === 'object' ? entry.customPinyin : {},
      keyVocabulary:
        typeof entry.keyVocabulary === 'string'
          ? entry.keyVocabulary
          : typeof entry.keyPoints === 'string'
            ? entry.keyPoints
            : '',
      languagePoints: typeof entry.languagePoints === 'string' ? entry.languagePoints : '',
      sentencePattern: typeof entry.sentencePattern === 'string' ? entry.sentencePattern : '',
      grammarNotes: typeof entry.grammarNotes === 'string' ? entry.grammarNotes : '',
      teachingNotes:
        typeof entry.teachingNotes === 'string'
          ? entry.teachingNotes
          : typeof entry.notes === 'string'
            ? entry.notes
            : '',
    }))
  } catch {
    return initial
  }
}

const getAutoPinyin = (char) => {
  if (!CJK_CHAR_REGEX.test(char)) {
    return ''
  }
  const result = pinyin(char, { toneType: 'symbol' })
  return typeof result === 'string' ? result.trim() : ''
}

const splitWithPinyin = (entry) =>
  Array.from(entry.chinese).map((char, index) => {
    const auto = getAutoPinyin(char)
    const custom = typeof entry.customPinyin?.[index] === 'string' ? entry.customPinyin[index] : ''
    const shown = custom.trim() || auto
    return { index, char, auto, custom, shown, isHan: Boolean(auto) }
  })

const generateAutoEnglish = (chinese) => {
  const normalized = chinese.replace(/\s+/g, '').trim()
  if (!normalized) {
    return ''
  }
  if (PHRASE_TRANSLATIONS[normalized]) {
    return PHRASE_TRANSLATIONS[normalized]
  }
  const segments = []
  let cursor = 0
  const phraseKeys = Object.keys(PHRASE_TRANSLATIONS).sort((a, b) => b.length - a.length)
  while (cursor < normalized.length) {
    const char = normalized[cursor]
    if (PUNCTUATION_REGEX.test(char)) {
      cursor += 1
      continue
    }
    let matched = ''
    for (const phrase of phraseKeys) {
      if (normalized.startsWith(phrase, cursor)) {
        matched = phrase
        break
      }
    }
    if (matched) {
      segments.push(PHRASE_TRANSLATIONS[matched].replace(/[.?!]$/, ''))
      cursor += matched.length
      continue
    }
    if (CHAR_TRANSLATIONS[char]) {
      segments.push(CHAR_TRANSLATIONS[char])
    }
    cursor += 1
  }
  if (segments.length === 0) {
    return 'Translation draft unavailable. Please edit manually.'
  }
  const sentence = segments.join(' ').replace(/\s+/g, ' ').trim()
  return sentence ? `${sentence}.` : 'Translation draft unavailable. Please edit manually.'
}

const shrink = (text, max = 20) => {
  if (!text) {
    return 'Untitled'
  }
  return text.length > max ? `${text.slice(0, max)}…` : text
}

export default function PinyinPage() {
  const [entries, setEntries] = useState(readStoredEntries)
  const [selectedId, setSelectedId] = useState(null)
  const [viewMode, setViewMode] = useState('sentence')
  const [activePinyinIndex, setActivePinyinIndex] = useState(null)
  const [newVocabularyDraft, setNewVocabularyDraft] = useState('')
  const [showKeyVocabulary, setShowKeyVocabulary] = useState(true)
  const [showTeachingNotes, setShowTeachingNotes] = useState(false)
  const [isQuickCorrectOpen, setIsQuickCorrectOpen] = useState(false)
  const [quickStudentSaid, setQuickStudentSaid] = useState('')
  const [quickCorrectedChinese, setQuickCorrectedChinese] = useState('')
  const [quickAutoEnglish, setQuickAutoEnglish] = useState('')
  const [quickFinalEnglish, setQuickFinalEnglish] = useState('')
  const [quickIsEnglishCustom, setQuickIsEnglishCustom] = useState(false)
  const [quickDisplayOverride, setQuickDisplayOverride] = useState(null)
  const [fontScale, setFontScale] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isExportingPdf, setIsExportingPdf] = useState(false)
  const [copyState, setCopyState] = useState('idle')
  const exportRef = useRef(null)
  const fullscreenRef = useRef(null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  }, [entries])

  useEffect(() => {
    if (!selectedId && entries.length) {
      setSelectedId(entries[0].id)
    }
  }, [entries, selectedId])

  useEffect(() => {
    if (!entries.some((entry) => entry.id === selectedId)) {
      setSelectedId(entries[0]?.id ?? null)
      setActivePinyinIndex(null)
    }
  }, [entries, selectedId])

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  const previewEntries = useMemo(
    () =>
      entries.map((entry) => ({
        ...entry,
        rubyItems: splitWithPinyin(entry),
      })),
    [entries],
  )

  const selectedEntry = useMemo(
    () => entries.find((entry) => entry.id === selectedId) ?? entries[0],
    [entries, selectedId],
  )

  const selectedPreview = useMemo(
    () => previewEntries.find((entry) => entry.id === selectedEntry?.id) ?? previewEntries[0],
    [previewEntries, selectedEntry],
  )

  const quickRubyItems = useMemo(
    () => splitWithPinyin({ chinese: quickCorrectedChinese, customPinyin: {} }),
    [quickCorrectedChinese],
  )

  const renderPreview = useMemo(() => {
    if (!quickDisplayOverride?.chinese) {
      return selectedPreview
    }
    return {
      ...selectedPreview,
      ...quickDisplayOverride,
      rubyItems: splitWithPinyin({
        chinese: quickDisplayOverride.chinese,
        customPinyin: quickDisplayOverride.customPinyin || {},
      }),
    }
  }, [quickDisplayOverride, selectedPreview])

  useEffect(() => {
    if (!selectedPreview || activePinyinIndex == null) {
      return
    }
    const token = selectedPreview.rubyItems[activePinyinIndex]
    if (!token || !token.isHan) {
      setActivePinyinIndex(null)
    }
  }, [activePinyinIndex, selectedPreview])

  const updateEntry = (id, patch) => {
    setEntries((prev) => prev.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)))
  }

  const updateSelectedEntry = (patch) => {
    if (!selectedEntry) {
      return
    }
    updateEntry(selectedEntry.id, patch)
  }

  const updateCustomPinyin = (id, index, value) => {
    setEntries((prev) =>
      prev.map((entry) => {
        if (entry.id !== id) {
          return entry
        }
        return {
          ...entry,
          customPinyin: {
            ...entry.customPinyin,
            [index]: value,
          },
        }
      }),
    )
  }

  const handleChineseChange = (value) => {
    if (!selectedEntry) {
      return
    }
    const autoEnglish = generateAutoEnglish(value)
    const patch = { chinese: value, autoEnglish }
    if (!selectedEntry.isEnglishCustom || !selectedEntry.finalEnglish.trim()) {
      patch.finalEnglish = autoEnglish
      patch.isEnglishCustom = false
    }
    updateSelectedEntry(patch)
  }

  const addEntry = () => {
    const newEntry = createEntry()
    setEntries((prev) => [...prev, newEntry])
    setSelectedId(newEntry.id)
    setActivePinyinIndex(null)
    setNewVocabularyDraft('')
  }

  const deleteEntry = (id) => {
    setEntries((prev) => {
      if (prev.length === 1) {
        const fallback = createEntry()
        setSelectedId(fallback.id)
        setActivePinyinIndex(null)
        return [fallback]
      }
      const next = prev.filter((entry) => entry.id !== id)
      if (selectedId === id) {
        setSelectedId(next[0].id)
      }
      return next
    })
  }

  const handleSelectEntry = (id) => {
    setSelectedId(id)
    setActivePinyinIndex(null)
    setCopyState('idle')
    setNewVocabularyDraft('')
    setQuickDisplayOverride(null)
  }

  const handleSelectToken = (token) => {
    if (!token.isHan) {
      return
    }
    setActivePinyinIndex(token.index)
  }

  const activeToken =
    activePinyinIndex == null || !selectedPreview ? null : selectedPreview.rubyItems[activePinyinIndex]

  const currentIndex = useMemo(
    () => entries.findIndex((entry) => entry.id === selectedEntry?.id),
    [entries, selectedEntry],
  )

  const canPrev = currentIndex > 0
  const canNext = currentIndex >= 0 && currentIndex < entries.length - 1

  const goPrev = () => {
    if (!canPrev) {
      return
    }
    setQuickDisplayOverride(null)
    handleSelectEntry(entries[currentIndex - 1].id)
  }

  const goNext = () => {
    if (!canNext) {
      return
    }
    setQuickDisplayOverride(null)
    handleSelectEntry(entries[currentIndex + 1].id)
  }

  const toggleFullscreen = async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen()
      return
    }
    if (fullscreenRef.current?.requestFullscreen) {
      await fullscreenRef.current.requestFullscreen()
    }
  }

  const increaseFont = () => {
    setFontScale((prev) => Math.min(1.5, Number((prev + 0.05).toFixed(2))))
  }

  const decreaseFont = () => {
    setFontScale((prev) => Math.max(0.8, Number((prev - 0.05).toFixed(2))))
  }

  const vocabularyItems = useMemo(() => {
    if (!selectedPreview?.keyVocabulary) {
      return []
    }
    return selectedPreview.keyVocabulary
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean)
  }, [selectedPreview])

  const updateVocabularyItems = (items) => {
    updateSelectedEntry({ keyVocabulary: items.join('\n') })
  }

  const updateVocabularyItem = (index, value) => {
    const next = [...vocabularyItems]
    next[index] = value
    updateVocabularyItems(next.map((item) => item.trim()).filter(Boolean))
  }

  const removeVocabularyItem = (index) => {
    updateVocabularyItems(vocabularyItems.filter((_, i) => i !== index))
  }

  const addVocabularyItem = () => {
    const value = newVocabularyDraft.trim()
    if (!value) {
      return
    }
    updateVocabularyItems([...vocabularyItems, value])
    setNewVocabularyDraft('')
  }

  const useDraftEnglish = () => {
    if (!selectedEntry?.autoEnglish.trim()) {
      return
    }
    updateSelectedEntry({
      finalEnglish: selectedEntry.autoEnglish.trim(),
      isEnglishCustom: false,
    })
  }

  const regenerateDraft = (replaceFinal = false) => {
    if (!selectedEntry) {
      return
    }
    const autoEnglish = generateAutoEnglish(selectedEntry.chinese)
    const patch = { autoEnglish }
    if (replaceFinal) {
      patch.finalEnglish = autoEnglish
      patch.isEnglishCustom = false
    }
    updateSelectedEntry(patch)
  }

  const getCardCopyText = () => {
    if (!renderPreview) {
      return ''
    }
    const pinyinLine = renderPreview.rubyItems
      .map((token) => (token.isHan ? token.shown : ''))
      .filter(Boolean)
      .join(' ')
    const parts = [pinyinLine, renderPreview.chinese, renderPreview.finalEnglish || renderPreview.autoEnglish]
    if (renderPreview.keyVocabulary) {
      parts.push(renderPreview.keyVocabulary)
    }
    if (renderPreview.languagePoints) {
      parts.push(renderPreview.languagePoints)
    }
    if (renderPreview.sentencePattern) {
      parts.push(renderPreview.sentencePattern)
    }
    if (renderPreview.grammarNotes) {
      parts.push(renderPreview.grammarNotes)
    }
    if (renderPreview.teachingNotes) {
      parts.push(renderPreview.teachingNotes)
    }
    return parts.filter(Boolean).join('\n')
  }

  const openQuickCorrect = () => {
    const source = quickDisplayOverride || selectedEntry
    const chinese = source?.chinese || ''
    const autoEnglish = generateAutoEnglish(chinese)
    setQuickStudentSaid('')
    setQuickCorrectedChinese(chinese)
    setQuickAutoEnglish(autoEnglish)
    setQuickFinalEnglish(source?.finalEnglish || autoEnglish)
    setQuickIsEnglishCustom(Boolean(source?.finalEnglish))
    setIsQuickCorrectOpen(true)
  }

  useEffect(() => {
    if (!isQuickCorrectOpen) {
      return
    }
    const autoEnglish = generateAutoEnglish(quickCorrectedChinese)
    setQuickAutoEnglish(autoEnglish)
    if (!quickIsEnglishCustom) {
      setQuickFinalEnglish(autoEnglish)
    }
  }, [isQuickCorrectOpen, quickCorrectedChinese, quickIsEnglishCustom])

  const handleQuickShowOnScreen = () => {
    const chinese = quickCorrectedChinese.trim()
    if (!chinese) {
      return
    }
    setQuickDisplayOverride({
      chinese,
      autoEnglish: quickAutoEnglish,
      finalEnglish: quickFinalEnglish.trim() || quickAutoEnglish,
      customPinyin: {},
    })
    setIsQuickCorrectOpen(false)
  }

  const handleQuickSaveToLesson = () => {
    const chinese = quickCorrectedChinese.trim()
    if (!chinese) {
      return
    }
    const savedEntry = createEntry()
    savedEntry.chinese = chinese
    savedEntry.autoEnglish = quickAutoEnglish
    savedEntry.finalEnglish = quickFinalEnglish.trim() || quickAutoEnglish
    savedEntry.isEnglishCustom = savedEntry.finalEnglish !== quickAutoEnglish
    setEntries((prev) => [...prev, savedEntry])
    setSelectedId(savedEntry.id)
    setQuickDisplayOverride({
      chinese: savedEntry.chinese,
      autoEnglish: savedEntry.autoEnglish,
      finalEnglish: savedEntry.finalEnglish,
      customPinyin: {},
    })
    setIsQuickCorrectOpen(false)
    setViewMode('presentation')
  }

  const handleQuickReplaceCurrent = () => {
    const chinese = quickCorrectedChinese.trim()
    if (!chinese || !selectedEntry) {
      return
    }
    const finalEnglish = quickFinalEnglish.trim() || quickAutoEnglish
    updateSelectedEntry({
      chinese,
      autoEnglish: quickAutoEnglish,
      finalEnglish,
      isEnglishCustom: finalEnglish !== quickAutoEnglish,
      customPinyin: {},
    })
    setQuickDisplayOverride(null)
    setIsQuickCorrectOpen(false)
    setViewMode('presentation')
  }

  const copyCard = async () => {
    try {
      const text = getCardCopyText()
      if (!text) {
        return
      }
      await navigator.clipboard.writeText(text)
      setCopyState('copied')
      window.setTimeout(() => setCopyState('idle'), 1500)
    } catch {
      setCopyState('failed')
      window.setTimeout(() => setCopyState('idle'), 1800)
    }
  }

  const exportToPdf = async () => {
    if (!exportRef.current || isExportingPdf) {
      return
    }
    setIsExportingPdf(true)
    try {
      const canvas = await html2canvas(exportRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
      })
      const imageData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'pt',
        format: 'a4',
      })
      const margin = 24
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const imageWidth = pageWidth - margin * 2
      const imageHeight = (canvas.height * imageWidth) / canvas.width
      const printableHeight = pageHeight - margin * 2

      let offset = 0
      pdf.addImage(imageData, 'PNG', margin, margin - offset, imageWidth, imageHeight, undefined, 'FAST')
      offset += printableHeight

      while (offset < imageHeight) {
        pdf.addPage()
        pdf.addImage(
          imageData,
          'PNG',
          margin,
          margin - offset,
          imageWidth,
          imageHeight,
          undefined,
          'FAST',
        )
        offset += printableHeight
      }
      pdf.save(`pinyin-card-${new Date().toISOString().slice(0, 10)}.pdf`)
    } finally {
      setIsExportingPdf(false)
    }
  }

  return (
    <div className="app-shell" ref={fullscreenRef}>
      <header className="topbar">
        <div>
          <h1>Sentence Builder Studio</h1>
          <p>Preparation, presentation, and live correction in one classroom workspace.</p>
        </div>
        <div className="topbar-actions">
          <div className="mode-switcher">
            <button
              type="button"
              className={`btn btn-subtle ${viewMode === 'sentence' ? 'mode-active' : ''}`}
              onClick={() => setViewMode('sentence')}
            >
              Sentence
            </button>
            <button
              type="button"
              className={`btn btn-subtle ${viewMode === 'presentation' ? 'mode-active' : ''}`}
              onClick={() => setViewMode('presentation')}
            >
              Presentation
            </button>
          </div>
          <button type="button" className="btn btn-primary" onClick={addEntry}>
            New Sentence
          </button>
        </div>
      </header>

      <div className="sentence-tabs">
        {previewEntries.map((entry, idx) => {
          const isActive = entry.id === selectedEntry?.id
          return (
            <article key={entry.id} className={`entry-row ${isActive ? 'active' : ''}`}>
              <button type="button" className="entry-select" onClick={() => handleSelectEntry(entry.id)}>
                <div className="entry-meta">
                  <span className="entry-index">#{idx + 1}</span>
                  <span className="entry-title">{shrink(entry.chinese, 22)}</span>
                  <span className="entry-subtitle">{shrink(entry.finalEnglish || entry.autoEnglish, 30)}</span>
                </div>
              </button>
              <button
                type="button"
                className="btn-icon btn-danger-soft"
                aria-label="Delete sentence"
                onClick={(event) => {
                  event.stopPropagation()
                  deleteEntry(entry.id)
                }}
              >
                ✕
              </button>
            </article>
          )
        })}
      </div>

      {viewMode === 'sentence' ? (
        <main className="builder-shell">
          <section className="builder-main">
            <div className="surface section-card">
              <div className="section-head">
                <h2>Sentence Builder</h2>
                <span className="soft-label">Type Chinese to auto-generate pinyin + translation</span>
              </div>
              <label className="field-label" htmlFor="builder-chinese">
                Chinese Input
              </label>
              <textarea
                id="builder-chinese"
                className="input input-area"
                rows={3}
                placeholder="Type Chinese sentence..."
                value={selectedEntry?.chinese || ''}
                onChange={(event) => handleChineseChange(event.target.value)}
              />
            </div>

            <article className="preview-card surface" ref={exportRef} style={{ '--ruby-scale': fontScale }}>
              {renderPreview?.chinese ? (
                <>
                  <div className="ruby-line">
                    {renderPreview.rubyItems.map((token) =>
                      token.isHan ? (
                        <button
                          type="button"
                          key={`preview-${token.index}`}
                          className={`ruby-click ${activePinyinIndex === token.index ? 'active' : ''}`}
                          onClick={() => handleSelectToken(token)}
                        >
                          <ruby className="ruby-char">
                            {token.char}
                            <rt>{token.shown}</rt>
                          </ruby>
                        </button>
                      ) : (
                        <span key={`preview-${token.index}`} className="plain-char">
                          {token.char}
                        </span>
                      ),
                    )}
                  </div>
                  <p className="translation">
                    {renderPreview.finalEnglish || renderPreview.autoEnglish || 'Translation appears here.'}
                  </p>
                </>
              ) : (
                <div className="preview-empty">
                  <h3>Your sentence card appears here</h3>
                  <p>Enter Chinese text to generate pinyin and translation in real time.</p>
                </div>
              )}
            </article>
          </section>

          <aside className="inspector surface section-card">
            <div className="section-head">
              <h2>Inspector</h2>
              <span className="soft-label">Deep editing</span>
            </div>

            <section className="inspector-block">
              <h3>Pinyin Editor</h3>
              {activeToken?.isHan ? (
                <div className="token-editor">
                  <span className="char-pill">{activeToken.char}</span>
                  <input
                    type="text"
                    className="input pinyin-input"
                    value={activeToken.custom}
                    placeholder={activeToken.auto}
                    onChange={(event) =>
                      updateCustomPinyin(selectedEntry.id, activeToken.index, event.target.value)
                    }
                  />
                  <button
                    type="button"
                    className="btn btn-subtle"
                    onClick={() => updateCustomPinyin(selectedEntry.id, activeToken.index, '')}
                  >
                    Reset
                  </button>
                </div>
              ) : (
                <p className="empty-note">Click a Chinese character in the preview to edit its pinyin.</p>
              )}
            </section>

            <section className="inspector-block">
              <h3>Translation Editor</h3>
              <label className="field-label" htmlFor="inspector-english">
                Final English
              </label>
              <textarea
                id="inspector-english"
                className="input"
                rows={3}
                value={selectedEntry?.finalEnglish || ''}
                onChange={(event) =>
                  updateSelectedEntry({ finalEnglish: event.target.value, isEnglishCustom: true })
                }
              />
              <p className="draft-label">Auto Draft</p>
              <p className="draft-content">{selectedEntry?.autoEnglish || 'No draft available yet.'}</p>
              <div className="draft-actions">
                <button
                  type="button"
                  className="btn btn-subtle"
                  onClick={useDraftEnglish}
                  disabled={!selectedEntry?.autoEnglish.trim()}
                >
                  Use Draft
                </button>
                <button type="button" className="btn btn-subtle" onClick={() => regenerateDraft(false)}>
                  Regenerate
                </button>
                <button type="button" className="btn btn-subtle" onClick={() => regenerateDraft(true)}>
                  Regenerate + Apply
                </button>
              </div>
            </section>

            <section className="inspector-block">
              <h3>Actions</h3>
              <div className="control-grid">
                <button type="button" className="btn btn-subtle" onClick={() => setViewMode('presentation')}>
                  Open Presentation
                </button>
                <button type="button" className="btn btn-subtle" onClick={copyCard}>
                  {copyState === 'copied' ? 'Copied' : copyState === 'failed' ? 'Copy Failed' : 'Copy Card'}
                </button>
                <button
                  type="button"
                  className="btn btn-subtle"
                  onClick={exportToPdf}
                  disabled={isExportingPdf}
                >
                  {isExportingPdf ? 'Exporting...' : 'Export PDF'}
                </button>
              </div>
            </section>
          </aside>
        </main>
      ) : (
        <main className="presentation-shell">
          <div className="surface section-card presentation-toolbar">
            <div className="nav-group">
              <button type="button" className="btn btn-subtle" onClick={goPrev} disabled={!canPrev}>
                Previous
              </button>
              <span className="soft-label sentence-counter">
                {entries.length === 0 ? '0 / 0' : `${currentIndex + 1} / ${entries.length}`}
              </span>
              <button type="button" className="btn btn-subtle" onClick={goNext} disabled={!canNext}>
                Next
              </button>
            </div>
            <div className="nav-group">
              <button type="button" className="btn btn-subtle" onClick={decreaseFont}>
                A-
              </button>
              <button type="button" className="btn btn-subtle" onClick={increaseFont}>
                A+
              </button>
              <button type="button" className="btn btn-subtle" onClick={toggleFullscreen}>
                {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              </button>
              <button type="button" className="btn btn-subtle" onClick={openQuickCorrect}>
                Quick Correct
              </button>
              <button
                type="button"
                className="btn btn-subtle"
                onClick={() => setShowKeyVocabulary((prev) => !prev)}
              >
                {showKeyVocabulary ? 'Hide Key Vocabulary' : 'Show Key Vocabulary'}
              </button>
              <button
                type="button"
                className="btn btn-subtle"
                onClick={() => setShowTeachingNotes((prev) => !prev)}
              >
                {showTeachingNotes ? 'Hide Notes' : 'Show Notes'}
              </button>
            </div>
          </div>

          <article className="preview-card surface" ref={exportRef} style={{ '--ruby-scale': fontScale }}>
            {renderPreview?.chinese ? (
              <>
                <div className="ruby-line">
                  {renderPreview.rubyItems.map((token) =>
                    token.isHan ? (
                      <ruby key={`present-${token.index}`} className="ruby-char">
                        {token.char}
                        <rt>{token.shown}</rt>
                      </ruby>
                    ) : (
                      <span key={`present-${token.index}`} className="plain-char">
                        {token.char}
                      </span>
                    ),
                  )}
                </div>
                <p className="translation">
                  {renderPreview.finalEnglish || renderPreview.autoEnglish || 'Translation appears here.'}
                </p>
              </>
            ) : (
              <div className="preview-empty">
                <h3>Your sentence card appears here</h3>
                <p>Enter Chinese text and translation in Sentence mode.</p>
              </div>
            )}
          </article>
        </main>
      )}

      <section className="surface section-card support-section">
        <div className="section-head">
          <h2>Language Points</h2>
          <span className="soft-label">
            {viewMode === 'presentation' ? 'Display support' : 'Teaching support on the same page'}
          </span>
        </div>

        {showKeyVocabulary && viewMode === 'sentence' && (
          <section className="support-block">
            <h3>Key Vocabulary</h3>
            <div className="point-adder">
              <input
                className="input"
                placeholder="Add one vocabulary line..."
                value={newVocabularyDraft}
                onChange={(event) => setNewVocabularyDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    addVocabularyItem()
                  }
                }}
              />
              <button type="button" className="btn btn-subtle" onClick={addVocabularyItem}>
                Add
              </button>
            </div>
            <div className="points-list">
              {vocabularyItems.length === 0 && (
                <p className="empty-note">Add vocabulary items for classroom focus.</p>
              )}
              {vocabularyItems.map((item, index) => (
                <div key={`vocabulary-${index}`} className="point-item">
                  <input
                    className="input"
                    value={item}
                    onChange={(event) => updateVocabularyItem(index, event.target.value)}
                  />
                  <button
                    type="button"
                    className="btn-icon btn-danger-soft"
                    onClick={() => removeVocabularyItem(index)}
                    aria-label="Remove vocabulary item"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {showKeyVocabulary && viewMode === 'presentation' && (
          <section className="support-block">
            <h3>Key Vocabulary</h3>
            {vocabularyItems.length ? (
              <ul className="support-list">
                {vocabularyItems.map((item, index) => (
                  <li key={`${item}-${index}`}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="empty-note">No key vocabulary for this sentence.</p>
            )}
          </section>
        )}

        <section className="support-block">
          <h3>Sentence Pattern</h3>
          {viewMode === 'sentence' ? (
            <input
              className="input"
              placeholder="e.g. Subject + 很 + Adjective"
              value={selectedEntry?.sentencePattern || ''}
              onChange={(event) => updateSelectedEntry({ sentencePattern: event.target.value })}
            />
          ) : (
            <p className="support-text">{selectedEntry?.sentencePattern || 'No sentence pattern added.'}</p>
          )}
        </section>

        <section className="support-block">
          <h3>Language Points</h3>
          {viewMode === 'sentence' ? (
            <textarea
              className="input"
              rows={3}
              placeholder="Add language points..."
              value={selectedEntry?.languagePoints || ''}
              onChange={(event) => updateSelectedEntry({ languagePoints: event.target.value })}
            />
          ) : (
            <p className="support-text">{selectedEntry?.languagePoints || 'No language points added.'}</p>
          )}
        </section>

        <section className="support-block">
          <h3>Grammar Notes</h3>
          {viewMode === 'sentence' ? (
            <textarea
              className="input"
              rows={3}
              placeholder="Add grammar explanation..."
              value={selectedEntry?.grammarNotes || ''}
              onChange={(event) => updateSelectedEntry({ grammarNotes: event.target.value })}
            />
          ) : (
            <p className="support-text">{selectedEntry?.grammarNotes || 'No grammar notes added.'}</p>
          )}
        </section>

        {showTeachingNotes && (
          <section className="support-block">
            <h3>Teaching Notes</h3>
            {viewMode === 'sentence' ? (
              <textarea
                className="input"
                rows={3}
                placeholder="Add teaching notes..."
                value={selectedEntry?.teachingNotes || ''}
                onChange={(event) => updateSelectedEntry({ teachingNotes: event.target.value })}
              />
            ) : (
              <p className="support-text">{selectedEntry?.teachingNotes || 'No teaching notes added.'}</p>
            )}
          </section>
        )}
      </section>

      {viewMode === 'presentation' && isQuickCorrectOpen && (
        <div className="quick-correct-overlay">
          <aside className="quick-correct-drawer surface section-card">
            <div className="section-head">
              <h2>Quick Correct</h2>
              <button type="button" className="btn btn-subtle" onClick={() => setIsQuickCorrectOpen(false)}>
                Close
              </button>
            </div>
            <label className="field-label" htmlFor="quick-student">
              Student Said
            </label>
            <textarea
              id="quick-student"
              className="input"
              rows={2}
              placeholder="Capture student response..."
              value={quickStudentSaid}
              onChange={(event) => setQuickStudentSaid(event.target.value)}
            />
            <label className="field-label" htmlFor="quick-corrected">
              Corrected Sentence
            </label>
            <textarea
              id="quick-corrected"
              className="input"
              rows={3}
              placeholder="Type corrected Chinese sentence..."
              value={quickCorrectedChinese}
              onChange={(event) => setQuickCorrectedChinese(event.target.value)}
            />
            <div className="mini-ruby-preview">
              {quickRubyItems.length ? (
                quickRubyItems.map((token) =>
                  token.isHan ? (
                    <ruby key={`quick-ruby-${token.index}`} className="mini-ruby-char">
                      {token.char}
                      <rt>{token.shown}</rt>
                    </ruby>
                  ) : (
                    <span key={`quick-ruby-${token.index}`}>{token.char}</span>
                  ),
                )
              ) : (
                <span className="soft-label">Auto pinyin preview appears here.</span>
              )}
            </div>
            <label className="field-label" htmlFor="quick-english">
              English Translation
            </label>
            <textarea
              id="quick-english"
              className="input"
              rows={3}
              value={quickFinalEnglish}
              onChange={(event) => {
                setQuickFinalEnglish(event.target.value)
                setQuickIsEnglishCustom(true)
              }}
            />
            <p className="draft-label">Auto English</p>
            <p className="draft-content">{quickAutoEnglish || 'No draft available yet.'}</p>
            <div className="draft-actions">
              <button
                type="button"
                className="btn btn-subtle"
                onClick={() => {
                  setQuickFinalEnglish(quickAutoEnglish)
                  setQuickIsEnglishCustom(false)
                }}
              >
                Use Auto
              </button>
              <button
                type="button"
                className="btn btn-subtle"
                onClick={() => {
                  const auto = generateAutoEnglish(quickCorrectedChinese)
                  setQuickAutoEnglish(auto)
                  if (!quickIsEnglishCustom) {
                    setQuickFinalEnglish(auto)
                  }
                }}
              >
                Regenerate
              </button>
            </div>
            <div className="quick-actions">
              <button type="button" className="btn btn-primary" onClick={handleQuickShowOnScreen}>
                Show Temporarily
              </button>
              <button type="button" className="btn btn-subtle" onClick={handleQuickReplaceCurrent}>
                Replace Current Sentence
              </button>
              <button type="button" className="btn btn-subtle" onClick={handleQuickSaveToLesson}>
                Save as New Sentence
              </button>
              <button type="button" className="btn btn-subtle" onClick={() => setIsQuickCorrectOpen(false)}>
                Cancel
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}


