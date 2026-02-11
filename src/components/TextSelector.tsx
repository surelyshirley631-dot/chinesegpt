'use client';

import { useState, useEffect, useRef } from 'react';
import { useMemory } from '../context/MemoryContext';

interface TextSelectorProps {
  children: React.ReactNode;
  contextSource: string; // e.g. "PDF", "Culture"
}

export default function TextSelector({ children, contextSource }: TextSelectorProps) {
  const { addToMemory } = useMemory();
  const [selection, setSelection] = useState<{ text: string; x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleSelection = () => {
      const selectedText = window.getSelection()?.toString().trim();
      
      if (selectedText && selectedText.length > 0 && containerRef.current) {
        const range = window.getSelection()?.getRangeAt(0);
        const rect = range?.getBoundingClientRect();
        const containerRect = containerRef.current.getBoundingClientRect();
        
        if (rect) {
          setSelection({
            text: selectedText,
            x: rect.left - containerRect.left + (rect.width / 2),
            y: rect.top - containerRect.top
          });
        }
      } else {
        setSelection(null);
      }
    };

    const container = containerRef.current;
    container?.addEventListener('mouseup', handleSelection);
    
    return () => {
      container?.removeEventListener('mouseup', handleSelection);
    };
  }, []);

  const handleAddToMemory = () => {
    if (selection) {
      addToMemory(selection.text, contextSource);
      setSelection(null);
      window.getSelection()?.removeAllRanges();
    }
  };

  return (
    <div ref={containerRef} className="relative">
      {children}
      
      {selection && (
        <div 
          className="absolute z-50 bg-slate-800 text-white px-3 py-1.5 rounded-lg shadow-lg text-sm font-medium cursor-pointer hover:bg-slate-700 transition-colors animate-in fade-in zoom-in duration-200"
          style={{ 
            left: selection.x, 
            top: selection.y,
            transform: 'translate(-50%, -120%)'
          }}
          onMouseDown={(e) => {
            e.preventDefault(); // Prevent losing selection
            handleAddToMemory();
          }}
        >
          Add to Memory 🧠
        </div>
      )}
    </div>
  );
}