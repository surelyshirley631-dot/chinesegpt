"use client";

import React from "react";
import { pinyin } from "pinyin-pro";

interface WordBlockDisplayProps {
  chineseText: string;
  englishTranslation?: string;
  pinyinText?: string; // Add pinyinText prop
}

export default function WordBlockDisplay({
  chineseText,
  englishTranslation,
  pinyinText, // Destructure pinyinText
}: WordBlockDisplayProps) {
  const delimiters = /[；，,。\n]/;
  const segments = chineseText.split(delimiters).filter(Boolean); // Split and remove empty strings

  return (
    <div className="flex flex-wrap gap-2">
      {segments.map((segment, index) => {
        // Use provided pinyinText if available, otherwise generate
        const currentPinyin = pinyinText || pinyin(segment, { toneType: "num" });
        return (
          <div
            key={index}
            className="flex flex-col items-center justify-center p-2 bg-white rounded-lg shadow-sm border border-slate-100 min-w-[80px]"
          >
            <span className="text-xl font-bold text-slate-900">
              {segment}
            </span>
            <span className="text-sm text-slate-600">
              {currentPinyin}
            </span>
            {englishTranslation && (
              <span className="text-xs text-slate-400">
                {/* This is a simplified approach. A more robust solution would map translations to segments. */}
                {englishTranslation}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
