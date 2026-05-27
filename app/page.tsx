'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type Move = {
  id: number;
  name: string;
  videoUrl?: string;
  videoBlob?: Blob;
  isMirrored: boolean;
};

export default function AppleStyleDanceAnalyst() {
  const [activeTab, setActiveTab] = useState<'library' | 'compare' | 'log'>('library');
  const [moves, setMoves] = useState<Move[]>([]);
  const [events, setEvents] = useState<string[]>([]);
  const [taskInput, setTaskInput] = useState('');
  
  // 比較用
  const [videoLeft, setVideoLeft] = useState<string | null>(null);
  const [videoRight, setVideoRight] = useState<string | null>(null);
  const videoRefLeft = useRef<HTMLVideoElement>(null);
  const videoRefRight = useRef<HTMLVideoElement>(null);

  // 初期読み込み (IndexedDB)
  useEffect(() => {
    const request = indexedDB.open('DanceAnalystAppleDB', 1);
    request.onupgradeneeded = (e: any) => {
      const db = e.target.result;
      db.createObjectStore('moves', { keyPath: 'id' });
      db.createObjectStore('settings');
    };
    request.onsuccess = (e: any) => {
      const db = e.target.result;
      const tx = db.transaction(['moves', 'settings'], 'readonly');
      tx.objectStore('moves').getAll().onsuccess = (ev: any) => {
        const loaded = ev.target.result.map((m: any) => ({
          ...m,
          videoUrl: m.videoBlob ? URL.createObjectURL(m.videoBlob) : undefined
        }));
        setMoves(loaded);
      };
      tx.objectStore('settings').get('events').onsuccess = (ev: any) => {
        if (ev.target.result) setEvents(ev.target.result);
      };
    };
  }, []);

  const saveMoves = (newMoves: Move[]) => {
    setMoves(newMoves);
    const request = indexedDB.open('DanceAnalystAppleDB', 1);
    request.onsuccess = (e: any) => {
      const db = e.target.result;
      const tx = db.transaction('moves', 'readwrite');
      const store = tx.objectStore('moves');
      store.clear();
      newMoves.forEach(m => {
        const { videoUrl, ...toSave } = m;
        store.add(toSave);
      });
    };
  };

  const addMove = () => {
    saveMoves([...moves, { id: Date.now(), name: '新規ビデオ', isMirrored: false }]);
  };

  const syncPlay = () => {
    if (videoRefLeft.current && videoRefRight.current) {
      videoRefLeft.current.currentTime = 0;
      videoRefRight.current.currentTime = 0;
      videoRefLeft.current.play();
      videoRefRight.current.play();
    }
  };

  return (
    <div className="min-h-screen bg-[#F2F2F7] dark:bg-[#000000] text-[#1D1D1F] dark:text-[#F5F5F7] font-sans transition-colors duration-500">
      
      {/* 1. Header & Navigation */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 dark:bg-black/70 border-b border-gray-200 dark:border-white/10 px-6 py-4">
        <div className="max-w-4xl mx-auto flex flex-col items-center gap-6">
          <h1 className="text-2xl font-semibold tracking-tight">Dance Analyst Pro</h1>
          
          <nav className="flex bg-gray-200/50 dark:bg-white/10 p-1 rounded-xl w-full max-w-sm">
            {[
              { id: 'library', label: 'ライブラリ' },
              { id: 'compare', label: '比較' },
              { id: 'log', label: 'ログ' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-all ${
                  activeTab === tab.id 
                  ? 'bg-white dark:bg-white/20 shadow-sm scale-100' 
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* 2. Main Content */}
      <main className="max-w-4xl mx-auto p-6 pb-24">
        <AnimatePresence mode="wait">
          
          {/* --- LIBRARY TAB --- */}
          {activeTab === 'library' && (
            <motion.div 
              key="library" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center px-2">
                <h2 className="text-3xl font-bold">ビデオ</h2>
                <button onClick={addMove} className="text-blue-500 font-medium hover:opacity-70 transition-opacity">
                  追加
                </button>
              </div>

              {moves.length === 0 && (
                <div className="text-center py-20 border-2 border-dashed border-gray-300 dark:border-white/10 rounded-3xl">
                  <p className="text-gray-400">ビデオがありません</p>
                </div>
              )}

              <div className="grid gap-6">
                {moves.map((move) => (
                  <div key={move.id} className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-white/5 group">
                    <div className="flex justify-between mb-4">
                      <input 
                        value={move.name}
                        onChange={(e) => saveMoves(moves.map(m => m.id === move.id ? {...m, name: e.target.value} : m))}
                        className="bg-transparent font-semibold text-xl outline-none"
                      />
                      <button onClick={() => saveMoves(moves.filter(m => m.id !== move.id))} className="text-red-500 text-sm">削除</button>
                    </div>

                    <div className="flex items-center gap-4 mb-4">
                      <input 
                        type="file" accept="video/*" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if(file) {
                            const url = URL.createObjectURL(file);
                            saveMoves(moves.map(m => m.id === move.id ? {...m, videoBlob: file, videoUrl: url} : m));
                          }
                        }}
                        className="text-xs file:bg-blue-500 file:text-white file:border-0 file:px-3 file:py-1 file:rounded-full file:mr-3" 
                      />
                      <label className="flex items-center gap-2 text-xs font-medium text-gray-500">
                        <input type="checkbox" checked={move.isMirrored} onChange={(e) => saveMoves(moves.map(m => m.id === move.id ? {...m, isMirrored: e.target.checked} : m))} />
                        ミラー
                      </label>
                    </div>

                    {move.videoUrl && (
                      <video src={move.videoUrl} controls loop style={{ transform: move.isMirrored ? 'scaleX(-1)' : 'none' }} className="w-full rounded-2xl overflow-hidden shadow-inner bg-black aspect-video" />
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* --- COMPARE TAB --- */}
          {activeTab === 'compare' && (
            <motion.div 
              key="compare" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <h2 className="text-3xl font-bold px-2">同期比較</h2>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { id: 'L', url: videoLeft, setter: setVideoLeft, ref: videoRefLeft },
                  { id: 'R', url: videoRight, setter: setVideoRight, ref: videoRefRight }
                ].map((slot) => (
                  <div key={slot.id} className="aspect-[3/4] bg-white dark:bg-[#1C1C1E] rounded-3xl overflow-hidden relative border border-gray-100 dark:border-white/5">
                    {!slot.url ? (
                      <label className="absolute inset-0 flex items-center justify-center cursor-pointer">
                        <span className="text-blue-500 text-sm font-medium">ビデオを選択</span>
                        <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && slot.setter(URL.createObjectURL(e.target.files[0]))} />
                      </label>
                    ) : (
                      <video ref={slot.ref} src={slot.url} loop className="w-full h-full object-cover" />
                    )}
                  </div>
                ))}
              </div>
              <button 
                onClick={syncPlay}
                className="w-full bg-blue-500 text-white py-4 rounded-2xl font-semibold shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
              >
                同時再生
              </button>
            </motion.div>
          )}

          {/* --- LOG TAB --- */}
          {activeTab === 'log' && (
            <motion.div 
              key="log" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <h2 className="text-3xl font-bold px-2">トレーニングログ</h2>
              <div className="flex gap-2">
                <input 
                  value={taskInput} onChange={(e) => setTaskInput(e.target.value)} 
                  placeholder="目標を入力..." 
                  className="flex-1 bg-white dark:bg-[#1C1C1E] p-4 rounded-2xl outline-none shadow-sm" 
                />
                <button 
                  onClick={() => { if(taskInput.trim()){ setEvents([...events, taskInput]); setTaskInput(''); }}} 
                  className="bg-blue-500 text-white px-6 rounded-2xl font-semibold"
                >
                  追加
                </button>
              </div>
              <div className="space-y-3">
                {events.map((ev, i) => (
                  <div key={i} className="bg-white dark:bg-[#1C1C1E] p-5 rounded-2xl flex justify-between items-center shadow-sm">
                    <span className="font-medium text-gray-700 dark:text-gray-200">{ev}</span>
                    <button onClick={() => setEvents(events.filter((_, idx) => idx !== i))} className="text-gray-400 hover:text-blue-500 transition-colors">完了</button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}