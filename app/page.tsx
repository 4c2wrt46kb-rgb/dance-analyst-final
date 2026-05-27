"use client";

import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, Pause, Trophy, FileText, Plus, Upload, Trash2, RotateCw, 
  Timer, Tag as TagIcon, Grid3X3, Share2, Save, MoveRight, Layers
} from 'lucide-react';

export default function DanceAnalystPro() {
  // --- 状態管理 ---
  const [isPlaying, setIsPlaying] = useState(false);
  const [leftRate, setLeftRate] = useState(1);
  const [rightRate, setRightRate] = useState(1);
  const [leftRotation, setLeftRotation] = useState(0);
  const [rightRotation, setRightRotation] = useState(0);
  const [leftOffset, setLeftOffset] = useState(0);
  const [rightOffset, setRightOffset] = useState(0);
  
  // 分析用オーバーレイ
  const [showGrid, setShowGrid] = useState(false);

  // データ保存用（localStorage）
  const [categories, setCategories] = useState(['入り', 'フロー', 'フリーズ', '緩急', '質感']);
  const [memos, setMemos] = useState<{id:number, text:string, tag:string}[]>([]);
  
  // マインドマップ（技の繋がり）の状態
  const [nodes, setNodes] = useState<{id:number, name:string, x:number, y:number}[]>([]);

  // --- 自動セーブ機能 ---
  useEffect(() => {
    const savedMemos = localStorage.getItem('dance-memos');
    const savedNodes = localStorage.getItem('dance-nodes');
    if (savedMemos) setMemos(JSON.parse(savedMemos));
    if (savedNodes) setNodes(JSON.parse(savedNodes));
  }, []);

  useEffect(() => {
    localStorage.setItem('dance-memos', JSON.stringify(memos));
    localStorage.setItem('dance-nodes', JSON.stringify(nodes));
  }, [memos, nodes]);

  // --- ビデオ参照 ---
  const [leftVideo, setLeftVideo] = useState<string | null>(null);
  const [rightVideo, setRightVideo] = useState<string | null>(null);
  const leftVideoRef = useRef<HTMLVideoElement>(null);
  const rightVideoRef = useRef<HTMLVideoElement>(null);

  const togglePlay = () => {
    const nextState = !isPlaying;
    setIsPlaying(nextState);
    [leftVideoRef, rightVideoRef].forEach(ref => {
      if (nextState) ref.current?.play();
      else ref.current?.pause();
    });
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>, side: 'left' | 'right') => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      side === 'left' ? setLeftVideo(url) : setRightVideo(url);
    }
  };

  const addMemo = () => {
    const text = prompt("気づきを入力:");
    if (!text) return;
    const tag = prompt(`タグ選択: ${categories.join(', ')}`) || "未分類";
    setMemos([{ id: Date.now(), text, tag }, ...memos]);
  };

  const addNode = () => {
    const name = prompt("技の名前を入力（例：Cossack）:");
    if (name) setNodes([...nodes, { id: Date.now(), name, x: 0, y: 0 }]);
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 p-4 md:p-8 font-sans selection:bg-cyan-500/30">
      {/* ヘッダー */}
      <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-3xl md:text-5xl font-black bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 bg-clip-text text-transparent italic tracking-tighter">
            DANCE ANALYST v4.0
          </h1>
          <p className="text-[10px] text-slate-500 font-bold tracking-[0.4em] mt-1 uppercase">Advanced Training Architecture</p>
        </div>
        <div className="flex items-center gap-4">
           <button onClick={() => setShowGrid(!showGrid)} className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all font-bold text-[10px] ${showGrid ? 'bg-cyan-500 border-cyan-400 text-black shadow-[0_0_20px_rgba(6,182,212,0.4)]' : 'border-slate-800 text-slate-400'}`}>
             <Grid3X3 size={14}/> GRID OVERLAY
           </button>
           <div className="flex items-center gap-2 text-emerald-400 text-[10px] font-black px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
             <Save size={12}/> AUTO-SAVING
           </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* メイン分析セクション */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* ビデオプレイヤー */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[ 
              { side: 'left' as const, url: leftVideo, ref: leftVideoRef, label: 'PLAYER', rate: leftRate, rotation: leftRotation, offset: leftOffset, setOffset: setLeftOffset, color: 'cyan' },
              { side: 'right' as const, url: rightVideo, ref: rightVideoRef, label: 'MASTER', rate: rightRate, rotation: rightRotation, offset: rightOffset, setOffset: setRightOffset, color: 'blue' }
            ].map((v) => (
              <div key={v.side} className="group flex flex-col gap-4">
                <div className="relative aspect-video bg-black rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
                  {v.url ? (
                    <video ref={v.ref} src={v.url} className="w-full h-full object-contain" style={{ transform: `rotate(${v.rotation}deg)` }} loop muted playsInline />
                  ) : (
                    <label className="cursor-pointer h-full flex flex-col items-center justify-center gap-3">
                      <div className="p-5 bg-white/5 rounded-full group-hover:bg-cyan-500/20 transition-all"><Upload className="text-slate-600 group-hover:text-cyan-400" /></div>
                      <span className="text-[10px] font-black text-slate-500 tracking-widest">{v.label} SELECT</span>
                      <input type="file" accept="video/*" className="hidden" onChange={(e) => handleVideoUpload(e, v.side)} />
                    </label>
                  )}
                  
                  {/* 分析グリッド */}
                  {showGrid && (
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute top-1/2 left-0 w-full h-[1px] bg-cyan-500/40"></div>
                      <div className="absolute top-0 left-1/2 w-[1px] h-full bg-cyan-500/40"></div>
                      <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
                        {[...Array(9)].map((_, i) => <div key={i} className="border border-cyan-500/10"></div>)}
                      </div>
                    </div>
                  )}

                  <div className={`absolute top-4 left-4 text-[9px] px-3 py-1 rounded-lg font-black ${v.side === 'left' ? 'bg-cyan-500 text-black' : 'bg-indigo-600 text-white'}`}>{v.side}</div>
                  <button onClick={() => v.side === 'left' ? setLeftRotation(r=>r+90) : setRightRotation(r=>r+90)} className="absolute top-4 right-4 p-2 bg-black/40 hover:bg-white/10 rounded-full text-slate-400 opacity-0 group-hover:opacity-100 transition-all"><RotateCw size={14}/></button>
                </div>

                <div className="bg-slate-900/40 p-5 rounded-[2rem] border border-white/5 space-y-4">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1"><Timer size={10}/> Sync: {v.offset}s</span>
                    <span className="text-xs font-black italic text-cyan-400">{v.rate.toFixed(2)}x</span>
                  </div>
                  <input type="range" min="0.2" max="2.0" step="0.05" value={v.rate} onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if(v.side==='left'){setLeftRate(val); if(leftVideoRef.current) leftVideoRef.current.playbackRate=val}
                    else{setRightRate(val); if(rightVideoRef.current) rightVideoRef.current.playbackRate=val}
                  }} className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500" />
                </div>
              </div>
            ))}
          </div>

          {/* フロー・ビルダー（マインドマップ再現エリア） */}
          <div className="bg-slate-900/30 p-8 rounded-[3rem] border border-white/5 space-y-6">
            <div className="flex justify-between items-center">
               <div className="flex items-center gap-3">
                 <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400"><Share2 size={18}/></div>
                 <h3 className="font-black italic text-lg">MOVE FLOW BUILDER</h3>
               </div>
               <button onClick={addNode} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black transition-all shadow-lg shadow-indigo-900/20">
                 <Plus size={14}/> ADD MOVE
               </button>
            </div>
            
            <div className="flex flex-wrap gap-4 min-h-[100px] p-6 bg-black/20 rounded-[2rem] border border-dashed border-slate-800">
              {nodes.map((node, i) => (
                <React.Fragment key={node.id}>
                  <div className="relative group animate-in fade-in zoom-in duration-300">
                    <div className="px-6 py-3 bg-slate-800 border border-slate-700 rounded-2xl text-sm font-bold shadow-xl flex items-center gap-3">
                      <Hash size={12} className="text-indigo-400"/> {node.name}
                      <button onClick={() => setNodes(nodes.filter(n => n.id !== node.id))} className="text-slate-600 hover:text-red-400 ml-2 transition-colors"><Trash2 size={12}/></button>
                    </div>
                  </div>
                  {i < nodes.length - 1 && (
                    <div className="flex items-center text-slate-700">
                      <MoveRight size={24} className="animate-pulse" />
                    </div>
                  )}
                </React.Fragment>
              ))}
              {nodes.length === 0 && <p className="text-slate-600 text-[10px] font-bold uppercase tracking-widest m-auto">No flow defined yet</p>}
            </div>
          </div>
        </div>

        {/* サイドバー：ログ */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-900/80 p-8 rounded-[3rem] border border-white/5 h-full flex flex-col shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5"><Layers size={120}/></div>
            
            <div className="flex justify-between items-center mb-10 relative">
               <h3 className="text-2xl font-black italic flex items-center gap-3 tracking-tight">
                 <FileText className="text-cyan-400" size={24} /> LOGS
               </h3>
               <button onClick={addMemo} className="p-3 bg-cyan-500 text-black rounded-2xl hover:bg-cyan-400 transition-all shadow-[0_0_30px_rgba(6,182,212,0.2)]">
                 <Plus size={20} strokeWidth={3} />
               </button>
            </div>
            
            <div className="flex-1 space-y-4 overflow-y-auto max-h-[600px] mb-8 pr-2 scrollbar-hide relative">
              {memos.map(memo => (
                <div key={memo.id} className="group bg-white/5 p-6 rounded-[2rem] border border-white/5 hover:border-cyan-500/40 transition-all">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[8px] font-black px-2 py-0.5 bg-cyan-500/10 text-cyan-400 rounded border border-cyan-500/20 uppercase tracking-widest italic">
                      #{memo.tag}
                    </span>
                  </div>
                  <div className="flex justify-between items-start gap-4">
                    <p className="text-sm leading-relaxed text-slate-300 font-medium">{memo.text}</p>
                    <button onClick={() => setMemos(memos.filter(m => m.id !== memo.id))} className="text-slate-700 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14}/></button>
                  </div>
                </div>
              ))}
              {memos.length === 0 && <p className="text-center text-slate-600 text-xs py-20 font-bold uppercase tracking-widest">Awaiting Logs...</p>}
            </div>

            {/* 同期再生ボタン */}
            <div className="pt-6 relative">
              <button onClick={togglePlay} className="w-full flex items-center justify-center gap-4 bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white p-5 rounded-[1.5rem] font-black transition-all shadow-xl active:scale-[0.98]">
                {isPlaying ? <Pause size={24} fill="currentColor"/> : <Play size={24} fill="currentColor"/>}
                <span className="tracking-widest italic uppercase">Sync Action</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}