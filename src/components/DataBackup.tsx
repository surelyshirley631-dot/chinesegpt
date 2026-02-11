'use client';

import { useState } from 'react';

export default function DataBackup() {
  const [isOpen, setIsOpen] = useState(false);

  const handleExport = () => {
    const data = {
      memory: localStorage.getItem('memory-bank'),
      culture: localStorage.getItem('culture-items-v3'),
      trending: localStorage.getItem('trending-items-v3'),
      timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chinesegpt-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        
        if (confirm('This will overwrite your current data. Are you sure?')) {
          if (data.memory) localStorage.setItem('memory-bank', data.memory);
          if (data.culture) localStorage.setItem('culture-items-v3', data.culture);
          if (data.trending) localStorage.setItem('trending-items-v3', data.trending);
          
          alert('Data restored successfully! Page will reload.');
          window.location.reload();
        }
      } catch (err) {
        alert('Failed to parse backup file');
        console.error(err);
      }
    };
    reader.readAsText(file);
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="text-slate-600 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
      >
        <span>💾</span>
        <span className="hidden lg:inline">Backup</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setIsOpen(false)}>
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl transform transition-all" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-2 text-slate-800">Data Management</h3>
            <p className="text-sm text-slate-500 mb-6">
              Your learning progress is currently saved in this browser. Export a backup to keep it safe or transfer it.
            </p>
            
            <div className="space-y-4">
              <button 
                onClick={handleExport}
                className="w-full bg-blue-50 text-blue-700 py-3 rounded-xl hover:bg-blue-100 font-bold flex items-center justify-center gap-2 transition-colors border border-blue-100"
              >
                <span>⬇️</span> Download Backup
              </button>
              
              <div className="relative group">
                <input 
                  type="file" 
                  accept=".json"
                  onChange={handleImport}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <button className="w-full bg-slate-50 text-slate-700 py-3 rounded-xl group-hover:bg-slate-100 font-bold flex items-center justify-center gap-2 transition-colors border border-slate-200">
                  <span>⬆️</span> Restore from File
                </button>
              </div>
            </div>
            
            <button 
              onClick={() => setIsOpen(false)}
              className="mt-6 w-full text-slate-400 text-sm hover:text-slate-600 font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
