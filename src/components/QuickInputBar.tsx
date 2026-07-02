"use client";

import React, { useState } from "react";
import { useMemory } from "@/context/MemoryContext";
import { useToast } from "@/context/ToastContext";

export default function QuickInputBar() {
  const [inputValue, setInputValue] = useState("");
  const { addToMemory, setLastAddedCardId } = useMemory();
  const { showToast } = useToast();

  const handleAddCard = async (type: "词汇" | "句型" | "练习") => {
    if (!inputValue.trim()) {
      showToast("Input cannot be empty!", "error");
      return;
    }
    try {
      // For now, context will be the type, and translation will be empty
      const newCard = await addToMemory(inputValue, type, "");
      showToast(`Added ${type} card: "${inputValue}"`, "success");
      setLastAddedCardId(newCard.id);
      setInputValue("");
    } catch (error) {
      showToast("Failed to add card!", "error");
      console.error("Failed to add card:", error);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-lg flex items-center space-x-2 z-30">
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyPress={(e) => {
          if (e.key === "Enter") {
            handleAddCard("词汇"); // Default to '词汇' on Enter
          }
        }}
        placeholder="Enter Chinese content..."
        className="flex-grow px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
      />
      <button
        onClick={() => handleAddCard("词汇")}
        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        Add Word Card
      </button>
      <button
        onClick={() => handleAddCard("句型")}
        className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
      >
        Add Sentence Pattern
      </button>
      <button
        onClick={() => handleAddCard("练习")}
        className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
      >
        Add Exercise
      </button>
    </div>
  );
}
