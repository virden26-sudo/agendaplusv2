"use client";

import React, { useState, useEffect } from "react";
import { 
  RotateCcw, 
  Share, 
  BookOpen, 
  Layers, 
  MoreHorizontal, 
  Lock,
  Type,
  Wifi,
  Signal,
  Battery,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

interface IosSafariBrowserProps {
  initialUrl?: string;
}

export function IosSafariBrowser({ initialUrl = "https://navigate.nu.edu/d2l/home" }: IosSafariBrowserProps) {
  const [url, setUrl] = useState(initialUrl);
  const [inputValue, setInputValue] = useState(initialUrl);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleReload = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1500);
  };

  const handleSubmitUrl = (e: React.FormEvent) => {
    e.preventDefault();
    let targetUrl = inputValue;
    if (!targetUrl.startsWith("http")) {
      targetUrl = "https://" + targetUrl;
    }
    setUrl(targetUrl);
    setInputValue(targetUrl);
  };

  return (
    <div className="flex flex-col h-full max-w-[430px] mx-auto bg-black rounded-[55px] p-3 shadow-2xl border-[8px] border-[#1f1f1f] relative overflow-hidden ring-1 ring-white/10">
      {/* Dynamic Island / Notch Area */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-8 bg-black rounded-b-3xl z-50 flex items-center justify-center">
        <div className="w-12 h-4 bg-[#1a1a1a] rounded-full" />
      </div>

      {/* iOS Status Bar */}
      <div className="flex justify-between items-center px-8 pt-4 pb-2 text-white text-[13px] font-semibold z-40 bg-black">
        <div className="w-14">{currentTime}</div>
        <div className="flex items-center gap-1.5">
          <Signal className="size-3.5 fill-current" />
          <Wifi className="size-3.5" />
          <div className="flex items-center">
            <Battery className="size-5 rotate-180" />
          </div>
        </div>
      </div>

      {/* Browser Content */}
      <div className="flex-1 bg-white rounded-t-[40px] overflow-hidden flex flex-col mt-1 relative">
        {/* Safari Header / Address Bar */}
        <div className="bg-[#f2f2f7] pt-4 pb-2 px-4 border-b flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
                <div className="flex-1 bg-[#e3e3e8] rounded-xl flex items-center px-3 py-1.5 gap-2 border border-black/5">
                    <Type className="size-4 text-slate-500" />
                    <div className="flex-1 flex items-center gap-1 overflow-hidden">
                        <Lock className="size-3 text-slate-400 shrink-0" />
                        <form onSubmit={handleSubmitUrl} className="flex-1">
                            <input 
                                type="text"
                                className="bg-transparent border-none outline-none text-sm w-full truncate font-medium text-slate-800"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                            />
                        </form>
                    </div>
                    <RotateCcw 
                        className={cn("size-4 text-slate-500 cursor-pointer", isLoading && "animate-spin")} 
                        onClick={handleReload}
                    />
                </div>
                <div className="p-2 rounded-full hover:bg-black/5 transition-colors">
                    <MoreHorizontal className="size-5 text-blue-500" />
                </div>
            </div>
        </div>

        {/* Webview Area */}
        <div className="flex-1 relative bg-slate-50">
          <iframe 
            src={url} 
            className="w-full h-full border-none"
            title="Portal View"
          />
          {isLoading && (
            <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center">
                <RotateCcw className="size-10 animate-spin text-blue-500" />
            </div>
          )}
        </div>

        {/* Safari Bottom Toolbar */}
        <div className="bg-[#f2f2f7]/95 backdrop-blur-xl border-t pb-8 pt-3 px-6 flex justify-between items-center safe-area-bottom">
            <ChevronLeft className="size-6 text-slate-300" />
            <ChevronRight className="size-6 text-slate-300" />
            <Share className="size-5 text-blue-500" />
            <BookOpen className="size-5 text-blue-500" />
            <Layers className="size-5 text-blue-500" />
        </div>
      </div>

      {/* Home Indicator */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/30 rounded-full z-50" />
    </div>
  );
}
