"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Volume2, VolumeX, Play } from "lucide-react";
import type { ShowcaseVideoItem } from "@/lib/types";

function VideoTile({ item }: { item: ShowcaseVideoItem }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);

  function toggleSound(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  }

  const href = item.resolved_link || item.link_url || "#";

  return (
    <Link
      href={href}
      className="group relative w-full aspect-[4/5] rounded-xl overflow-hidden bg-neutral-900"
    >
      <video
        ref={videoRef}
        src={item.video_url || undefined}
        poster={item.thumbnail_url || undefined}
        muted={muted}
        loop
        playsInline
        autoPlay
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/10 pointer-events-none" />

      {!playing && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black/50 rounded-full p-3 backdrop-blur-sm">
            {/* <Play size={24} className="text-white fill-white" /> */}
          </div>
        </div>
      )}

      <button
        onClick={toggleSound}
        aria-label={muted ? "Unmute" : "Mute"}
        className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm rounded-full p-2 text-white hover:bg-black/70 transition-colors"
      >
        {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
      </button>

      {/* <div className="absolute bottom-0 left-0 right-0 p-4">
        <p className="text-white font-display font-bold text-lg drop-shadow-md line-clamp-2">{item.title}</p>
        <span className="text-white/90 text-sm font-semibold underline">{item.cta_label || "Shop now"}</span>
      </div> */}
    </Link>
  );
}

export default function VideoShowcase({ videos }: { videos: ShowcaseVideoItem[] }) {
  const items = videos
    .filter((v) => v.video_url)
    .slice(0, 3); // Three videos, one row

  if (items.length === 0) return null;

  return (
    <section>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6">
        {items.map((item) => (
          <VideoTile key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}