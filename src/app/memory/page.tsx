'use client';

import { useState, useEffect, useRef } from 'react';
import { useMemory } from '../../context/MemoryContext';
import WordBlockDisplay from '@/components/WordBlockDisplay';
import TeachingCard from '@/components/TeachingCard';

export default function MemoryBankPage() {
  const { items, getDueItems, reviewItem, lastAddedCardId, setLastAddedCardId, hasLoadedInitialData } = useMemory(); // 获取 hasLoadedInitialData
  const dueItems = getDueItems();
  const [showAnswer, setShowAnswer] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (lastAddedCardId) {
      const element = document.getElementById(lastAddedCardId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setLastAddedCardId(null); // Clear the ID after scrolling
      }
    }
  }, [lastAddedCardId, setLastAddedCardId]);

  const handleReview = (id: string, remembered: boolean) => {
    reviewItem(id, remembered);
    setShowAnswer(null);
  };

  if (!hasLoadedInitialData) { // 如果数据尚未加载，显示加载状态
    return (
      <div className="p-8 max-w-4xl mx-auto min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center">
        <p className="text-xl text-slate-500">正在加载记忆卡片...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto min-h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Memory Bank 🧠</h1>
        <div className="text-slate-600">
          <span className="font-bold text-blue-600">{dueItems.length}</span> items due for review
        </div>
      </div>

      {dueItems.length > 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full">
          <div className="w-full bg-white rounded-2xl shadow-lg border border-slate-100 p-12 text-center min-h-[400px] flex flex-col justify-between">
            <div className="flex-1 flex flex-col justify-center">
              <span className="text-sm font-mono text-slate-400 mb-4 uppercase tracking-wider">
                From: {dueItems[0].context}
              </span>
              <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-8 leading-relaxed">
                {dueItems[0].text}
              </h2>
              
              {showAnswer === dueItems[0].id && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                  {dueItems[0].translation && (
                    <p className="text-xl text-slate-600 mb-4">{dueItems[0].translation}</p>
                  )}
                  <div className="flex justify-center gap-4 mt-8">
                    <button
                      onClick={() => handleReview(dueItems[0].id, false)}
                      className="px-8 py-3 bg-red-100 text-red-600 rounded-full font-semibold hover:bg-red-200 transition-colors"
                    >
                      Forgot 😔
                    </button>
                    <button
                      onClick={() => handleReview(dueItems[0].id, true)}
                      className="px-8 py-3 bg-green-100 text-green-600 rounded-full font-semibold hover:bg-green-200 transition-colors"
                    >
                      Remembered 😃
                    </button>
                  </div>
                </div>
              )}
            </div>

            {showAnswer !== dueItems[0].id && (
              <button
                onClick={() => setShowAnswer(dueItems[0].id)}
                className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
              >
                Show Answer
              </button>
            )}
          </div>
          <p className="mt-6 text-slate-500 text-sm">
            Based on Ebbinghaus Forgetting Curve
          </p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="text-6xl mb-6">🎉</div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">All Caught Up!</h2>
          <p className="text-slate-600 mb-8">You have no items due for review right now.</p>
          <div className="grid grid-cols-2 gap-4 w-full max-w-md">
            <div className="bg-white p-4 rounded-lg border border-slate-200">
              <div className="text-2xl font-bold text-blue-600 mb-1">{items.length}</div>
              <div className="text-xs text-slate-500 uppercase tracking-wide">Total Items</div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-slate-200">
              <div className="text-2xl font-bold text-green-600 mb-1">
                {items.filter(i => i.stage > 0).length}
              </div>
              <div className="text-xs text-slate-500 uppercase tracking-wide">Mastered</div>
            </div>
          </div>
        </div>
      )}

      {/* View All Items Section */}
      <div className="mt-12 w-full max-w-2xl mx-auto border-t border-slate-200 pt-8">
        <button 
          onClick={() => setShowAll(!showAll)}
          className="w-full flex items-center justify-center gap-2 text-slate-500 hover:text-blue-600 transition-colors py-2"
        >
          <span className="font-medium">
            {showAll ? 'Hide' : 'Show'} All {items.length} Items
          </span>
          <svg 
            className={`w-4 h-4 transform transition-transform duration-200 ${showAll ? 'rotate-180' : ''}`} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showAll && (
          <div className="grid gap-3 mt-6 animate-in fade-in slide-in-from-top-4 duration-300">
            {items.length === 0 ? (
              <p className="text-center text-slate-400 py-4">No items yet. Go add some!</p>
            ) : (
              items.map(item => (
                <TeachingCard
                    key={item.id}
                    title={item.context || 'General'}
                    rule="Placeholder Rule"
                    examples={item.examples || []}
                    exercise={item.exercise || "Placeholder Exercise"}
                    chineseText={item.text}
                    englishTranslation={item.translation}
                    pinyinText={item.pinyin}
                    answer={item.answer || "Placeholder Answer"} // Pass answer to TeachingCard
                    onEdit={(cardId: string) => console.log('Edit card:', cardId)}
                    onAddBelow={(cardId: string) => console.log('Add below card:', cardId)}
                  />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}