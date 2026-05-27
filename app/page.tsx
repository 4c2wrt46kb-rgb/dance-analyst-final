"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Play,
  Pause,
  FlipHorizontal,
  Grid,
  ChevronsLeft,
  ChevronsRight,
  Upload,
  Plus,
  X,
  RotateCw,
  FileText,
  Edit2,
} from "lucide-react";

interface VideoTab {
  id: string;
  name: string;
  videoSrc: string | null;
  isMirrored: boolean;
  rotation: number;
  showGrid: boolean;
  playbackRate: number;
  notes: string;
}

const DEFAULT_TAB: VideoTab = {
  id: "tab-1",
  name: "セッション 1",
  videoSrc: null,
  isMirrored: false,
  rotation: 0,
  showGrid: false,
  playbackRate: 1,
  notes: "",
};

export default function VideoAnalyzer() {
  // ===== tabs（動画は復元しない）=====
  const [tabs, setTabs] = useState<VideoTab[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("video-analyzer-tabs");

      if (saved) {
        try {
          const parsed: VideoTab[] = JSON.parse(saved);

          return parsed.map((t) => ({
            ...t,
            videoSrc: null, // ←重要：必ずリセット
          }));
        } catch {
          return [DEFAULT_TAB];
        }
      }
    }
    return [DEFAULT_TAB];
  });

  // ===== active tab =====
  const [activeTabId, setActiveTabId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("video-analyzer-active-tab") || "tab-1";
    }
    return "tab-1";
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const activeTab =
    tabs.find((t) => t.id === activeTabId) || tabs[0];

  // ===== 保存（videoは保存しない）=====
  useEffect(() => {
    const safeTabs = tabs.map((t) => ({
      ...t,
      videoSrc: null,
    }));

    localStorage.setItem(
      "video-analyzer-tabs",
      JSON.stringify(safeTabs)
    );
  }, [tabs]);

  useEffect(() => {
    localStorage.setItem("video-analyzer-active-tab", activeTabId);
  }, [activeTabId]);

  // ===== update =====
  const updateActiveTab = (updates: Partial<VideoTab>) => {
    setTabs((prev) =>
      prev.map((tab) =>
        tab.id === activeTabId ? { ...tab, ...updates } : tab
      )
    );
  };

  // ===== タブ切り替え =====
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = activeTab.playbackRate;
      setCurrentTime(videoRef.current.currentTime || 0);
    }
    setIsPlaying(false);
  }, [activeTabId, activeTab.playbackRate]);

  // ===== add tab =====
  const addNewTab = () => {
    const id = `tab-${Date.now()}`;

    const newTab: VideoTab = {
      ...DEFAULT_TAB,
      id,
      name: `セッション ${tabs.length + 1}`,
    };

    setTabs([...tabs, newTab]);
    setActiveTabId(id);
  };

  // ===== close tab =====
  const closeTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length === 1) return;

    const filtered = tabs.filter((t) => t.id !== id);
    setTabs(filtered);

    if (activeTabId === id) {
      setActiveTabId(filtered[0].id);
    }
  };

  // ===== rename =====
  const saveRename = () => {
    if (!editName.trim()) return;

    setTabs((prev) =>
      prev.map((t) =>
        t.id === editingTabId ? { ...t, name: editName } : t
      )
    );
    setEditingTabId(null);
  };

  // ===== file load =====
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);

    updateActiveTab({
      videoSrc: url,
      name: file.name.substring(0, 10),
    });

    setIsPlaying(false);
  };

  // ===== play =====
  const togglePlay = () => {
    if (!videoRef.current) return;

    if (isPlaying) videoRef.current.pause();
    else videoRef.current.play();

    setIsPlaying(!isPlaying);
  };

  // ===== seek =====
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;

    const t = parseFloat(e.target.value);
    videoRef.current.currentTime = t;
    setCurrentTime(t);
  };

  // ===== frame step =====
  const stepFrame = (dir: "forward" | "backward") => {
    if (!videoRef.current) return;

    videoRef.current.pause();
    setIsPlaying(false);

    videoRef.current.currentTime += dir === "forward" ? 1 / 30 : -1 / 30;
  };

  // ===== timestamp jump =====
  const jumpToTime = (sec: number) => {
    if (!videoRef.current) return;

    videoRef.current.currentTime = sec;
    setCurrentTime(sec);

    videoRef.current.play();
    setIsPlaying(true);
  };

  // ===== notes renderer =====
  const renderNotesWithTimestamps = (text: string) => {
    if (!text)
      return (
        <span className="text-zinc-600 text-xs">
          メモを入力するとタイムスタンプが有効になります
        </span>
      );

    return text.split("\n").map((line, i) => {
      const regex = /(\d{1,2}):(\d{2})/g;
      const parts: any[] = [];

      let last = 0;
      let m;

      while ((m = regex.exec(line))) {
        const idx = m.index;

        if (idx > last) parts.push(line.slice(last, idx));

        const sec = parseInt(m[1]) * 60 + parseInt(m[2]);

        parts.push(
          <button
            key={idx}
            onClick={() => jumpToTime(sec)}
            className="text-amber-400 underline mx-1"
          >
            {m[0]}
          </button>
        );

        last = regex.lastIndex;
      }

      parts.push(line.slice(last));

      return (
        <div key={i} className="text-xs text-zinc-300">
          {parts}
        </div>
      );
    });
  };

  const formatTime = (t: number) => {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // ================= UI =================
  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-6xl mx-auto bg-zinc-900 rounded-xl p-4">

        {/* tabs */}
        <div className="flex gap-2 mb-4">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              className={`px-3 py-1 rounded cursor-pointer ${
                tab.id === activeTabId ? "bg-white text-black" : "bg-zinc-800"
              }`}
            >
              {tab.name}
              <X onClick={(e) => closeTab(tab.id, e)} size={14} />
            </div>
          ))}
          <button onClick={addNewTab}>+</button>
        </div>

        {/* video */}
        <div className="bg-black aspect-video flex items-center justify-center">
          {activeTab.videoSrc ? (
            <video
              ref={videoRef}
              src={activeTab.videoSrc}
              className="w-full h-full"
              onTimeUpdate={() =>
                setCurrentTime(videoRef.current?.currentTime || 0)
              }
              onLoadedMetadata={() =>
                setDuration(videoRef.current?.duration || 0)
              }
            />
          ) : (
            <button onClick={() => fileInputRef.current?.click()}>
              動画を選択
            </button>
          )}
        </div>

        {/* controls */}
        {activeTab.videoSrc && (
          <div className="mt-2">
            <input
              type="range"
              min={0}
              max={duration}
              value={currentTime}
              onChange={handleSeek}
            />

            <div className="flex gap-2">
              <button onClick={togglePlay}>
                {isPlaying ? "Pause" : "Play"}
              </button>
              <button onClick={() => stepFrame("backward")}>-1f</button>
              <button onClick={() => stepFrame("forward")}>+1f</button>
            </div>
          </div>
        )}

        {/* notes */}
        <textarea
          value={activeTab.notes}
          onChange={(e) => updateActiveTab({ notes: e.target.value })}
          className="w-full mt-4 bg-zinc-800 p-2"
        />

        <div className="mt-2">
          {renderNotesWithTimestamps(activeTab.notes)}
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    </div>
  );
}