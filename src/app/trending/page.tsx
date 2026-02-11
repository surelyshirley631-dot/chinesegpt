'use client';

import { useState, useEffect } from 'react';
import { useMemory } from '../../context/MemoryContext';
import TextSelector from '@/components/TextSelector';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';

// Define rich content types
interface TrendingItem {
  id: string;
  zh: string;
  pinyin: string;
  en: string;
  desc: string;
  usage: string; // Usage context/explanation
  example: { zh: string; en: string };
  imageUrl?: string;
}

// Use LoremFlickr with SAFE keywords and locks because Unsplash/Wiki are often blocked in China
const INITIAL_TRENDING_WORDS: TrendingItem[] = [
  {
    id: '1',
    zh: "破防",
    pinyin: "pò fáng",
    en: "Overwhelmed / Emotional breakdown",
    desc: "Originally a gaming term meaning 'defense broken', now used when someone is emotionally overwhelmed by something touching or shocking.",
    usage: "Use this when you see something very touching (like a sad movie) or when someone hits a sore spot in an argument.",
    example: { zh: "看到这个视频我直接破防了。", en: "I was totally overwhelmed/touched when I saw this video." },
    imageUrl: "https://p3-pc-sign.douyinpic.com/tos-cn-i-0813c001/oUQDNKA8NwzbBECF6OfB7rAAEEEfpzAIMAfF7v~noop.jpeg?biz_tag=pcweb_cover&card_type=303&column_n=0&from=327834062&lk3s=138a59ce&s=PackSourceEnum_SEARCH&se=false&x-expires=1771988400&x-signature=bMeBLYd6Dgb%2FKba7EJBT8hB6kek%3D"
  },
  {
    id: '2',
    zh: "社恐",
    pinyin: "shè kǒng",
    en: "Social phobia / Socially awkward",
    desc: "Short for 'social phobia' (社交恐惧症), describing people who are afraid of or awkward in social situations.",
    usage: "Commonly used by introverts to describe themselves humorously when they want to avoid social gatherings.",
    example: { zh: "我是个社恐，不敢去派对。", en: "I'm socially awkward, I dare not go to the party." },
    imageUrl: "https://loremflickr.com/800/600/cat,box?lock=202"
  },
  {
    id: '3',
    zh: "种草",
    pinyin: "zhòng cǎo",
    en: "To recommend / To plant a desire",
    desc: "Meaning to recommend a product to someone so strongly that they want to buy it (planting the grass/desire in their mind).",
    usage: "Use this when you see a product review and suddenly really want to buy it.",
    example: { zh: "被博主种草了这个口红。", en: "This lipstick was recommended by a blogger and now I really want it." },
    imageUrl: "https://loremflickr.com/800/600/garden,grass?lock=203"
  }
];

