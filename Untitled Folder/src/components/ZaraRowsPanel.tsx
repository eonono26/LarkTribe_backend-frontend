"use client";

import Link from "next/link";
import Image from "next/image";
import type { AgeRow } from "@/components/ageMenu";

export default function ZaraRowsPanel({
  rows,
  shopAllHref,
  shopAllLabel,
  onNavigate,
}: {
  rows: AgeRow[];
  shopAllHref: string;
  shopAllLabel: string;
  onNavigate: () => void;
}) {
  return (
    <div className="container-shell py-10">
      <ul className="flex flex-col gap-5 pl-[clamp(0px,8vw,160px)] max-h-[70vh] overflow-y-auto">
        {rows.map((r) => (
          <li key={r.key}>
            <Link href={r.href} onClick={onNavigate} className="group/row flex items-center gap-5 w-fit">
              <div className="relative w-[124px] h-[82px] bg-stone-100 overflow-hidden shrink-0">
                {r.image && (
                  <Image src={r.image} alt="" fill sizes="124px"
                    className="object-cover transition-transform duration-500 group-hover/row:scale-105" />
                )}
              </div>
              <div className="leading-tight">
                <p className="text-[11px] font-semibold tracking-[0.06em] uppercase text-black">{r.title}</p>
                <p className="mt-1 text-[13px] font-light tracking-[0.04em] uppercase text-stone-600 group-hover/row:text-black transition-colors">{r.subtitle}</p>
              </div>
            </Link>
          </li>
        ))}
        <li>
          <Link href={shopAllHref} onClick={onNavigate}
            className="text-[11px] font-semibold tracking-[0.06em] uppercase underline underline-offset-4 decoration-stone-300 hover:decoration-black">
            {shopAllLabel}
          </Link>
        </li>
      </ul>
    </div>
  );
}
