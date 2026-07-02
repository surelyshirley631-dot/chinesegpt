"use client";

import { useState } from "react";
import { PlusIcon } from "@heroicons/react/20/solid";
import CardCreationPanel from "./CardCreationPanel";
import { useToast } from "@/context/ToastContext";
import { useMemory } from "@/context/MemoryContext";

export default function FloatingAddButton() {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const { showToast } = useToast();
  const { setLastAddedCardId } = useMemory();

  const handleOpenPanel = () => {
    setIsPanelOpen(true);
  };

  const handleClosePanel = () => {
    setIsPanelOpen(false);
  };

  const handleSaveCard = () => {
    showToast("卡片已添加！", "success");
  };

  return (
    <>
      <button
        className="fixed bottom-4 right-4 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-full shadow-lg flex items-center space-x-2 z-40"
        onClick={handleOpenPanel}
      >
        <PlusIcon className="h-6 w-6" />
        <span>New Card</span>
      </button>
      {isPanelOpen && (
        <CardCreationPanel onClose={handleClosePanel} onSave={handleSaveCard} />
      )}
    </>
  );
}
