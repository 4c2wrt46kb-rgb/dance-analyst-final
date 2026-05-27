'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, Pause, RotateCcw, FlipHorizontal, RotateCw, 
  Plus, Trash2, Bookmark, Eraser, Layers, 
  ChevronRight, Video, Info
} from 'lucide-react';

// --- 型定義 ---
type BookmarkType = {
  id: number;
  time: number;
  label: string;
};

type Move = {
  id: number;
  name: string;
  videoBlob?: Blob;
  videoUrl?: string;
  isMirrored: boolean;
  rotation: number;
  playbackRate: number;
  bookmarks: BookmarkType[];
};

export default function DanceAnalystPro() {
  const [activeTab, setActiveTab] = useState<'analyze' | 'history'>('analyze');
  const [moves, setMoves] = useState<Move[]>([]);
  const [selectedMoveId, setSelectedMoveId] = useState<number | null>(null);
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // --- IndexedDB: データの永続化 ---
  useEffect(() => {
    const request = indexedDB.open('DanceAnalystProDB_Final', 1);
    request.onupgradeneeded = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('moves')) {
        db.createObjectStore('moves', { keyPath: 'id' });
      }
    };
    request.onsuccess = (e: any) => {
      const db = e.target.result;
      const tx = db.transaction('moves', 'readonly');
      tx.objectStore('moves').getAll().onsuccess = (ev: any) => {
        const loadedMoves = ev.target.result.map((m: any) => ({
          ...m,
          videoUrl: m.videoBlob ? URL.createObjectURL(m.videoBlob) : undefined,
        }));
        setMoves(loadedMoves);
        if (loadedMoves.length > 0) setSelectedMoveId(loadedMoves[0].id);
      };
    };
  }, []);

  const saveToDB = (updatedMoves: Move[]) => {
    const request = indexedDB.open('DanceAnalystProDB_Final', 1);
    request.onsuccess = (e: any) => {
      const db = e.target.result;
      const tx = db.transaction('moves', 'readwrite');
      const store = tx.objectStore('moves');
      store.clear();
      updatedMoves.forEach(m => {
        const { videoUrl, ...toSave } = m;
        store.add(toSave);
      });
    };
  };

  // --- ハンドラー ---
  const currentMove = moves.find(m => m.id === selectedMoveId);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const newMove: Move = {
      id: Date.now(),
      name: file.name.replace(/\.[^/.]+$/, ""),
      videoBlob: file,
      videoUrl: URL.createObjectURL(file),
      isMirrored: false,
      rotation: 0,
      playbackRate: 1.0,
      bookmarks: []
    };

    const newMoves = [newMove, ...moves];
    setMoves(newMoves);
    setSelectedMoveId(newMove.id);
    saveToDB(newMoves);
  };

  const updateMove = (updates: Partial<Move>) => {
    if (!selectedMoveId) return;
    const newMoves = moves.map(m => m.id === selectedMoveId ? { ...m, ...updates } : m);
    setMoves(newMoves);
    saveToDB(newMoves);
  };

  const addBookmark = () => {
    if (!videoRef.current || !currentMove) return;
    const time = videoRef.current.currentTime;
    const newBookmark = { id: Date.now(), time, label: `${time.toFixed(1)}s` };
    updateMove({ bookmarks: [...currentMove.bookmarks, newBookmark] });
  };

  // --- 描画ロジック ---
  const getCoordinates = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX || e.touches?.[0].clientX;
    const clientY = e.clientY || e.touches?.[0].clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDrawing = (e: any) => {
    setIsDrawing(true);
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.strokeStyle = '#FF3B30';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };

  const draw = (e: any) => {
    if (!isDrawing) return;
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  return (
    <div className="min-h-screen bg-[#F2F2F7] dark:bg-black text-[#1D1D1F] dark:text-[#F5F5F7] pb-10">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 dark:bg-black/80 border-b border-gray-200 dark:border-white/10 px-6 py-4">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <Layers className="text-white w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight hidden sm:block">Analyst Pro</h1>
          </div>
          
          <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-full text-sm font-bold shadow-lg active:scale-95 transition-all flex items-center gap-2">
            <Plus size={18} />
            <span>ビデオ追加</span>
            <input type="file" className="hidden" accept="video/*" onChange={handleFileUpload} />
          </label>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 md:p-8">
        {!selectedMoveId ? (
          <div className="flex flex-col items-center justify-center py-32 text-center space-y-6">
            <div className="w-24 h-24 bg-gray-200 dark:bg-white/5 rounded-[2.5rem] flex items-center justify-center">
              <Video size={40} className="text-gray-400" />
            </div>
            <h2 className="text-2xl font-bold">ビデオを選択して分析を開始</h2>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* メインプレイヤーパネル */}
            <div className="lg:col-span-8 space-y-6">
              <div className="bg-white dark:bg-[#1C1C1E] rounded-[3rem] p-3 shadow-xl border border-gray-100 dark:border-white/5">
                <div className="relative aspect-video bg-black rounded-[2.5rem] overflow-hidden">
                  <video
                    ref={videoRef}
                    src={currentMove?.videoUrl}
                    playsInline loop
                    className="w-full h-full object-contain"
                    style={{ transform: `scaleX(${currentMove?.isMirrored ? -1 : 1}) rotate(${currentMove?.rotation}deg)` }}
                    onPlay={(e) => e.currentTarget.playbackRate = currentMove?.playbackRate || 1}
                  />
                  <canvas
                    ref={canvasRef}
                    width={800} height={450}
                    className="absolute inset-0 z-10 cursor-crosshair touch-none"
                    onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={() => setIsDrawing(false)}
                    onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={() => setIsDrawing(false)}
                  />
                  <button 
                    onClick={() => canvasRef.current?.getContext('2d')?.clearRect(0,0,800,450)} 
                    className="absolute top-4 right-4 z-20 bg-black/50 backdrop-blur-md text-white p-2 rounded-full"
                  >
                    <Eraser size={20} />
                  </button>
                </div>

                <div className="p-6 space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-2 bg-gray-100 dark:bg-white/5 p-1 rounded-2xl">
                      <button onClick={() => videoRef.current?.paused ? videoRef.current.play() : videoRef.current?.pause()} className="w-12 h-12 flex items-center justify-center bg-white dark:bg-white/10 rounded-xl shadow-sm text-blue-600">
                        <Play size={24} fill="currentColor" />
                      </button>
                      <button onClick={() => { if(videoRef.current) videoRef.current.currentTime = 0 }} className="w-12 h-12 flex items-center justify-center text-gray-500">
                        <RotateCcw size={20} />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateMove({ isMirrored: !currentMove?.isMirrored })} className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all ${currentMove?.isMirrored ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-white/5'}`}>
                        <FlipHorizontal size={16} className="inline mr-2" /> 反転
                      </button>
                      <button onClick={() => updateMove({ rotation: (currentMove!.rotation + 90) % 360 })} className="px-5 py-2.5 rounded-full bg-gray-100 dark:bg-white/5 text-xs font-bold">
                        <RotateCw size={16} className="inline mr-2" /> {currentMove?.rotation}°
                      </button>
                    </div>
                  </div>

                  {/* 再生速度調節 */}
                  <div className="bg-gray-50 dark:bg-black/20 p-6 rounded-[2rem] space-y-4">
                    <div className="flex justify-between items-center text-xs font-black text-gray-400 uppercase tracking-widest">
                      <span>再生速度</span>
                      <span className="text-blue-600 text-lg font-mono">{currentMove?.playbackRate.toFixed(2)}x</span>
                    </div>
                    <input 
                      type="range" min="0.25" max="1.5" step="0.05"
                      value={currentMove?.playbackRate}
                      onChange={(e) => {
                        const rate = parseFloat(e.target.value);
                        updateMove({ playbackRate: rate });
                        if(videoRef.current) videoRef.current.playbackRate = rate;
                      }}
                      className="w-full h-2 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none accent-blue-600"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* サイドバー：ブックマーク */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white dark:bg-[#1C1C1E] rounded-[2.5rem] p-6 shadow-xl border border-gray-100 dark:border-white/5 flex flex-col gap-6">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold">ブックマーク</h3>
                  <button onClick={addBookmark} className="text-blue-600 text-sm font-bold flex items-center gap-1">
                    <Bookmark size={16} /> 追加
                  </button>
                </div>
                <div className="space-y-2 max-h-[400px] overflow-y-auto no-scrollbar">
                  {currentMove?.bookmarks.length === 0 ? (
                    <p className="text-center py-10 text-gray-400 text-xs">気になる瞬間にタグを打とう</p>
                  ) : (
                    currentMove?.bookmarks.map((b) => (
                      <button key={b.id} onClick={() => { if(videoRef.current) videoRef.current.currentTime = b.time }} className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-2xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-left">
                        <span className="font-mono font-bold text-sm">{b.label}</span>
                        <ChevronRight size={16} className="text-gray-400" />
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-blue-600 rounded-[2.5rem] p-8 text-white space-y-3">
                <h4 className="font-bold flex items-center gap-2"><Info size={18} /> 分析ヒント</h4>
                <p className="text-xs opacity-90 leading-relaxed">
                  0.5x速度で足元をチェック。ガイド線を引いて、フリーズの時の体の軸が真っ直ぐか確認してみましょう。
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}