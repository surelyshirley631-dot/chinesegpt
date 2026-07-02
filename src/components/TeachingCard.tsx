"use client";

import React, { useState } from "react";
import WordBlockDisplay from "./WordBlockDisplay";

interface TeachingCardProps {
  title: string;
  rule: string;
  examples: string[];
  exercise: string; // Placeholder for now, will be more complex later
  chineseText: string;
  englishTranslation?: string;
  pinyinText?: string; // New prop for pinyin
  answer?: string; // New prop for answer
  onEdit: (cardId: string) => void;
  onAddBelow: (cardId: string) => void;
}

export default function TeachingCard({
  title,
  rule,
  examples,
  exercise,
  chineseText,
  englishTranslation,
  pinyinText,
  onEdit,
  onAddBelow,
  answer, // Destructure answer
}: TeachingCardProps) {
  const [showExamples, setShowExamples] = useState(false);
  const [showExercise, setShowExercise] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-100 mb-4">
      {/* Control Buttons (Placeholder for now) */}
      <div className="flex justify-end mb-2">
        <button className="text-sm text-blue-500 hover:text-blue-700 mr-2" onClick={() => setShowExamples(!showExamples)}>例句</button>
        <button className="text-sm text-blue-500 hover:text-blue-700 mr-2" onClick={() => setShowExercise(!showExercise)}>练习</button>
        <button className="text-sm text-blue-500 hover:text-blue-700 mr-2" onClick={() => setShowAnswer(!showAnswer)}>答案</button>
        <button className="text-sm text-blue-500 hover:text-blue-700 mr-2" onClick={() => onEdit("placeholder-id")}>编辑</button>
        <button className="text-sm text-blue-500 hover:text-blue-700" onClick={() => onAddBelow("placeholder-id")}>在下方新增</button>
      </div>

      {/* Title */}
      <h3 className="text-2xl font-bold text-slate-800 mb-3">{title}</h3>

      {/* Word Block Display */}
      <div className="mb-4">
        <WordBlockDisplay chineseText={chineseText} englishTranslation={englishTranslation} pinyinText={pinyinText} />
      </div>

      {/* Rule Area */}
      <div className="mb-4 p-3 bg-blue-50 rounded-md border border-blue-100">
        <p className="text-blue-800 font-medium">{rule}</p>
      </div>

      {/* Example Area */}
      <div className="mb-4">
        <button
          onClick={() => setShowExamples(!showExamples)}
          className="flex items-center text-blue-600 hover:text-blue-800 font-medium"
        >
          例句 ({examples.length})
          <svg
            className={`w-4 h-4 ml-1 transform transition-transform duration-200 ${
              showExamples ? "rotate-180" : ""
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {showExamples && (
          <div className="mt-2 pl-4 border-l-2 border-blue-200">
            {examples.map((ex, i) => (
              <p key={i} className="text-slate-700 mb-1">
                {ex}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Exercise Area */}
      <div>
        <button
          onClick={() => setShowExercise(!showExercise)}
          className="flex items-center text-green-600 hover:text-green-800 font-medium"
        >
          练习
          <svg
            className={`w-4 h-4 ml-1 transform transition-transform duration-200 ${
              showExercise ? "rotate-180" : ""
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {showExercise && (
          <div className="mt-2 pl-4 border-l-2 border-green-200">
            <p className="text-slate-700 mb-2">{exercise}</p>
            <button
              onClick={() => setShowAnswer(!showAnswer)}
              className="text-sm text-purple-600 hover:text-purple-800 font-medium"
            >
              {showAnswer ? "隐藏答案" : "显示答案"}
            </button>
            {showAnswer && (
              <p className="mt-1 text-purple-800 font-bold">答案: {answer}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
