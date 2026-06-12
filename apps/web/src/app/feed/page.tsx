"use client";

import React, { useEffect, useRef, useState } from 'react';
import { VideoPlayer } from '@/components/feed/VideoPlayer';
import Link from 'next/link';
import { ArrowLeft, Compass, Video as VideoIcon } from 'lucide-react';

// Mock database of published videos
const FEED_DATA = [
  {
    id: "vid_1",
    url: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    author: "neon_director",
    description: "Cyberpunk short film edited entirely in Lazynext 2025. The AI rotoscoping is insane! 🤯",
    songName: "Synthwave Vibes - Lazynext Original",
    likes: 12400,
    comments: 342,
  },
  {
    id: "vid_2",
    url: "https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    author: "vfx_master",
    description: "Just testing the new 3D Fusion Node Graph. Rendered on the cloud farm in 12s.",
    songName: "Original Audio - vfx_master",
    likes: 8900,
    comments: 120,
  },
  {
    id: "vid_3",
    url: "https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
    author: "sci_fi_geek",
    description: "Color graded using the new Sentient Color Engine. Match matched to Matrix.",
    songName: "Epic Cinematic Score - royalty free",
    likes: 45000,
    comments: 890,
  }
];

export default function FeedPage() {
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      
      const scrollPosition = containerRef.current.scrollTop;
      const windowHeight = containerRef.current.clientHeight;
      
      // Calculate which video is most prominent in view
      const newActiveIndex = Math.round(scrollPosition / windowHeight);
      
      if (newActiveIndex !== activeIndex && newActiveIndex >= 0 && newActiveIndex < FEED_DATA.length) {
        setActiveIndex(newActiveIndex);
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
    }

    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
    };
  }, [activeIndex]);

  return (
    <div className="w-full h-screen bg-black flex overflow-hidden">
      
      {/* Mobile-Style Feed Container */}
      <div 
        ref={containerRef}
        className="relative w-full max-w-[500px] h-full mx-auto snap-y snap-mandatory overflow-y-scroll overflow-x-hidden hide-scrollbar"
        style={{ scrollBehavior: 'smooth' }}
      >
        {/* Navigation Overlay */}
        <div className="absolute top-0 left-0 w-full p-6 z-50 flex justify-between items-start pointer-events-none">
          <Link href="/" className="pointer-events-auto">
            <div className="p-3 bg-black/40 backdrop-blur-md rounded-full text-white hover:bg-black/60 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </div>
          </Link>
          <div className="flex gap-4">
            <div className="pointer-events-auto px-4 py-1.5 bg-black/40 backdrop-blur-md rounded-full text-white font-semibold text-sm hover:bg-black/60 transition-colors cursor-pointer">
              Following
            </div>
            <div className="pointer-events-auto px-4 py-1.5 bg-white text-black font-bold text-sm rounded-full shadow-[0_0_20px_rgba(255,255,255,0.3)]">
              For You
            </div>
          </div>
        </div>

        {FEED_DATA.map((video, index) => (
          <div key={video.id} className="w-full h-full snap-start relative">
            <VideoPlayer
              {...video}
              isActive={index === activeIndex}
            />
          </div>
        ))}
      </div>

      {/* Desktop Sidebar Navigation (Optional for widescreen) */}
      <div className="hidden lg:flex fixed left-0 top-0 h-full w-[250px] border-r border-neutral-900 bg-black/95 p-6 flex-col gap-8">
        <h1 className="text-2xl font-black text-white tracking-tighter">LAZYNEXT<span className="text-cyan-500">.</span></h1>
        
        <nav className="flex flex-col gap-4">
          <Link href="/feed" className="flex items-center gap-4 text-white font-bold text-lg">
            <Compass className="w-6 h-6" /> Explore
          </Link>
          <Link href="/editor" className="flex items-center gap-4 text-neutral-500 hover:text-white font-bold text-lg transition-colors">
            <VideoIcon className="w-6 h-6" /> Create
          </Link>
        </nav>
      </div>

      <style jsx global>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          display: inline-block;
          animation: marquee 8s linear infinite;
        }
      `}</style>
    </div>
  );
}
