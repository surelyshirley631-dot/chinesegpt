'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';

export interface MemoryItem {
  id: string;
  text: string;
  translation?: string;
  context?: string; // Where it came from (e.g. "PDF", "Culture")
  addedAt: number;
  nextReviewAt: number;
  stage: number; // Ebbinghaus stage (0-5)
}

interface MemoryContextType {
  items: MemoryItem[];
  addToMemory: (text: string, context?: string, translation?: string) => Promise<void>;
  reviewItem: (id: string, remembered: boolean) => Promise<void>;
  getDueItems: () => MemoryItem[];
  syncLocalToCloud: () => Promise<void>;
  user: User | null;
}

const MemoryContext = createContext<MemoryContextType | undefined>(undefined);

// Ebbinghaus intervals in days: 1, 2, 4, 7, 15
const INTERVALS = [1, 2, 4, 7, 15];

export function MemoryProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<MemoryItem[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const supabase = createClient();

  // 1. Auth State Listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  // 2. Hybrid Data Loading
  useEffect(() => {
    const loadItems = async () => {
      if (user) {
        // Cloud Mode: Fetch from Supabase
        const { data, error } = await supabase
          .from('memory_items')
          .select('*')
          .order('next_review_at', { ascending: true });
        
        if (data) {
          const cloudItems: MemoryItem[] = data.map(item => ({
            id: item.id,
            text: item.text,
            translation: item.translation,
            context: item.context,
            addedAt: new Date(item.created_at).getTime(),
            nextReviewAt: Number(item.next_review_at),
            stage: item.stage
          }));
          setItems(cloudItems);
        } else if (error) {
          console.error('Error loading memory items:', error);
        }
      } else {
        // Local Mode: Load from localStorage
        const saved = localStorage.getItem('memory-bank');
        if (saved) {
          setItems(JSON.parse(saved));
        }
      }
    };

    loadItems();
  }, [user, supabase]);

  // 3. Save to local storage (Only in Local Mode)
  useEffect(() => {
    if (!user) {
      localStorage.setItem('memory-bank', JSON.stringify(items));
    }
  }, [items, user]);

  // 4. Sync Function (Local -> Cloud)
  const syncLocalToCloud = async () => {
    if (!user) return;
    
    const localSaved = localStorage.getItem('memory-bank');
    if (!localSaved) return;
    
    const localItems: MemoryItem[] = JSON.parse(localSaved);
    if (localItems.length === 0) return;

    if (confirm(`Found ${localItems.length} local items. Sync to cloud?`)) {
      const itemsToUpload = localItems.map(item => ({
        user_id: user.id,
        text: item.text,
        translation: item.translation,
        context: item.context,
        stage: item.stage,
        next_review_at: item.nextReviewAt
      }));

      const { error } = await supabase.from('memory_items').insert(itemsToUpload);
      
      if (!error) {
        alert('Sync complete! Clearing local storage.');
        localStorage.removeItem('memory-bank');
        // Reload page to refresh data from cloud
        window.location.reload();
      } else {
        alert('Sync failed: ' + error.message);
      }
    }
  };

  const addToMemory = async (text: string, context: string = 'General', translation?: string) => {
    const newItemTemp: MemoryItem = {
      id: Date.now().toString(), // Temp ID for optimistic update
      text,
      translation,
      context,
      addedAt: Date.now(),
      nextReviewAt: Date.now() + 24 * 60 * 60 * 1000,
      stage: 0
    };

    if (user) {
      // Cloud Save
      const { data, error } = await supabase.from('memory_items').insert({
        user_id: user.id,
        text,
        translation,
        context,
        stage: 0,
        next_review_at: newItemTemp.nextReviewAt
      }).select().single();

      if (data) {
        const confirmedItem: MemoryItem = {
          ...newItemTemp,
          id: data.id,
          addedAt: new Date(data.created_at).getTime()
        };
        setItems(prev => [...prev, confirmedItem]);
        alert(`Added "${text}" to Cloud Memory!`);
      } else {
        console.error('Error adding to cloud:', error);
        alert('Failed to save to cloud.');
      }
    } else {
      // Local Save
      setItems(prev => [...prev, newItemTemp]);
      alert(`Added "${text}" to Local Memory!`);
    }
  };

  const reviewItem = async (id: string, remembered: boolean) => {
    // Optimistic Update Calculation
    const currentItem = items.find(i => i.id === id);
    if (!currentItem) return;

    let nextStage = 0;
    let nextReviewAt = 0;

    if (remembered) {
      nextStage = Math.min(currentItem.stage + 1, INTERVALS.length - 1);
      const daysToAdd = INTERVALS[nextStage];
      nextReviewAt = Date.now() + daysToAdd * 24 * 60 * 60 * 1000;
    } else {
      nextStage = 0;
      nextReviewAt = Date.now() + 24 * 60 * 60 * 1000;
    }

    // Update State (Optimistic)
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      return {
        ...item,
        stage: nextStage,
        nextReviewAt: nextReviewAt
      };
    }));

    if (user) {
      // Cloud Update
      const { error } = await supabase
        .from('memory_items')
        .update({
          stage: nextStage,
          next_review_at: nextReviewAt
        })
        .eq('id', id);
      
      if (error) {
        console.error('Error updating cloud item:', error);
        // Revert optimistic update if needed (omitted for simplicity)
      }
    }
  };

  const getDueItems = () => {
    const now = Date.now();
    return items.filter(item => item.nextReviewAt <= now);
  };

  return (
    <MemoryContext.Provider value={{ items, addToMemory, reviewItem, getDueItems, syncLocalToCloud, user }}>
      {children}
    </MemoryContext.Provider>
  );
}

export function useMemory() {
  const context = useContext(MemoryContext);
  if (context === undefined) {
    throw new Error('useMemory must be used within a MemoryProvider');
  }
  return context;
}