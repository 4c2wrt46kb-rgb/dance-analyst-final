"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  Play, Pause, RotateCcw, FlipHorizontal, Grid, 
  ChevronsLeft, ChevronsRight, Upload, Repeat 
} from "lucide-react";

export default function VideoAnalyzer() {
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMirrored, setIsMirrored] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  
  // ABループ用ステート
  const [loopA, setLoopA] = useState<number | null>(null);
  const [loopB, setLoopB] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ファイル選択ハンドラ
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoSrc(url);
      // ステート初期化
      setIsPlaying(false);
      setLoopA(null);
      setLoopB(null);
    }
  };

  // 再生・一時停止
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  // 倍速変更
  const handleRateChange = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  };

  // コマ送り・コマ戻し (1フレームを約1/30秒と仮定)
  const stepFrame = (direction: "forward" | "backward") => {
    if (!videoRef.current) return;
    videoRef.current.pause();
    setIsPlaying(false);
    const frameTime = 1 / 30;
    videoRef.current.currentTime += direction === "forward" ? frameTime : -frameTime;
  };

  // 時間更新時のロジック（ABループの監視）
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const time = videoRef.current.currentTime;
    setCurrentTime(time);

    if (loopA !== null && loopB !== null && time >= loopB) {
      videoRef.current.currentTime = loopA;
    }
  };

  // プログレスバーのシーク
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const time = parseFloat(e.target.value);
    videoRef.current.currentTime = time;
    setCurrentTime(time);
  };

  // ABループ設定
  const setLoopPoint = (point: "A" | "B") => {
    if (!videoRef.current) return;
    const time = videoRef.current.currentTime;
    if (point === "A") {
      setLoopA(time);
      if (loopB !== null && time >= loopB) setLoopB(null); // AがBを超えたらBをリセット
    } else {
      if (loopA !== null && time > loopA) {
        setLoopB(time);
      }
    }
  };

  const clearLoop = () => {
    setLoopA(null);
    setLoopB(null);
  };

  // 時間のフォーマット (00:00)
  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-zinc-100 flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-5xl bg-[#121215] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md">
        
        {/* ヘッダーエリア */}
        <div className="px-6 py-4 border-b border-zinc-800 flex justify-between items-center bg-[#16161A]">
          <h1 className="text-lg font-semibold tracking-wider text-zinc-200">
            CHOREO_LAB <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded ml-2 font-mono">v2.0</span>
          </h1>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 bg-zinc-200 hover:bg-white text-black text-sm font-medium px-4 py-2 rounded-xl transition-all duration-200 shadow-md active:scale-95"
          >
            <Upload size={16} />
            動画を読み込む
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="video/*" 
            className="hidden" 
          />
        </div>

        {/* プレイヤーブロック */}
        <div className="relative bg-black aspect-video flex items-center justify-center group">
          {videoSrc ? (
            <>
              <video
                ref={videoRef}
                src={videoSrc}
                className={`w-full h-full object-contain transition-transform duration-200 ${
                  isMirrored ? "scale-x-[-1]" : ""
                }`}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
                onClick={togglePlay}
              />

              {/* グリッドオーバーレイ */}
              {showGrid && (
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
                  <div className="border-r border-b border-dashed border-white/20"></div>
                  <div className="border-r border-b border-dashed border-white/20"></div>
                  <div className="border-b border-dashed border-white/20"></div>
                  <div className="border-r border-b border-dashed border-white/20"></div>
                  <div className="border-r border-b border-dashed border-white/20"></div>
                  <div className="border-b border-dashed border-white/20"></div>
                  <div className="border-r border-dashed border-white/20"></div>
                  <div className="border-r border-dashed border-white/20"></div>
                  <div></div>
                </div>
              )}

              {/* ループマーカー視覚化（プログレスバーの上に薄く出す用） */}
              <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-zinc-800 pointer-events-none">
                {loopA !== null && duration > 0 && (
                  <div 
                    className="absolute h-full bg-amber-500/50 rounded-r"
                    style={{ 
                      left: `${(loopA / duration) * 100}%`, 
                      right: loopB !== null ? `${100 - (loopB / duration) * 100}%` : "0%" 
                    }}
                  />
                )}
              </div>
            </>
          ) : (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-4 text-zinc-500 hover:text-zinc-300 cursor-pointer transition-colors p-12 text-center"
            >
              <div className="p-4 rounded-full bg-zinc-900 border border-zinc-800 group-hover:border-zinc-700 transition-colors">
                <Upload size={32} />
              </div>
              <p className="text-sm font-medium">動画ファイルをドラッグ＆ドロップ、またはクリックして選択</p>
            </div>
          )}
        </div>

        {/* コントロールパネル */}
        {videoSrc && (
          <div className="p-6 bg-[#121215] space-y-6">
            
            {/* プログレスバー & タイムスタンプ */}
            <div className="flex items-center gap-4">
              <span className="text-xs font-mono text-zinc-400 w-12">{formatTime(currentTime)}</span>
              <input
                type="range"
                min={0}
                max={duration || 100}
                step={0.01}
                value={currentTime}
                onChange={handleSeek}
                className="flex-1 accent-white bg-zinc-800 h-1 rounded-lg cursor-pointer appearance-none"
              />
              <span className="text-xs font-mono text-zinc-400 w-12 text-right">{formatTime(duration)}</span>
            </div>

            {/* メインコントローラー */}
            <div className="flex flex-wrap items-center justify-between gap-6 pt-2">
              
              {/* 左セクション：再生・コマ送り */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => stepFrame("backward")}
                  className="p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 transition-colors"
                  title="1フレーム戻る"
                >
                  <ChevronsLeft size={18} />
                </button>
                
                <button
                  onClick={togglePlay}
                  className="p-3.5 rounded-xl bg-white hover:bg-zinc-200 text-black transition-transform active:scale-95 shadow-lg"
                >
                  {isPlaying ? <Pause size={20} fill="black" /> : <Play size={20} fill="black" />}
                </button>

                <button
                  onClick={() => stepFrame("forward")}
                  className="p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 transition-colors"
                  title="1フレーム進む"
                >
                  <ChevronsRight size={18} />
                </button>
              </div>

              {/* 中央セクション：ダンサー特化トグル（ミラー・グリッド） */}
              <div className="flex items-center bg-zinc-900 p-1 rounded-xl border border-zinc-800">
                <button
                  onClick={() => setIsMirrored(!isMirrored)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    isMirrored 
                      ? "bg-zinc-800 text-white shadow-sm" 
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <FlipHorizontal size={16} />
                  <span>ミラー {isMirrored ? "ON" : "OFF"}</span>
                </button>
                <button
                  onClick={() => setShowGrid(!showGrid)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    showGrid 
                      ? "bg-zinc-800 text-white shadow-sm" 
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <Grid size={16} />
                  <span>グリッド</span>
                </button>
              </div>

              {/* 右セクション：ABループコントロール */}
              <div className="flex items-center gap-2 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
                <button
                  onClick={() => setLoopPoint("A")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                    loopA !== null ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  A: {loopA !== null ? formatTime(loopA) : "未設定"}
                </button>
                <button
                  onClick={() => setLoopPoint("B")}
                  disabled={loopA === null}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors disabled:opacity-40 ${
                    loopB !== null ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  B: {loopB !== null ? formatTime(loopB) : "未設定"}
                </button>
                {(loopA !== null || loopB !== null) && (
                  <button
                    onClick={clearLoop}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 transition-colors"
                    title="ループ解除"
                  >
                    <RotateCcw size={14} />
                  </button>
                )}
              </div>

            </div>

            {/* 下部セクション：スピード調整スピードメーター風 */}
            <div className="flex items-center justify-between border-t border-zinc-800/60 pt-4">
              <span className="text-xs font-medium text-zinc-500 tracking-wider">PLAYBACK SPEED</span>
              <div className="flex gap-1">
                {[0.25, 0.5, 0.75, 1.0, 1.25, 1.5].map((rate) => (
                  <button
                    key={rate}
                    onClick={() => handleRateChange(rate)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                      playbackRate === rate
                        ? "bg-zinc-200 text-black font-extrabold"
                        : "text-zinc-400 hover:bg-zinc-800/50"
                    }`}
                  >
                    {rate.toFixed(2)}x
                  </button>
                ))}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}