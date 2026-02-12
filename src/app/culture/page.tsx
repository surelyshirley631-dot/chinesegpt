'use client';

import { useState, useEffect } from 'react';
import TextSelector from '@/components/TextSelector';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';

// Define rich content types
interface CultureItem {
  id: string;
  category: string;
  zh: string;
  pinyin?: string;
  en: string;
  desc: string;
  detail: string;
  imageUrl?: string;
  examples: { zh: string; pinyin?: string; en: string }[];
}

// Use LoremFlickr with SAFE keywords and locks because Unsplash/Wiki are often blocked in China
const INITIAL_TOPICS: CultureItem[] = [
  {
    id: '1',
    category: 'Festivals',
    zh: "春节",
    pinyin: "Chūn Jié",
    en: "Spring Festival",
    desc: "The most important traditional festival, celebrating the beginning of a new year on the lunar calendar.",
    detail: "Also known as Chinese New Year, it marks the beginning of the lunar new year. Families gather for a reunion dinner, give red envelopes (hongbao), and set off fireworks to scare away the legendary beast 'Nian'.",
    imageUrl: "https://f.bmcx.com/file/wannianrili/jieri/chunjie.png",
    examples: [
      { zh: "春节快乐！", pinyin: "Chūn Jié kuài lè!", en: "Happy Spring Festival!" },
      { zh: "你会回家过春节吗？", pinyin: "Nǐ huì huí jiā guò Chūn Jié ma?", en: "Will you go home for the Spring Festival?" }
    ]
  },
  {
    id: '2',
    category: 'Festivals',
    zh: "中秋节",
    pinyin: "Zhōng Qiū Jié",
    en: "Mid-Autumn Festival",
    desc: "Celebrated with mooncakes and moon gazing, symbolizing reunion.",
    detail: "Held on the 15th day of the 8th lunar month, when the moon is believed to be the fullest. It is a time for family reunions and sharing mooncakes.",
    imageUrl: "https://loremflickr.com/800/600/moon,night?lock=102",
    examples: [
      { zh: "中秋节我们要吃月饼。", pinyin: "Zhōng Qiū Jié wǒ men yào chī yuè bǐng.", en: "We eat mooncakes during the Mid-Autumn Festival." }
    ]
  },
  {
    id: '3',
    category: 'Cuisine',
    zh: "饺子",
    pinyin: "Jiǎo Zi",
    en: "Dumplings",
    desc: "Traditional food popular in North China, symbolizing wealth.",
    detail: "Dumplings are shaped like ancient Chinese gold ingots. Eating them during festivals is believed to bring good luck and wealth for the coming year.",
    imageUrl: "https://bpic.wotucdn.com//original/35/12/03/35120380-2ccc85a86da523afe569255318fefb91.png!waterxwebp320x556",
    examples: [
      { zh: "我们一起包饺子吧。", pinyin: "Wǒ men yī qǐ bāo jiǎo zi ba.", en: "Let's make dumplings together." }
    ]
  },
  {
    id: '4',
    category: 'Cuisine',
    zh: "火锅",
    pinyin: "Huǒ Guō",
    en: "Hot Pot",
    desc: "A communal dining experience where ingredients are cooked in a shared pot.",
    detail: "Hot pot is more than just a dish; it's a social event. Friends and family sit around a simmering pot of soup stock, cooking meats, vegetables, and noodles.",
    imageUrl: "https://p8.itc.cn/images01/20210119/628400a0528c4dc696efdac8749b176d.jpeg",
    examples: [
      { zh: "冬天吃火锅最舒服了。", pinyin: "Dōng tiān chī huǒ guō zuì shū fu le.", en: "It's most comfortable to eat hot pot in winter." }
    ]
  }
];

