"use client";

import React, { useState, useRef } from "react";
import { useMemory } from "@/context/MemoryContext";
import { useToast } from "@/context/ToastContext";
import { pinyin } from "pinyin-pro";

interface CardCreationPanelProps {
  onClose: () => void;
  onSave: (newCardId: string) => void;
}

export default function CardCreationPanel({ onClose, onSave }: CardCreationPanelProps) {
  const { addToMemory, setLastAddedCardId } = useMemory();
  const { showToast } = useToast();
  const [title, setTitle] = useState("");
  const [chineseInput, setChineseInput] = useState("");
  const [cardType, setCardType] = useState<"词汇" | "句型" | "练习">("词汇");
  const [examplesInput, setExamplesInput] = useState(""); // New state for examples
  const [exerciseInput, setExerciseInput] = useState(""); // New state for exercise
  const [answerInput, setAnswerInput] = useState(""); // New state for answer
  const chineseInputRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!chineseInput.trim()) {
      showToast("中文输入内容不能为空！", "error");
      return;
    }

    let currentContext = title.trim();
    let itemsToProcess: string[] = [];
    let inputToParse = chineseInput.trim();

    // Check for explicit title in chineseInput, e.g., "星期: 周一；周二"
    const firstColonIndex = inputToParse.indexOf(':');
    if (firstColonIndex !== -1 && firstColonIndex < inputToParse.indexOf(' ') || firstColonIndex !== -1 && inputToParse.indexOf(' ') === -1) {
      currentContext = inputToParse.substring(0, firstColonIndex).trim();
      inputToParse = inputToParse.substring(firstColonIndex + 1).trim();
    } else if (currentContext === "" && inputToParse.length > 0) {
      // If no explicit title in chineseInput and no title in state, try to infer from first word
      const firstDelimiterIndex = inputToParse.search(/[；，,。\n]/);
      if (firstDelimiterIndex !== -1) {
        currentContext = inputToParse.substring(0, firstDelimiterIndex).trim();
        inputToParse = inputToParse.substring(firstDelimiterIndex + 1).trim();
      } else {
        // If no delimiters, the whole input is one item, context is the first word
        currentContext = inputToParse.split(' ')[0].trim();
      }
    }

    // Split remaining input by various delimiters
    itemsToProcess = inputToParse.split(/[；，,。\n]/).map(item => item.trim()).filter(item => item.length > 0);

    if (itemsToProcess.length === 0 && inputToParse.length > 0) {
      // If after splitting, no items, but there was input, treat the whole input as one item
      itemsToProcess.push(inputToParse);
    } else if (itemsToProcess.length === 0 && inputToParse.length === 0 && chineseInput.trim().length > 0) {
      // Fallback for single item without explicit context or delimiters
      itemsToProcess.push(chineseInput.trim());
    }

    if (itemsToProcess.length === 0) {
      showToast("没有可添加的卡片内容！", "error");
      return;
    }

    let lastId = "";
    for (const itemText of itemsToProcess) {
      const newCard = await addToMemory(
        itemText,
        currentContext || cardType, // Use inferred context or cardType as fallback
        "", // No translation for now
        pinyin(itemText, { toneType: "num" }),
        examplesInput.split('\n').filter(Boolean), // Pass examples
        exerciseInput, // Pass exercise
        answerInput // Pass answer
      );
      lastId = newCard.id;
    }
    
    setTitle("");
    setChineseInput("");
    setExamplesInput(""); // Clear examples
    setExerciseInput(""); // Clear exercise
    setAnswerInput(""); // Clear answer
    setCardType("词汇");
    showToast(`已添加 ${itemsToProcess.length} 张卡片！`, "success");
    setLastAddedCardId(lastId);
    onSave(lastId);
    onClose();
    if (chineseInputRef.current) {
      chineseInputRef.current.focus();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-slate-800">创建新卡片</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-1">
              标题
            </label>
            <input
              type="text"
              id="title"
              className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="mb-4">
            <label htmlFor="chineseInput" className="block text-sm font-medium text-slate-700 mb-1">
              中文输入
            </label>
            <textarea
              id="chineseInput"
              rows={4}
              ref={chineseInputRef}
              className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={chineseInput}
              onChange={(e) => setChineseInput(e.target.value)}
              required
            ></textarea>
          </div>
          <div className="mb-4">
            <label htmlFor="examplesInput" className="block text-sm font-medium text-slate-700 mb-1">
              例句 (每行一个)
            </label>
            <textarea
              id="examplesInput"
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={examplesInput}
              onChange={(e) => setExamplesInput(e.target.value)}
            ></textarea>
          </div>
          <div className="mb-4">
            <label htmlFor="exerciseInput" className="block text-sm font-medium text-slate-700 mb-1">
              练习
            </label>
            <textarea
              id="exerciseInput"
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={exerciseInput}
              onChange={(e) => setExerciseInput(e.target.value)}
            ></textarea>
          </div>
          <div className="mb-4">
            <label htmlFor="answerInput" className="block text-sm font-medium text-slate-700 mb-1">
              答案
            </label>
            <input
              type="text"
              id="answerInput"
              className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={answerInput}
              onChange={(e) => setAnswerInput(e.target.value)}
            />
          </div>
          <div className="mb-6">
            <span className="block text-sm font-medium text-slate-700 mb-2">类型选择</span>
            <div className="flex space-x-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="form-radio"
                  name="cardType"
                  value="词汇"
                  checked={cardType === "词汇"}
                  onChange={() => setCardType("词汇")}
                />
                <span className="ml-2 text-slate-700">词汇</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="form-radio"
                  name="cardType"
                  value="句型"
                  checked={cardType === "句型"}
                  onChange={() => setCardType("句型")}
                />
                <span className="ml-2 text-slate-700">句型</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="form-radio"
                  name="cardType"
                  value="练习"
                  checked={cardType === "练习"}
                  onChange={() => setCardType("练习")}
                />
                <span className="ml-2 text-slate-700">练习</span>
              </label>
            </div>
          </div>
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-500"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}