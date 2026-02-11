'use client';

import { useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import TextSelector from '@/components/TextSelector';

// Configure worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export default function PDFLearningPage() {
  const [text, setText] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
      
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        fullText += pageText + '\n\n';
      }
      
      setText(fullText);
    } catch (error) {
      console.error('Error reading PDF:', error);
      alert('Error reading PDF file');
    } finally {
      setIsLoading(false);
    }
  };

  const speakText = () => {
    if (!text) return;
    
    // Use the same TTS logic as chat page
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = 0.6; // Enforce 0.6x speed
    
    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => setIsPlaying(false);
    
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-slate-800">PDF Learning Assistant</h1>
      
      {/* ... (upload UI remains the same) ... */}
      <div className="mb-8">
        <label className="block mb-4 text-sm font-medium text-slate-700">
          Upload Chinese Course PDF
        </label>
        <input
          type="file"
          accept=".pdf"
          onChange={handleFileUpload}
          className="block w-full text-sm text-slate-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100"
        />
      </div>

      {isLoading && (
        <div className="text-center py-12 text-slate-500">
          Extracting text from PDF...
        </div>
      )}

      {text && (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex gap-4 mb-4">
            <button
              onClick={isPlaying ? stopSpeaking : speakText}
              className={`px-6 py-2 rounded-full font-semibold transition-colors ${
                isPlaying 
                  ? 'bg-red-100 text-red-600 hover:bg-red-200'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isPlaying ? 'Stop Reading' : 'Read Aloud (0.6x)'}
            </button>
            <div className="text-sm text-slate-500 flex items-center">
              💡 Tip: Select any text to add it to your Memory Bank
            </div>
          </div>
          
          <div className="flex-1 overflow-auto bg-white rounded-xl shadow-sm border border-slate-200">
            <TextSelector contextSource="PDF">
              <div className="p-6 leading-loose text-lg text-slate-800 whitespace-pre-wrap">
                {text}
              </div>
            </TextSelector>
          </div>
        </div>
      )}
    </div>
  );
}