export default function TrendingPage() {
  const [items, setItems] = useState<TrendingItem[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newItem, setNewItem] = useState<Partial<TrendingItem>>({ example: { zh: '', en: '' } });
  const [user, setUser] = useState<User | null>(null);
  const supabase = createClient();

  // Auth State Listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  // Load Items (Hybrid)
  useEffect(() => {
    const loadItems = async () => {
      if (user) {
        // Cloud Mode
        const { data, error } = await supabase
          .from('trending_items')
          .select('*')
          .order('created_at', { ascending: true });
        
        if (data) {
          const cloudItems: TrendingItem[] = data.map(item => ({
            id: item.id,
            zh: item.zh,
            pinyin: item.pinyin || '',
            en: item.en,
            desc: item.desc || '',
            usage: item.usage || '',
            example: (item.example as { zh: string; en: string }) || { zh: '', en: '' },
            imageUrl: item.image_url
          }));
          setItems(cloudItems);
        }
      } else {
        // Local Mode
        const saved = localStorage.getItem('trending-items-v3');
        if (saved) {
          try {
            const savedItems = JSON.parse(saved);
            // Force update built-in items with latest content
            const mergedItems = savedItems.map((item: TrendingItem) => {
              const freshItem = INITIAL_TRENDING_WORDS.find(t => t.id === item.id);
              return freshItem ? freshItem : item;
            });
            setItems(mergedItems);
            localStorage.setItem('trending-items-v3', JSON.stringify(mergedItems));
          } catch (e) {
            setItems(INITIAL_TRENDING_WORDS);
            localStorage.setItem('trending-items-v3', JSON.stringify(INITIAL_TRENDING_WORDS));
          }
        } else {
          setItems(INITIAL_TRENDING_WORDS);
          localStorage.setItem('trending-items-v3', JSON.stringify(INITIAL_TRENDING_WORDS));
        }
      }
    };
    loadItems();
  }, [user, supabase]);

  const handleAddItem = async () => {
    if (!newItem.zh || !newItem.en) return;
    
    const tempItem: TrendingItem = {
      id: Date.now().toString(),
      zh: newItem.zh,
      pinyin: newItem.pinyin || '',
      en: newItem.en,
      desc: newItem.desc || '',
      usage: newItem.usage || '',
      example: newItem.example || { zh: '', en: '' },
      imageUrl: newItem.imageUrl || `https://placehold.co/600x400?text=${encodeURIComponent(newItem.zh || 'Slang')}`
    };

    if (user) {
      // Cloud Save
      const { data, error } = await supabase.from('trending_items').insert({
        user_id: user.id,
        zh: tempItem.zh,
        pinyin: tempItem.pinyin,
        en: tempItem.en,
        desc: tempItem.desc,
        usage: tempItem.usage,
        example: tempItem.example,
        image_url: tempItem.imageUrl
      }).select().single();

      if (data) {
        const confirmedItem = { ...tempItem, id: data.id };
        setItems(prev => [...prev, confirmedItem]);
        alert('Added to Cloud!');
      } else {
        alert('Failed to save to cloud: ' + (error?.message || 'Unknown error'));
      }
    } else {
      // Local Save
      const updated = [...items, tempItem];
      setItems(updated);
      localStorage.setItem('trending-items-v3', JSON.stringify(updated));
    }

    setIsModalOpen(false);
    setNewItem({ example: { zh: '', en: '' } });
  };

  const syncLocalToCloud = async () => {
    const saved = localStorage.getItem('trending-items-v3');
    if (!saved || !user) return;
    
    const localItems: TrendingItem[] = JSON.parse(saved);
    
    if (confirm(`Sync ${localItems.length} local trending items to cloud?`)) {
      const itemsToUpload = localItems.map(item => ({
        user_id: user.id,
        zh: item.zh,
        pinyin: item.pinyin,
        en: item.en,
        desc: item.desc,
        usage: item.usage,
        example: item.example,
        image_url: item.imageUrl
      }));

      const { error } = await supabase.from('trending_items').insert(itemsToUpload);
      if (!error) {
        alert('Sync successful! Clearing local storage.');
        localStorage.removeItem('trending-items-v3');
        window.location.reload();
      } else {
        alert('Sync failed: ' + error.message);
      }
    }
  };

  const speakWord = (word: string, id: string) => {
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'zh-CN';
    utterance.rate = 0.6;
    
    utterance.onstart = () => setPlayingId(id);
    utterance.onend = () => setPlayingId(null);
    
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">Trending Internet Slang</h1>
            <div className="flex items-center gap-3">
              <span className="text-sm bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">
                Updated: Feb 2026
              </span>
              {user && (
                 <button
                   onClick={syncLocalToCloud}
                   className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-medium hover:bg-blue-200 transition-colors"
                 >
                   Sync Local Data
                 </button>
              )}
              <span className="text-sm text-slate-500">
                💡 Select text to memorize
              </span>
            </div>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-purple-600 text-white px-6 py-2 rounded-full font-semibold hover:bg-purple-700 transition-colors shadow-lg shadow-purple-200"
          >
            + Add Slang
          </button>
        </div>
        
        <TextSelector contextSource="Trending">
          <div className="grid gap-8">
            {items.map((item) => (
              <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-lg transition-all duration-300">
                <div className="flex flex-col md:flex-row">
                  <div className="md:w-1/3 h-48 md:h-auto relative bg-slate-100">
                     <img 
                      src={item.imageUrl || `https://placehold.co/400x400?text=${encodeURIComponent(item.zh)}`} 
                      alt={item.zh}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.onerror = null;
                        target.src = `https://placehold.co/400x400/f1f5f9/475569?text=${encodeURIComponent(item.zh)}`;
                      }}
                    />
                    <div className="absolute top-4 right-4 md:hidden">
                       <button
                        onClick={() => speakWord(item.zh, item.id)}
                        className={`p-3 rounded-full shadow-lg ${
                          playingId === item.id 
                            ? 'bg-blue-100 text-blue-600' 
                            : 'bg-white text-slate-600'
                        }`}
                      >
                        🔊
                      </button>
                    </div>
                  </div>
                  
                  <div className="p-6 md:p-8 md:w-2/3 flex flex-col justify-center">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex items-baseline gap-3 mb-1">
                          <h2 className="text-3xl font-bold text-blue-600">{item.zh}</h2>
                          <span className="text-slate-500 font-mono text-lg">[{item.pinyin}]</span>
                        </div>
                        <h3 className="text-xl font-bold text-slate-800">{item.en}</h3>
                      </div>
                      <button
                        onClick={() => speakWord(item.zh, item.id)}
                        className={`hidden md:block p-3 rounded-full transition-colors ${
                          playingId === item.id 
                            ? 'bg-blue-100 text-blue-600' 
                            : 'bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-600'
                        }`}
                        title="Read aloud"
                      >
                        🔊
                      </button>
                    </div>

                    <p className="text-slate-600 leading-relaxed mb-6">
                      {item.desc}
                    </p>

                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Example</div>
                      <p className="text-lg text-slate-800 font-medium mb-1">{item.example.zh}</p>
                      <p className="text-slate-500">{item.example.en}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TextSelector>
      </div>

      {/* Add Slang Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
            <h2 className="text-2xl font-bold mb-6">Add New Slang</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input
                  placeholder="Chinese (e.g., 破防)"
                  className="w-full p-3 border rounded-lg"
                  value={newItem.zh || ''}
                  onChange={e => setNewItem({...newItem, zh: e.target.value})}
                />
                <input
                  placeholder="Pinyin (e.g., pò fáng)"
                  className="w-full p-3 border rounded-lg"
                  value={newItem.pinyin || ''}
                  onChange={e => setNewItem({...newItem, pinyin: e.target.value})}
                />
              </div>
              <input
                placeholder="English Meaning"
                className="w-full p-3 border rounded-lg"
                value={newItem.en || ''}
                onChange={e => setNewItem({...newItem, en: e.target.value})}
              />
              <textarea
                placeholder="Description / Origin"
                className="w-full p-3 border rounded-lg"
                value={newItem.desc || ''}
                onChange={e => setNewItem({...newItem, desc: e.target.value})}
              />
              <textarea
                placeholder="Usage Context"
                className="w-full p-3 border rounded-lg"
                value={newItem.usage || ''}
                onChange={e => setNewItem({...newItem, usage: e.target.value})}
              />
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                <p className="text-sm font-bold text-slate-500 mb-2">Example Sentence</p>
                <input
                  placeholder="Chinese Example"
                  className="w-full p-2 border rounded mb-2"
                  value={newItem.example?.zh || ''}
                  onChange={e => setNewItem({...newItem, example: { ...newItem.example!, zh: e.target.value }})}
                />
                <input
                  placeholder="English Translation"
                  className="w-full p-2 border rounded"
                  value={newItem.example?.en || ''}
                  onChange={e => setNewItem({...newItem, example: { ...newItem.example!, en: e.target.value }})}
                />
              </div>
              <input
                placeholder="Image URL (Optional)"
                className="w-full p-3 border rounded-lg"
                value={newItem.imageUrl || ''}
                onChange={e => setNewItem({...newItem, imageUrl: e.target.value})}
              />
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddItem}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Save Slang
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}