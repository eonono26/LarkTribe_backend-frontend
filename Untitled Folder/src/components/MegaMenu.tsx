"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import type { Category } from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Tree building — everything comes from the categories API           */
/* ------------------------------------------------------------------ */

export type MenuNode = {
  id: number;
  label: string;
  href: string;
  children: MenuNode[];
};

export type QuickGroup = {
  title: string;
  links: { label: string; href: string }[];
};

export type MenuData = {
  nodes: MenuNode[];
  quick: QuickGroup[]; // "Shop by age" / "Shop for" chips (Kids + Babies)
};

/**
 * Turn the flat category list into a tree: Main category → Category → Type.
 * A node is kept only if it (or something under it) has products, so the menu
 * never shows dead links. `allowed` restricts to a stage (kids / baby).
 */
export function buildTree(
  scope: string,
  categories: Category[],
  allowed?: Set<number>
): MenuNode[] {
  const active = categories.filter((c) => c.is_active !== false);
  const hrefFor = (c: Category) => `/shop?${scope}&category=${encodeURIComponent(c.slug)}`;
  const own = (c: Category) => (allowed ? allowed.has(c.id) : (c.product_count ?? 0) > 0);

  const kids = new Map<number | null, Category[]>();
  for (const c of active) {
    const key = c.parent ?? null;
    if (!kids.has(key)) kids.set(key, []);
    kids.get(key)!.push(c);
  }
  const byOrder = (a: Category, b: Category) =>
    (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name);

  const ids = new Set(active.map((c) => c.id));

  const walk = (c: Category, depth: number): MenuNode | null => {
    const children =
      depth >= 2
        ? []
        : (kids.get(c.id) ?? [])
            .sort(byOrder)
            .map((k) => walk(k, depth + 1))
            .filter((n): n is MenuNode => !!n);
    // depth-3+ categories are folded into their parent's link (parent filter includes descendants)
    if (!own(c) && children.length === 0 && !hasDeepProducts(c.id)) return null;
    return { id: c.id, label: c.name, href: hrefFor(c), children };
  };

  const hasDeepProducts = (id: number): boolean =>
    (kids.get(id) ?? []).some((k) => own(k) || hasDeepProducts(k.id));

  // roots = no parent, or parent not in this scope's list
  const roots = active
    .filter((c) => c.parent == null || !ids.has(c.parent))
    .sort(byOrder);

  return roots.map((r) => walk(r, 0)).filter((n): n is MenuNode => !!n);
}

/* ------------------------------------------------------------------ */
/* Desktop panel                                                       */
/* ------------------------------------------------------------------ */

