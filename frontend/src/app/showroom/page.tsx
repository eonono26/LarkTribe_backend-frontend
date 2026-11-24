"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { loadStore, type StoreWing } from "@/components/showroom/data";

const ShowroomExperience = dynamic(() => import("@/components/showroom/ShowroomExperience"), { ssr: false });
const Opening = ({ text = "Opening the store…" }: { text?: string }) => <div className="h-[70vh] flex items-center justify-center text-sm text-stone-400">{text}</div>;

export default function ShowroomPage() {
  const [wings, setWings] = useState<StoreWing[] | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => { loadStore().then(setWings).catch(() => setError(true)); }, []);
  if (error) return <Opening text="We couldn't reach the store right now. Please try again shortly." />;
  if (!wings) return <Opening />;
  return <ShowroomExperience wings={wings} />;
}
