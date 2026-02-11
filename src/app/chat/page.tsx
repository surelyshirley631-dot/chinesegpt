'use client';

import { useState, useRef, useEffect } from 'react';
import { Mic, Send, Volume2, Settings, X, Cloud, Monitor } from 'lucide-react';
import { CLOUD_VOICES, playCloudTTS } from './EdgeTTSHandler';

type Message = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '你好! I am ChineseGPT. How can I help you practice your Chinese today?',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [showSettings, setShowSettings] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  // selectedVoiceURI can be a system voice URI OR a Cloud Voice shortName
  const [selectedVoiceURI, setSelectedVoiceURI] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  // Test voice function
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const testVoice = (voice: any, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Check if it's a Cloud Voice
    if (voice.shortName) {
      // Use specific text based on region
      let text = "你好，我是您的中文助手。";
      if (voice.locale === 'zh-HK') text = "你好，我係你嘅中文助手。"; // Cantonese
      
      playCloudTTS(text, voice.shortName, speechRate).catch(err => {
        console.error("Cloud TTS Error:", err);
        alert("Cloud TTS failed. Please check your connection.");
      });
      return;
    }

    // System Voice
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance("你好，我是您的中文助手。");
    utterance.lang = 'zh-CN';
    utterance.voice = voice;
    utterance.rate = speechRate;
    window.speechSynthesis.speak(utterance);
  };

  // Load voices
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const updateVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      
      // Strict filter: Only Google Mandarin, Google Cantonese, Google Taiwan
      const googleVoices = voices.filter(v => 
        v.name.includes('Google') && 
        (v.lang === 'zh-CN' || v.lang === 'zh-HK' || v.lang === 'zh-TW')
      );
      
      // Fallback: If no Google voices, show all Chinese voices (but prefer Google)
      const targetVoices = googleVoices.length > 0 
        ? googleVoices 
        : voices.filter(v => v.lang.includes('zh') || v.lang.includes('CN'));

      setAvailableVoices(targetVoices);

      // Auto-select Google Mandarin (zh-CN) if available and nothing selected
      if (!selectedVoiceURI) {
        const googleMandarin = googleVoices.find(v => v.lang === 'zh-CN');
        if (googleMandarin) {
          setSelectedVoiceURI(googleMandarin.voiceURI);
        } else if (targetVoices.length > 0) {
          setSelectedVoiceURI(targetVoices[0].voiceURI);
        }
      }
    };

    updateVoices();
    
    // Chrome requires this event to load voices
    window.speechSynthesis.onvoiceschanged = updateVoices;
    
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'zh-CN'; // Default to Chinese, but user might speak English. 
        // Ideally we detect or toggle, but let's stick to Chinese/English mixed or just Chinese for input.
        // Actually for a tutor, maybe auto-detect is best? But browser API usually needs specific lang.
        // Let's set to 'zh-CN' as it's a Chinese learning app, but maybe 'en-US' if they want to ask questions?
        // Let's try 'zh-CN' as primary.
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInput((prev) => prev + transcript);
          setIsRecording(false);
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onerror = (event: any) => {
          console.error('Speech recognition error', event.error);
          setIsRecording(false);
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
      setIsRecording(true);
    }
  };

  const speakMessage = (content: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    
    // Cancel any current speaking
    window.speechSynthesis.cancel();

    // 1. Remove <rt> tags and their content (pinyin) FIRST to avoid reading pinyin
    const noRt = content.replace(/<rt>.*?<\/rt>/g, '');
    
    // 2. Remove all other HTML tags to get raw text
    let text = noRt.replace(/<[^>]+>/g, '');

    // 3. Remove Markdown characters (asterisks *, underscores _, hash #, brackets [], etc.)
    // User specifically complained about asterisks being read out.
    text = text.replace(/[\*\_#\`\[\]]/g, '');

    // 4. Remove Pinyin words (words containing Latin Extended tone marks)
    // User complained that "jiānbǐng" was being read as "J-I-A-N-B-I-N-G" (letters) instead of the word.
    // Since we have the Chinese characters (e.g. 煎饼) which provide the correct pronunciation,
    // we strip the Pinyin text to avoid this spelling-out behavior.
    text = text.replace(/[a-zA-Z]*[\u00C0-\u024F\u1E00-\u1EFF][a-zA-Z\u00C0-\u024F\u1E00-\u1EFF]*/g, '');

    // 5. "Only read Chinese" requirement (Reverted to this strict mode)
    // Strategy: Filter for lines containing Chinese, then aggressively strip non-Chinese/non-Number characters from those lines.
    const lines = text.split('\n');
    const processedLines = lines.map(line => {
      // If the line has NO Chinese characters, ignore it completely (it's likely English explanation)
      if (!/[\u4e00-\u9fa5]/.test(line)) return '';

      // If it has Chinese, keep it but strip English/Latin letters to avoid "strange spellings"
      // We keep Chinese chars, numbers, and common punctuation.
      // Remove Basic Latin letters
      return line.replace(/[a-zA-Z]/g, '');
    });

    // Join and clean up
    let textToPlay = processedLines.join(' ');
    
    // 6. Remove ALL punctuation marks (both Chinese and English)
    // User specifically requested not to read any punctuation like "dot", "parenthesis", etc.
    // We replace them with spaces to maintain natural pauses in speech.
    textToPlay = textToPlay.replace(/[!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~。，、；：？！…—·ˉ¨‘’“”〝〞﹙﹚﹛﹜﹝﹞★]/g, ' ');

    // 7. Clean up artifacts like empty parentheses "()" or double spaces
    textToPlay = textToPlay
      .replace(/\s+/g, ' ')     // Collapse spaces
      .trim();

    // If nothing remains, do not speak.
    if (!textToPlay) return;
    
    // Check if it's a Cloud Voice
    const cloudVoice = CLOUD_VOICES.find(v => v.shortName === selectedVoiceURI);
    if (cloudVoice) {
      playCloudTTS(textToPlay, cloudVoice.shortName, 0.6).catch(err => { // Enforce 0.6x for Cloud TTS too
        console.error("Cloud TTS failed during playback:", err);
      });
      return;
    }

    const utterance = new SpeechSynthesisUtterance(textToPlay);
    utterance.lang = 'zh-CN'; // Set language to Chinese
    utterance.rate = 0.6; // Enforce 0.6x slow speed for Chinese learning
    
    // Apply selected voice
    if (selectedVoiceURI) {
      const voice = availableVoices.find(v => v.voiceURI === selectedVoiceURI);
      if (voice) utterance.voice = voice;
    }
    
    window.speechSynthesis.speak(utterance);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // 使用 .filter 过滤掉第一条初始的助手欢迎语，确保发给后端的第一条是 user
          messages: [...messages, userMessage]
            .filter((msg, index) => !(index === 0 && msg.role === 'assistant'))
            .map(({ role, content }) => ({
              role: role === 'assistant' ? 'model' : role, // 适配 Gemini 的 role 命名
              content,
            })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.message.content,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      
      // Auto-play the response
      speakMessage(data.message.content);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error('Error:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: `Sorry, something went wrong: ${error.message}`,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-slate-50 overflow-hidden">
      {/* Sidebar - Desktop only */}
      <aside className="hidden md:flex md:w-80 flex-col bg-white border-r border-slate-200 p-6 overflow-y-auto">
        <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
          <span className="w-1 h-6 bg-blue-600 rounded-full"></span>
          Recent Highlights
        </h2>
        <div className="space-y-4">
          {/* Highlight Item 1 */}
          <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 hover:border-blue-300 transition-all cursor-pointer group">
            <div className="flex justify-between items-start mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">Vocabulary</span>
              <span className="text-xs text-slate-400 group-hover:text-blue-500 transition-colors">2m ago</span>
            </div>
            <p className="text-lg font-medium text-slate-800 mb-1">你好 (Nǐ hǎo)</p>
            <p className="text-sm text-slate-500">Hello / Hi</p>
          </div>

          {/* Highlight Item 2 */}
          <div className="p-4 bg-white rounded-xl border border-slate-200 hover:border-blue-300 transition-all cursor-pointer group hover:shadow-sm">
            <div className="flex justify-between items-start mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-purple-600">Grammar</span>
              <span className="text-xs text-slate-400 group-hover:text-blue-500 transition-colors">15m ago</span>
            </div>
            <p className="text-lg font-medium text-slate-800 mb-1">Past Tense (了)</p>
            <p className="text-sm text-slate-500">Subject + Verb + 了</p>
          </div>

          {/* Highlight Item 3 */}
          <div className="p-4 bg-white rounded-xl border border-slate-200 hover:border-blue-300 transition-all cursor-pointer group hover:shadow-sm">
            <div className="flex justify-between items-start mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-600">Culture</span>
              <span className="text-xs text-slate-400 group-hover:text-blue-500 transition-colors">1h ago</span>
            </div>
            <p className="text-lg font-medium text-slate-800 mb-1">Tea Etiquette</p>
            <p className="text-sm text-slate-500">Finger tapping thanks</p>
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <section className="flex-1 flex flex-col relative w-full bg-slate-50">
        
        {/* Header / Settings Toggle */}
        {/* Voice Settings Button & Menu */}
        <div className="fixed top-4 right-4 z-50">
          <button 
            onClick={() => setShowSettings(!showSettings)} 
            className="p-2 bg-white/90 backdrop-blur rounded-full shadow-lg border border-slate-100 text-slate-600 hover:text-blue-600 hover:scale-105 transition-all"
            title="Voice Settings"
          >
            <Settings size={20} />
          </button>

          {showSettings && (
            <div className="absolute top-12 right-0 bg-white/95 backdrop-blur-sm p-4 rounded-xl shadow-2xl border border-slate-200 w-80 animate-in fade-in zoom-in-95 duration-200 max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
                <span className="font-semibold text-slate-800">Voice Settings</span>
                <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <X size={18} />
                </button>
              </div>
              
              <div className="space-y-5">
                {/* Voice Selection */}
                <div>
                   <div className="flex justify-between items-center mb-2">
                     <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Voice Persona</label>
                   </div>
                   
                   <div className="space-y-4">
                     {/* System Voices Only (Strict Google Filter) */}
                     <div>
                       <div className="flex items-center gap-2 mb-2 px-1 border-t border-slate-100 pt-3">
                         <Monitor size={14} className="text-slate-400" />
                         <span className="text-xs font-semibold text-slate-500">System Voices (Google)</span>
                       </div>
                       <div className="grid grid-cols-1 gap-2">
                         {/* Group by Region */}
                         {(() => {
                           // Helper to render voice item
                           const renderVoiceItem = (voice: SpeechSynthesisVoice) => (
                             <div
                               key={voice.voiceURI}
                               onClick={() => setSelectedVoiceURI(voice.voiceURI)}
                               className={`group flex items-center justify-between p-3 rounded-lg border text-sm cursor-pointer transition-all ${
                                 selectedVoiceURI === voice.voiceURI
                                   ? 'bg-slate-100 border-slate-400 text-slate-700'
                                   : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                               }`}
                             >
                               <div className="flex flex-col overflow-hidden">
                                 <span className="font-medium truncate pr-2">{voice.name}</span>
                                 <span className="text-[10px] text-slate-400 truncate">{voice.lang}</span>
                               </div>
                               
                               <div className="flex items-center gap-2 shrink-0">
                                 <button
                                   onClick={(e) => testVoice(voice, e)}
                                   className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                                 >
                                   <Volume2 size={14} />
                                 </button>
                                 {selectedVoiceURI === voice.voiceURI && (
                                   <div className="w-2 h-2 rounded-full bg-slate-400 shrink-0"></div>
                                 )}
                               </div>
                             </div>
                           );

                           const mainland = availableVoices.filter(v => v.lang === 'zh-CN');
                           const hk = availableVoices.filter(v => v.lang === 'zh-HK');
                           const tw = availableVoices.filter(v => v.lang === 'zh-TW');

                           return (
                             <>
                               {mainland.length > 0 && (
                                 <div className="mb-2">
                                   <p className="text-[10px] text-slate-400 font-bold mb-1 ml-1">Mainland China</p>
                                   <div className="space-y-1">{mainland.map(renderVoiceItem)}</div>
                                 </div>
                               )}
                               {hk.length > 0 && (
                                 <div className="mb-2">
                                   <p className="text-[10px] text-slate-400 font-bold mb-1 ml-1">Hong Kong</p>
                                   <div className="space-y-1">{hk.map(renderVoiceItem)}</div>
                                 </div>
                               )}
                               {tw.length > 0 && (
                                 <div className="mb-2">
                                   <p className="text-[10px] text-slate-400 font-bold mb-1 ml-1">Taiwan</p>
                                   <div className="space-y-1">{tw.map(renderVoiceItem)}</div>
                                 </div>
                               )}
                               {availableVoices.length === 0 && (
                                 <p className="text-xs text-slate-400 italic p-2 bg-slate-50 rounded">
                                   No Chinese system voices found.
                                 </p>
                               )}
                             </>
                           );
                         })()}
                       </div>
                     </div>
                   </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-3">Speaking Speed ({speechRate}x)</label>
                  <div className="px-1">
                    <input 
                      type="range" 
                      min="0.5" 
                      max="1.5" 
                      step="0.1" 
                      value={speechRate}
                      onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                    <div className="flex justify-between text-xs text-slate-400 mt-2 font-medium">
                      <span>0.5x</span>
                      <span>1.0x</span>
                      <span>1.5x</span>
                    </div>
                  </div>
                </div>
                
                <div className="pt-2 border-t border-slate-100">
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    Note: These voices are provided by your Operating System. For better quality, please install &quot;Enhanced&quot; voices in your Mac/Windows system settings.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Scrollable Message Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 scroll-smooth">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`
                  ${msg.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-2xl rounded-tr-none' 
                    : 'bg-white border border-slate-200 rounded-2xl rounded-tl-none'
                  } 
                  p-6 max-w-[90%] md:max-w-[75%] shadow-sm
                `}
              >
                {msg.role === 'assistant' && (
                  <div className="flex items-center gap-3 mb-3 border-b border-slate-100 pb-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">AI</div>
                    <span className="text-sm font-semibold text-slate-800">ChineseGPT</span>
                  </div>
                )}
                <div className={`leading-relaxed text-lg ${msg.role === 'assistant' ? 'text-slate-700' : 'text-white'}`}>
                  {msg.role === 'assistant' ? (
                     <div dangerouslySetInnerHTML={{ __html: msg.content }} />
                  ) : (
                    msg.content.split('\n').map((line, i) => (
                      <p key={i} className="mb-2 last:mb-0">{line}</p>
                    ))
                  )}
                </div>
                
                {/* TTS Replay Button for Assistant */}
                {msg.role === 'assistant' && (
                  <button 
                    onClick={() => speakMessage(msg.content)}
                    className="mt-2 text-slate-400 hover:text-blue-600 transition-colors flex items-center gap-1 text-sm"
                    title="Read aloud"
                  >
                    <Volume2 size={16} />
                    <span>Read</span>
                  </button>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
               <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none p-6 shadow-sm">
                 <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-100"></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200"></div>
                 </div>
               </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area - Fixed at bottom of flex column (no overlap) */}
        <div className="w-full bg-white border-t-2 border-slate-100 p-6 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <div className="max-w-3xl mx-auto flex flex-col items-center justify-end pb-4">
             {/* Text Input Row */}
             <div className="w-full flex items-center gap-4 mb-6">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  className="flex-1 bg-white border border-slate-300 rounded-full px-6 py-4 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                />
                <button 
                  onClick={handleSend}
                  disabled={isLoading || !input.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-6 h-6" />
                </button>
             </div>

            {/* Mic Button */}
            <button 
              onClick={toggleRecording}
              className={`group relative flex items-center justify-center w-20 h-20 rounded-full shadow-xl transition-all focus:outline-none focus:ring-4 cursor-pointer ${
                isRecording 
                  ? 'bg-red-500 hover:bg-red-600 focus:ring-red-200' 
                  : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-200'
              }`}
            >
              {/* Pulsing effect rings - only active when NOT recording to invite user, or active when recording? 
                  Usually pulsing means "listening". Let's pulse when recording.
              */}
              <span className={`absolute w-full h-full rounded-full opacity-75 animate-ping ${isRecording ? 'bg-red-400 block' : 'bg-blue-400 hidden group-hover:block'}`}></span>
              
              <span className="relative z-10">
                <Mic className={`w-8 h-8 ${isRecording ? 'text-white animate-pulse' : 'text-white'}`} />
              </span>
            </button>
            <p className="text-center text-slate-500 font-medium mt-4 animate-pulse">Tap to speak</p>
          </div>
        </div>
      </section>
    </div>
  );
}
