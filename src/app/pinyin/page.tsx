"use client";
import "./pinyin.css";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { pinyin } from 'pinyin-pro'

const STORAGE_KEY = 'pinyin-ruby-editor-entries'
const CJK_CHAR_REGEX = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/
type Entry = {
  id: string
  chinese: string
  autoEnglish: string
  finalEnglish: string
  isEnglishCustom: boolean
  customPinyin: Record<string | number, string>
  keyVocabulary: string
  languagePoints: string
  sentencePattern: string
  grammarNotes: string
  teachingNotes: string
}

type RubyToken = {
  index: number
  char: string
  auto: string
  custom: string
  shown: string
  isHan: boolean
}
const PHRASE_TRANSLATIONS: Record<string, string> = {
  你好吗: 'How are you?',
  你好: 'Hello.',
  谢谢: 'Thank you.',
  对不起: 'Sorry.',
  没关系: "It's okay.",
  我爱你: 'I love you.',
  喜欢: 'like',
  吃辣: 'eat spicy food',
  什么: 'what',
  计划: 'plan',
  有什么: 'have what',
  今天: 'today',
  明天: 'tomorrow',
  昨天: 'yesterday',
  老师: 'teacher',
  学生: 'student',
  学习: 'learn',
  中文: 'Chinese',
  汉字: 'Chinese characters',
  北京: 'Beijing',
  上海: 'Shanghai',
  咖啡: 'coffee',
  浓缩咖啡: 'espresso',
  美式咖啡: 'americano',
  拿铁: 'latte',
  卡布奇诺: 'cappuccino',
  这个: 'this',
  那个: 'that',
  中国: 'China',
  美国: 'USA',
  英国: 'UK',
  法国: 'France',
  德国: 'Germany',
  日本: 'Japan',
  韩国: 'Korea',
  吃饭: 'eat',
  喝: 'drink',
  水: 'water',
  喝咖啡: 'drink coffee',
  去上学: 'go to school',
  去上班: 'go to work',
  喜欢喝咖啡: 'like drinking coffee',
  这个是浓缩咖啡吗: 'Is this espresso?',
}
const CHAR_TRANSLATIONS: Record<string, string> = {
  你: 'you',
  我: 'I',
  他: 'he',
  她: 'she',
  它: 'it',
  们: '(plural)',
  好: 'good',
  吗: '(question)',
  很: 'very',
  是: 'am/is/are',
  有: 'have/has',
  不: 'not',
  没: 'not',
  要: 'want',
  会: 'can/will',
  想: 'think/want',
  去: 'go',
  来: 'come',
  看: 'look/see',
  听: 'listen/hear',
  说: 'speak/say',
  读: 'read',
  写: 'write',
  学: 'learn',
  大: 'big',
  小: 'small',
  多: 'many/much',
  少: 'few/little',
  上: 'up/on',
  下: 'down/under',
  左: 'left',
  右: 'right',
  前: 'front',
  后: 'back',
  这: 'this',
  那: 'that',
  哪: 'which/where',
  谁: 'who',
  几: 'how many',
  个: '(measure word)',
  岁: 'years old',
  点: "o'clock",
  分: 'minute',
  秒: 'second',
  年: 'year',
  月: 'month',
  日: 'day',
  号: 'date',
  天: 'day',
}
const PUNCTUATION_REGEX = /[，。！？；：、“”‘’（）《》〈〉,.!?;:'"()\-—]/

const createEntry = (): Entry => ({
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

const readStoredEntries = (): Entry[] => {
  const initial: Entry[] = [createEntry()]
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return initial
    }
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return initial
    }
    return parsed.map((entry: any) => ({
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

const getAutoPinyin = (char: string) => {
  if (!CJK_CHAR_REGEX.test(char)) {
    return ''
  }
  const result = pinyin(char, { toneType: 'symbol' })
  return typeof result === 'string' ? result.trim() : ''
}

const buildAutoPinyinList = (chinese: string) => {
  const hanChars = Array.from(chinese).filter((char) => CJK_CHAR_REGEX.test(char))
  if (!hanChars.length) {
    return []
  }
  const raw = pinyin(hanChars.join(''), { toneType: 'symbol', type: 'array' })
  if (Array.isArray(raw) && raw.length === hanChars.length) {
    return raw.map((item) => `${item ?? ''}`.trim())
  }
  return hanChars.map((char) => getAutoPinyin(char))
}

const splitWithPinyin = (entry: { chinese: string; customPinyin?: Record<string | number, string> }) => {
  const chars = Array.from(entry.chinese || '')
  const autoPinyinList = buildAutoPinyinList(entry.chinese || '')
  const tokens: RubyToken[] = []
  let hanCursor = 0
  let index = 0

  while (index < chars.length) {
    const char = chars[index]
    if (CJK_CHAR_REGEX.test(char)) {
      const auto = autoPinyinList[hanCursor] || getAutoPinyin(char)
      const custom = typeof entry.customPinyin?.[index] === 'string' ? entry.customPinyin[index] : ''
      const shown = custom.trim() || auto
      tokens.push({
        index,
        char,
        auto,
        custom,
        shown,
        isHan: true,
      })
      hanCursor += 1
      index += 1
      continue
    }

    const start = index
    let plain = ''
    while (index < chars.length && !CJK_CHAR_REGEX.test(chars[index])) {
      plain += chars[index]
      index += 1
    }
    tokens.push({
      index: start,
      char: plain,
      auto: '',
      custom: '',
      shown: '',
      isHan: false,
    })
  }

  return tokens
}

const generateFallbackEnglish = (chinese: string) => {
  const normalized = chinese.replace(/\s+/g, '').trim()
  if (!normalized) {
    return ''
  }
  if (PHRASE_TRANSLATIONS[normalized]) {
    return PHRASE_TRANSLATIONS[normalized]
  }
  const segments: string[] = []
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
  
  // Filter out redundant consecutive translations (e.g., 'like like')
  const uniqueSegments: string[] = []
  segments.forEach((seg, i) => {
    if (i === 0 || seg !== segments[i - 1]) {
      uniqueSegments.push(seg)
    }
  })

  const sentence = uniqueSegments.join(' ').replace(/\s+/g, ' ').trim()
  if (!sentence) return 'Translation draft unavailable. Please edit manually.'
  
  return sentence.charAt(0).toUpperCase() + sentence.slice(1) + (/[.!?]$/.test(sentence) ? '' : '.')
}

const TONE_MAP: Record<string, string[]> = {
  a: ['a', 'ā', 'á', 'ǎ', 'à'],
  e: ['e', 'ē', 'é', 'ě', 'è'],
  i: ['i', 'ī', 'í', 'ǐ', 'ì'],
  o: ['o', 'ō', 'ó', 'ǒ', 'ò'],
  u: ['u', 'ū', 'ú', 'ǔ', 'ù'],
  ü: ['ü', 'ǖ', 'ǘ', 'ǚ', 'ǜ'],
}

const ACCENT_TO_BASE: Record<string, string> = {
  ā: 'a1',
  á: 'a2',
  ǎ: 'a3',
  à: 'a4',
  ē: 'e1',
  é: 'e2',
  ě: 'e3',
  è: 'e4',
  ī: 'i1',
  í: 'i2',
  ǐ: 'i3',
  ì: 'i4',
  ō: 'o1',
  ó: 'o2',
  ǒ: 'o3',
  ò: 'o4',
  ū: 'u1',
  ú: 'u2',
  ǔ: 'u3',
  ù: 'u4',
  ǖ: 'ü1',
  ǘ: 'ü2',
  ǚ: 'ü3',
  ǜ: 'ü4',
}

const normalizePinyinBase = (value: string) =>
  value
    .replace(/u:/gi, 'ü')
    .replace(/v/gi, (match: string) => (match === 'V' ? 'Ü' : 'ü'))

const numberedSyllableToTone = (syllable: string) => {
  const normalized = normalizePinyinBase(syllable)
  const match = normalized.match(/^([A-Za-züÜ]+)([1-5])$/)
  if (!match) {
    return normalized
  }
  const base = match[1]
  const tone = Number(match[2])
  if (tone === 5) {
    return base
  }

  const lower = base.toLowerCase()
  let target = lower.indexOf('a')
  if (target < 0) target = lower.indexOf('e')
  if (target < 0 && lower.includes('ou')) target = lower.indexOf('o')
  if (target < 0) {
    for (let i = lower.length - 1; i >= 0; i -= 1) {
      if ('aeiouü'.includes(lower[i])) {
        target = i
        break
      }
    }
  }
  if (target < 0) {
    return base
  }

  const vowel = lower[target]
  const toned = TONE_MAP[vowel]?.[tone] || vowel
  const finalChar = base[target] === base[target].toUpperCase() ? toned.toUpperCase() : toned
  return `${base.slice(0, target)}${finalChar}${base.slice(target + 1)}`
}

const toNumberedSyllable = (syllable: string) => {
  let tone = 5
  const converted = Array.from(normalizePinyinBase(syllable)).map((char) => {
    const mapped = ACCENT_TO_BASE[char.toLowerCase()]
    if (!mapped) {
      return char
    }
    tone = Number(mapped[1])
    return mapped[0]
  })
  return `${converted.join('')}${tone}`
}

const normalizePinyinInput = (value: string) =>
  value.replace(/[A-Za-züÜvV:]+[1-5]/g, (syllable: string) => numberedSyllableToTone(syllable))

const getToneOptions = (source: string) => {
  const numbered = toNumberedSyllable(source || '')
  const base = numbered.replace(/[1-5]$/, '')
  if (!base) {
    return []
  }
  return [1, 2, 3, 4, 5].map((tone) => numberedSyllableToTone(`${base}${tone}`))
}

const shrink = (text: string, max = 20) => {
  if (!text) {
    return 'Untitled'
  }
  return text.length > max ? `${text.slice(0, max)}…` : text
}

export default function PinyinPage() {
  const [entries, setEntries] = useState<Entry[]>([createEntry()])
  const [hasMounted, setHasMounted] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'sentence' | 'presentation'>('sentence')
  const [activePinyinIndex, setActivePinyinIndex] = useState<number | null>(null)
  const [newVocabularyDraft, setNewVocabularyDraft] = useState('')
  const [showKeyVocabulary, setShowKeyVocabulary] = useState(true)
  const [showTeachingNotes, setShowTeachingNotes] = useState(false)
  const [isQuickCorrectOpen, setIsQuickCorrectOpen] = useState(false)
  const [quickStudentSaid, setQuickStudentSaid] = useState('')
  const [quickCorrectedChinese, setQuickCorrectedChinese] = useState('')
  const [quickAutoEnglish, setQuickAutoEnglish] = useState('')
  const [quickFinalEnglish, setQuickFinalEnglish] = useState('')
  const [quickIsEnglishCustom, setQuickIsEnglishCustom] = useState(false)
  const [quickDisplayOverride, setQuickDisplayOverride] = useState<{
    chinese: string
    autoEnglish: string
    finalEnglish: string
    customPinyin: Record<string | number, string>
  } | null>(null)
  const [fontScale, setFontScale] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isExportingPdf, setIsExportingPdf] = useState(false)
  const [copyState, setCopyState] = useState('idle')
  const [isTranslating, setIsTranslating] = useState(false)
  const exportRef = useRef<HTMLDivElement | null>(null)
  const fullscreenRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setEntries(readStoredEntries())
    setHasMounted(true)
  }, [])

  useEffect(() => {
    if (!hasMounted) {
      return
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  }, [entries, hasMounted])

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
    const token = selectedPreview.rubyItems.find((item) => item.isHan && item.index === activePinyinIndex)
    if (!token || !token.isHan) {
      setActivePinyinIndex(null)
    }
  }, [activePinyinIndex, selectedPreview])

  const updateEntry = (id: string, patch: Partial<Entry>) => {
    setEntries((prev) => prev.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)))
  }

  const updateSelectedEntry = (patch: Partial<Entry>) => {
    if (!selectedEntry) {
      return
    }
    updateEntry(selectedEntry.id, patch)
  }

  const updateCustomPinyin = (id: string, index: number, value: string) => {
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

  const handleChineseChange = (value: string) => {
    if (!selectedEntry) {
      return
    }
    const patch: Partial<Entry> = { chinese: value }
    if (!value.trim()) {
      patch.autoEnglish = ''
      if (!selectedEntry.isEnglishCustom || !selectedEntry.finalEnglish.trim()) {
        patch.finalEnglish = ''
        patch.isEnglishCustom = false
      }
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

  const deleteEntry = (id: string) => {
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

  const handleSelectEntry = (id: string) => {
    setSelectedId(id)
    setActivePinyinIndex(null)
    setCopyState('idle')
    setNewVocabularyDraft('')
    setQuickDisplayOverride(null)
  }

  const handleSelectToken = (token: RubyToken) => {
    if (!token.isHan) {
      return
    }
    setActivePinyinIndex(token.index)
  }

  const activeToken =
    activePinyinIndex == null || !selectedPreview
      ? null
      : selectedPreview.rubyItems.find((token) => token.isHan && token.index === activePinyinIndex) || null
  const toneOptions = useMemo(
    () => (activeToken?.isHan ? getToneOptions(activeToken.custom || activeToken.auto) : []),
    [activeToken],
  )

  const requestSmartTranslation = async (text: string): Promise<string> => {
    const normalized = text.trim()
    if (!normalized) {
      return ''
    }
    try {
      const response = await fetch('/api/pinyin/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: normalized }),
      })
      if (!response.ok) {
        throw new Error(`Translate failed with status ${response.status}`)
      }
      const data = await response.json()
      if (data.error) {
        console.error('Smart translation API returned error:', data.error)
        return '' // Return empty to allow UI to show error or fallback
      }
      const translated = typeof data?.translation === 'string' ? data.translation.trim() : ''
      return translated
    } catch (e) {
      console.error('Smart translation network error:', e)
      return ''
    }
  }

  useEffect(() => {
    if (!selectedEntry) {
      return
    }
    let disposed = false
    const entryId = selectedEntry.id
    const sourceChinese = selectedEntry.chinese
    if (!sourceChinese.trim()) {
      setIsTranslating(false)
      setEntries((prev) =>
        prev.map((entry) => {
          if (entry.id !== entryId) {
            return entry
          }
          const patch: Partial<Entry> = { autoEnglish: '' }
          if (!entry.isEnglishCustom || !entry.finalEnglish.trim()) {
            patch.finalEnglish = ''
            patch.isEnglishCustom = false
          }
          return { ...entry, ...patch }
        }),
      )
      return
    }
    setIsTranslating(true)
    const timer = window.setTimeout(async () => {
      const autoEnglish = await requestSmartTranslation(sourceChinese)
      if (disposed) {
        return
      }
      setEntries((prev) =>
        prev.map((entry) => {
          if (entry.id !== entryId || entry.chinese !== sourceChinese) {
            return entry
          }
          const patch: Partial<Entry> = { autoEnglish }
          if (!entry.isEnglishCustom || !entry.finalEnglish.trim()) {
            patch.finalEnglish = autoEnglish
            patch.isEnglishCustom = false
          }
          return { ...entry, ...patch }
        }),
      )
      setIsTranslating(false)
    }, 500)

    return () => {
      disposed = true
      window.clearTimeout(timer)
      setIsTranslating(false)
    }
  }, [selectedEntry?.id, selectedEntry?.chinese])

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

  const updateVocabularyItems = (items: string[]) => {
    updateSelectedEntry({ keyVocabulary: items.join('\n') })
  }

  const updateVocabularyItem = (index: number, value: string) => {
    const next = [...vocabularyItems]
    next[index] = value
    updateVocabularyItems(next.map((item) => item.trim()).filter(Boolean))
  }

  const removeVocabularyItem = (index: number) => {
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

  const regenerateDraft = async (replaceFinal = false) => {
    if (!selectedEntry) {
      return
    }
    const autoEnglish = await requestSmartTranslation(selectedEntry.chinese)
    const patch: Partial<Entry> = { autoEnglish }
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
    const autoEnglish = generateFallbackEnglish(chinese)
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
    const source = quickCorrectedChinese.trim()
    if (!source) {
      setQuickAutoEnglish('')
      if (!quickIsEnglishCustom) {
        setQuickFinalEnglish('')
      }
      return
    }
    const timer = window.setTimeout(async () => {
      const autoEnglish = await requestSmartTranslation(source)
      setQuickAutoEnglish(autoEnglish)
      if (!quickIsEnglishCustom) {
        setQuickFinalEnglish(autoEnglish)
      }
    }, 500)

    return () => window.clearTimeout(timer)
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
      
      // Modern clipboard API
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text)
      } else {
        // Fallback for non-secure contexts or older browsers
        const textArea = document.createElement('textarea')
        textArea.value = text
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        textArea.style.top = '-999999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        try {
          document.execCommand('copy')
        } catch (err) {
          console.error('Fallback copy failed', err)
          throw new Error('Copy failed')
        }
        document.body.removeChild(textArea)
      }
      
      setCopyState('copied')
      window.setTimeout(() => setCopyState('idle'), 1500)
    } catch (err) {
      console.error('Copy error:', err)
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

            <article className="preview-card surface" ref={exportRef} style={{ ['--ruby-scale' as any]: fontScale } as CSSProperties}>
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
                  <p className={`translation ${isTranslating ? 'is-translating' : ''}`}>
                    {isTranslating ? 'Translating...' : (renderPreview.finalEnglish || renderPreview.autoEnglish || 'No translation available. Please check AI config.')}
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
                <>
                  <div className="token-editor">
                    <span className="char-pill">{activeToken.char}</span>
                    <input
                      type="text"
                      className="input pinyin-input"
                      value={activeToken.custom}
                      placeholder={activeToken.auto}
                      onChange={(event) =>
                        updateCustomPinyin(
                          selectedEntry.id,
                          activeToken.index,
                          normalizePinyinInput(event.target.value),
                        )
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
                  <div className="tone-palette">
                    {toneOptions.map((tone) => (
                      <button
                        type="button"
                        key={tone}
                        className={`tone-chip ${activeToken.shown === tone ? 'active' : ''}`}
                        onClick={() => updateCustomPinyin(selectedEntry.id, activeToken.index, tone)}
                      >
                        {tone}
                      </button>
                    ))}
                  </div>
                  <p className="empty-note">Tip: type numbered pinyin like `ni3`, it auto-converts to `nǐ`.</p>
                </>
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
              <p className="draft-content">
                {isTranslating ? 'Translating...' : selectedEntry?.autoEnglish || 'No draft available yet.'}
              </p>
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

          <article className="preview-card surface" ref={exportRef} style={{ ['--ruby-scale' as any]: fontScale } as CSSProperties}>
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
                onClick={async () => {
                  const auto = await requestSmartTranslation(quickCorrectedChinese)
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