export default function CulturePage() {
  const [items, setItems] = useState<CultureItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<CultureItem | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const supabase = createClient();

  // New Item Form State
  const [newItem, setNewItem] = useState<Partial<CultureItem>>({
    category: 'General',
    examples: []
  });

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
          .from('culture_items')
          .select('*')
          .order('created_at', { ascending: true });
        
        if (data) {
          const cloudItems: CultureItem[] = data.map(item => ({
            id: item.id,
            category: item.category,
            zh: item.zh,
            en: item.en,
            desc: item.desc || '',
            detail: item.detail || '',
            imageUrl: item.image_url,
            examples: item.examples as { zh: string; pinyin?: string; en: string }[] || []
          }));
          setItems(cloudItems);
        }
      } else {
        // Local Mode
        const saved = localStorage.getItem('culture-items');
        if (saved) {
          try {
            const savedItems = JSON.parse(saved);
            // Force update built-in items with latest images/content from INITIAL_TOPICS
            // This fixes the issue where old cached data (with broken images) persists
            const mergedItems = savedItems.map((item: CultureItem) => {
              const freshItem = INITIAL_TOPICS.find(t => t.id === item.id);
              // If it's a built-in item, update it; otherwise keep user item
              return freshItem ? freshItem : item;
            });
            
            // If INITIAL_TOPICS has new items not in savedItems, add them? 
            // For now, let's just update existing ones to be safe.
            
            setItems(mergedItems);
            // Update storage so we don't need to merge next time
            localStorage.setItem('culture-items', JSON.stringify(mergedItems));
          } catch (e) {
            // If parse fails, reset
            setItems(INITIAL_TOPICS);
            localStorage.setItem('culture-items', JSON.stringify(INITIAL_TOPICS));
          }
        } else {
          setItems(INITIAL_TOPICS);
          localStorage.setItem('culture-items', JSON.stringify(INITIAL_TOPICS));
        }
      }
    };
    loadItems();
  }, [user, supabase]);

  const handleAddItem = async () => {
    if (!newItem.zh || !newItem.en) return;
    
    const tempItem: CultureItem = {
      id: Date.now().toString(),
      category: newItem.category || 'General',
      zh: newItem.zh,
      pinyin: newItem.pinyin,
      en: newItem.en,
      desc: newItem.desc || '',
      detail: newItem.detail || '',
      imageUrl: newItem.imageUrl || `https://placehold.co/600x400?text=${encodeURIComponent(newItem.en)}`,
      examples: newItem.examples || []
    };

    if (user) {
      // Cloud Save
      const { data, error } = await supabase.from('culture_items').insert({
        user_id: user.id,
        category: tempItem.category,
        zh: tempItem.zh,
        en: tempItem.en,
        desc: tempItem.desc,
        detail: tempItem.detail,
        image_url: tempItem.imageUrl,
        examples: tempItem.examples
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
      localStorage.setItem('culture-items', JSON.stringify(updated));
    }

    setIsModalOpen(false);
    setNewItem({ category: 'General', examples: [] });
  };

  const syncLocalToCloud = async () => {
    const saved = localStorage.getItem('culture-items');
    if (!saved || !user) return;
    
    const localItems: CultureItem[] = JSON.parse(saved);
    // Filter out initial topics if they are exactly the same, or just sync everything that isn't already there?
    // For simplicity, we'll sync custom items. But verifying duplicates is hard.
    // Let's just ask user.
    
    if (confirm(`Sync ${localItems.length} local culture items to cloud?`)) {
      const itemsToUpload = localItems.map(item => ({
        user_id: user.id,
        category: item.category,
        zh: item.zh,
        en: item.en,
        desc: item.desc,
        detail: item.detail,
        image_url: item.imageUrl,
        examples: item.examples
      }));

      const { error } = await supabase.from('culture_items').insert(itemsToUpload);
      if (!error) {
        alert('Sync successful! Clearing local storage.');
        localStorage.removeItem('culture-items');
        window.location.reload();
      } else {
        alert('Sync failed: ' + error.message);
      }
    }
  };

  const categories = Array.from(new Set(items.map(i => i.category)));

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">Chinese Culture Insights</h1>
            <p className="text-slate-600">Explore traditions, cuisine, and history</p>
          </div>
          <div className="flex gap-4">
             {user && (
               <button
                 onClick={syncLocalToCloud}
                 className="text-sm bg-green-100 text-green-700 px-4 py-2 rounded-full font-medium hover:bg-green-200 transition-colors"
               >
                 Sync Local Data
               </button>
             )}
             <div className="text-sm text-slate-500 flex items-center bg-white px-4 py-2 rounded-full shadow-sm">
              💡 Select text to memorize
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-blue-600 text-white px-6 py-2 rounded-full font-semibold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
            >
              + Add Topic
            </button>
          </div>
        </div>

        <TextSelector contextSource="Culture">
          <div className="space-y-16">
            {categories.map(category => (
              <section key={category}>
                <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3">
                  <span className="w-2 h-8 bg-red-600 rounded-full"></span>
                  {category}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {items.filter(i => i.category === category).map(item => (
                    <div 
                      key={item.id}
                      className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100 cursor-pointer"
                      onClick={() => setActiveItem(item)}
                    >
                      <div className="relative h-48 overflow-hidden bg-slate-200">
                        <img 
                          src={item.imageUrl || `https://placehold.co/800x600?text=${encodeURIComponent(item.en)}`} 
                          alt={item.en}
                          className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.onerror = null; // Prevent infinite loop
                            target.src = `https://placehold.co/800x600/f1f5f9/475569?text=${encodeURIComponent(item.zh)}`;
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                          <div className="text-white">
                            <h3 className="text-3xl font-bold mb-1">
                              {item.zh}
                              {item.pinyin && <span className="text-lg font-normal ml-2 text-white/80">[{item.pinyin}]</span>}
                            </h3>
                            <p className="text-lg font-medium opacity-90">{item.en}</p>
                          </div>
                        </div>
                      </div>
                      <div className="p-6">
                        <p className="text-slate-600 line-clamp-2 mb-4">{item.desc}</p>
                        <div className="flex justify-between items-center">
                          <span className="text-blue-600 font-semibold text-sm group-hover:underline">Read more & Examples →</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </TextSelector>
      </div>

      {/* Detail Modal */}
      {activeItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setActiveItem(null)}>
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="relative h-64">
              <img src={activeItem.imageUrl} className="w-full h-full object-cover" />
              <button 
                onClick={() => setActiveItem(null)}
                className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-8">
              <TextSelector contextSource={`Culture: ${activeItem.en}`}>
                <div className="flex items-baseline gap-4 mb-2">
                  <h2 className="text-4xl font-bold text-slate-900">{activeItem.zh}</h2>
                  {activeItem.pinyin && <span className="text-2xl text-slate-500 font-normal">[{activeItem.pinyin}]</span>}
                  <h3 className="text-2xl text-slate-500">{activeItem.en}</h3>
                </div>
                <div className="w-full h-px bg-slate-100 my-6"></div>
                
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Description</h4>
                <p className="text-lg text-slate-700 leading-relaxed mb-8">{activeItem.detail || activeItem.desc}</p>
                
                {activeItem.examples && activeItem.examples.length > 0 && (
                  <>
                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Example Sentences</h4>
                    <div className="space-y-4">
                      {activeItem.examples.map((ex, idx) => (
                        <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                          <p className="text-xl font-medium text-slate-800 mb-1">
                            {ex.zh}
                            {ex.pinyin && <span className="text-base font-normal text-slate-500 ml-2">[{ex.pinyin}]</span>}
                          </p>
                          <p className="text-slate-500">{ex.en}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </TextSelector>
            </div>
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-8 shadow-2xl">
            <h2 className="text-2xl font-bold mb-6">Add New Topic</h2>
            <div className="space-y-4">
              <input
                placeholder="Category (e.g., Festivals)"
                className="w-full p-3 border rounded-lg"
                value={newItem.category}
                onChange={e => setNewItem({...newItem, category: e.target.value})}
              />
              <div className="grid grid-cols-3 gap-4">
                <input
                  placeholder="Chinese (e.g., 端午节)"
                  className="w-full p-3 border rounded-lg"
                  value={newItem.zh}
                  onChange={e => setNewItem({...newItem, zh: e.target.value})}
                />
                <input
                  placeholder="Pinyin (e.g., Duān Wǔ Jié)"
                  className="w-full p-3 border rounded-lg"
                  value={newItem.pinyin || ''}
                  onChange={e => setNewItem({...newItem, pinyin: e.target.value})}
                />
                <input
                  placeholder="English (e.g., Dragon Boat)"
                  className="w-full p-3 border rounded-lg"
                  value={newItem.en}
                  onChange={e => setNewItem({...newItem, en: e.target.value})}
                />
              </div>
              <textarea
                placeholder="Short Description"
                className="w-full p-3 border rounded-lg"
                value={newItem.desc}
                onChange={e => setNewItem({...newItem, desc: e.target.value})}
              />
              <textarea
                placeholder="Detailed Explanation"
                className="w-full p-3 border rounded-lg h-24"
                value={newItem.detail}
                onChange={e => setNewItem({...newItem, detail: e.target.value})}
              />
              <input
                placeholder="Image URL (Optional)"
                className="w-full p-3 border rounded-lg"
                value={newItem.imageUrl}
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
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Save Topic
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}