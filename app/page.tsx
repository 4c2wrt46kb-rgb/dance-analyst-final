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

export default function VideoAnalyzer() {
  // 保存データ読み込み
  const [tabs, setTabs] = useState<VideoTab[]>(() => {
    if (typeof window !== "undefined") {
      const savedTabs = localStorage.getItem("video-analyzer-tabs");

      if (savedTabs) {
        const parsedTabs: VideoTab[] = JSON.parse(savedTabs);

        return parsedTabs.map((tab) => ({
          ...tab,
          videoSrc: null,
        }));
      }
    }

    return [
      {
        id: "tab-1",
        name: "セッション 1",
        videoSrc: null,
        isMirrored: false,
        rotation: 0,
        showGrid: false,
        playbackRate: 1,
        notes: "",
      },
    ];
  });

  // アクティブタブ保存
  const [activeTabId, setActiveTabId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return (
        localStorage.getItem("video-analyzer-active-tab") || "tab-1"
      );
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

  // 自動保存
  useEffect(() => {
    const safeTabs = tabs.map((tab) => ({
      ...tab,
      videoSrc: null,
    }));

    localStorage.setItem(
      "video-analyzer-tabs",
      JSON.stringify(safeTabs)
    );
  }, [tabs]);

  useEffect(() => {
    localStorage.setItem(
      "video-analyzer-active-tab",
      activeTabId
    );
  }, [activeTabId]);

  const updateActiveTab = (
    updates: Partial<VideoTab>
  ) => {
    setTabs((prev) =>
      prev.map((tab) =>
        tab.id === activeTabId
          ? { ...tab, ...updates }
          : tab
      )
    );
  };

  // タブ切り替え時
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate =
        activeTab.playbackRate;

      setCurrentTime(
        videoRef.current.currentTime || 0
      );
    }

    setIsPlaying(false);
  }, [activeTabId, activeTab.playbackRate]);

  const addNewTab = () => {
    const newId = `tab-${Date.now()}`;

    const newTab: VideoTab = {
      id: newId,
      name: `セッション ${tabs.length + 1}`,
      videoSrc: null,
      isMirrored: false,
      rotation: 0,
      showGrid: false,
      playbackRate: 1,
      notes: "",
    };

    setTabs([...tabs, newTab]);
    setActiveTabId(newId);
    setIsPlaying(false);
  };

  const closeTab = (
    idToClose: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();

    if (tabs.length === 1) return;

    const filtered = tabs.filter(
      (tab) => tab.id !== idToClose
    );

    setTabs(filtered);

    if (activeTabId === idToClose) {
      setActiveTabId(
        filtered[filtered.length - 1].id
      );
    }

    setIsPlaying(false);
  };

  const startRename = (
    tab: VideoTab,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    setEditingTabId(tab.id);
    setEditName(tab.name);
  };

  const saveRename = () => {
    if (editName.trim()) {
      setTabs((prev) =>
        prev.map((t) =>
          t.id === editingTabId
            ? { ...t, name: editName }
            : t
        )
      );
    }

    setEditingTabId(null);
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (file) {
      const url = URL.createObjectURL(file);

      updateActiveTab({
        videoSrc: url,
        name: file.name.substring(0, 10),
      });

      setIsPlaying(false);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }

    setIsPlaying(!isPlaying);
  };

  const handleRateSliderChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const rate = parseFloat(e.target.value);

    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }

    updateActiveTab({
      playbackRate: rate,
    });
  };

  const toggleRotation = () => {
    updateActiveTab({
      rotation: (activeTab.rotation + 90) % 360,
    });
  };

  const stepFrame = (
    direction: "forward" | "backward"
  ) => {
    if (!videoRef.current) return;

    videoRef.current.pause();
    setIsPlaying(false);

    videoRef.current.currentTime +=
      direction === "forward"
        ? 1 / 30
        : -1 / 30;
  };

  const handleSeek = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!videoRef.current) return;

    const time = parseFloat(e.target.value);

    videoRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const jumpToTime = (seconds: number) => {
    if (!videoRef.current) return;

    videoRef.current.currentTime = seconds;
    setCurrentTime(seconds);

    if (!isPlaying) {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const renderNotesWithTimestamps = (
    text: string
  ) => {
    if (!text) {
      return (
        <span className="text-zinc-600 text-xs">
          ここにメモを入力すると、
          タイムスタンプが自動生成されます。
        </span>
      );
    }

    const lines = text.split("\n");

    return lines.map((line, i) => {
      const timestampRegex =
        /(\d{1,2}):(\d{2})/g;

      const parts = [];

      let lastIndex = 0;
      let match;

      while (
        (match = timestampRegex.exec(line)) !==
        null
      ) {
        const matchIndex = match.index;

        if (matchIndex > lastIndex) {
          parts.push(
            line.substring(lastIndex, matchIndex)
          );
        }

        const mins = parseInt(match[1], 10);
        const secs = parseInt(match[2], 10);

        const totalSeconds = mins * 60 + secs;

        parts.push(
          <button
            key={matchIndex}
            onClick={() =>
              jumpToTime(totalSeconds)
            }
            className="text-amber-400 hover:text-amber-300 font-mono font-bold underline bg-amber-500/10 px-1 rounded transition-colors inline-block my-0.5 mx-0.5"
          >
            {match[0]}
          </button>
        );

        lastIndex = timestampRegex.lastIndex;
      }

      if (lastIndex < line.length) {
        parts.push(
          line.substring(lastIndex)
        );
      }

      return (
        <div
          key={i}
          className="min-h-[1.5rem] break-all"
        >
          {parts.length > 0 ? parts : line}
        </div>
      );
    });
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);

    const secs = Math.floor(time % 60);

    return `${mins}:${secs
      .toString()
      .padStart(2, "0")}`;
  };