function Column({
  nodes,
  activeId,
  onActive,
  onNavigate,
  heading,
}: {
  nodes: MenuNode[];
  activeId?: number | null;
  onActive?: (id: number) => void;
  onNavigate: () => void;
  heading?: { label: string; href: string };
}) {
  return (
    <ul className="min-w-[210px] max-w-[260px] max-h-[62vh] overflow-y-auto pr-2 space-y-0.5">
      {heading && (
        <li>
          <Link
            href={heading.href}
            onClick={onNavigate}
            className="block py-1.5 text-[13px] font-semibold text-black underline underline-offset-4 decoration-stone-300 hover:decoration-black"
          >
            {heading.label}
          </Link>
        </li>
      )}
      {nodes.map((n) => {
        const isActive = activeId === n.id;
        return (
          <li key={n.id} onMouseEnter={() => onActive?.(n.id)} onFocus={() => onActive?.(n.id)}>
            <Link
              href={n.href}
              onClick={onNavigate}
              className={`flex items-center justify-between gap-3 py-1.5 text-[15px] transition ${
                isActive ? "text-black" : "text-stone-600 hover:text-black"
              }`}
            >
              <span>{n.label}</span>
              {n.children.length > 0 && (
                <ChevronRight
                  className={`w-3.5 h-3.5 transition ${isActive ? "opacity-100" : "opacity-30"}`}
                  strokeWidth={1.5}
                />
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function MegaPanel({
  label,
  href,
  data,
  onNavigate,
}: {
  label: string;
  href: string;
  data: MenuData;
  onNavigate: () => void;
}) {
  const [l1, setL1] = useState<number | null>(data.nodes[0]?.id ?? null);
  const [l2, setL2] = useState<number | null>(null);

  const first = data.nodes.find((n) => n.id === l1) ?? data.nodes[0];
  const second = first?.children.find((n) => n.id === l2);

  return (
    <div className="container-shell py-8">
      <div className="flex gap-10 lg:gap-14">
        {/* Column 1 — main sections */}
        <Column
          nodes={data.nodes}
          activeId={first?.id}
          heading={{ label: `Shop all ${label}`, href }}
          onActive={(id) => { setL1(id); setL2(null); }}
          onNavigate={onNavigate}
        />

        {/* Column 2 — appears for the hovered section */}
        {first && first.children.length > 0 && (
          <Column
            nodes={first.children}
            activeId={second?.id}
            heading={{ label: `All ${first.label}`, href: first.href }}
            onActive={setL2}
            onNavigate={onNavigate}
          />
        )}

        {/* Column 3 — only when a level-2 item has its own children */}
        {second && second.children.length > 0 && (
          <Column
            nodes={second.children}
            heading={{ label: `All ${second.label}`, href: second.href }}
            onNavigate={onNavigate}
          />
        )}

        {/* Shop by age / gender — Kids & Babies only */}
        {data.quick.length > 0 && (
          <div className="ml-auto hidden xl:block pl-10 border-l border-stone-100 space-y-6 max-w-sm">
            {data.quick.map((g) => (
              <div key={g.title}>
                <p className="text-[11px] tracking-[0.14em] uppercase text-stone-400 mb-3">{g.title}</p>
                <div className="flex flex-wrap gap-2">
                  {g.links.map((l) => (
                    <Link
                      key={l.href}
                      href={l.href}
                      onClick={onNavigate}
                      className="px-3.5 py-1.5 rounded-full border border-stone-200 text-[13px] text-stone-700 hover:border-black hover:bg-black hover:text-white transition"
                    >
                      {l.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Mobile accordion                                                    */
/* ------------------------------------------------------------------ */

function MobileNode({ node, depth, onNavigate }: { node: MenuNode; depth: number; onNavigate: () => void }) {
  const [open, setOpen] = useState(false);
  const pad = { paddingLeft: 20 + depth * 16 };
  if (node.children.length === 0) {
    return (
      <Link href={node.href} onClick={onNavigate} style={pad} className="block pr-5 py-2.5 text-[15px] text-stone-700">
        {node.label}
      </Link>
    );
  }
  return (
    <div>
      <div className="flex items-center justify-between pr-5" style={pad}>
        <Link href={node.href} onClick={onNavigate} className="flex-1 py-2.5 text-[15px] text-stone-700">
          {node.label}
        </Link>
        <button aria-label={`Expand ${node.label}`} onClick={() => setOpen(!open)} className="p-2 -mr-2">
          <ChevronDown className={`w-4 h-4 text-stone-400 transition ${open ? "rotate-180" : ""}`} />
        </button>
      </div>
      {open && (
        <div>
          <Link href={node.href} onClick={onNavigate} style={{ paddingLeft: 20 + (depth + 1) * 16 }} className="block pr-5 py-2 text-[13px] text-stone-400">
            All {node.label}
          </Link>
          {node.children.map((c) => (
            <MobileNode key={c.id} node={c} depth={depth + 1} onNavigate={onNavigate} />
          ))}
        </div>
      )}
    </div>
  );
}

export function MobileMenuBody({ data, href, label, onNavigate }: { data: MenuData; href: string; label: string; onNavigate: () => void }) {
  return (
    <div className="bg-stone-50/60 py-2">
      <Link href={href} onClick={onNavigate} className="block px-5 py-2.5 text-[13px] font-semibold underline underline-offset-4">
        Shop all {label}
      </Link>
      {data.quick.map((g) => (
        <div key={g.title} className="px-5 py-3">
          <p className="text-[10px] tracking-[0.14em] uppercase text-stone-400 mb-2">{g.title}</p>
          <div className="flex flex-wrap gap-2">
            {g.links.map((l) => (
              <Link key={l.href} href={l.href} onClick={onNavigate} className="px-3 py-1.5 rounded-full border border-stone-200 bg-white text-[12px]">
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      ))}
      {data.nodes.map((n) => (
        <MobileNode key={n.id} node={n} depth={0} onNavigate={onNavigate} />
      ))}
    </div>
  );
}
