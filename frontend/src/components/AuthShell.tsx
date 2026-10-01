import Link from "next/link";

const PORTAL_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDnqNkL-zW7TeIPiAOm3lT-9qJR8PLSB4ZV7QsJEGAQ4gu_AvO0PfU_sRNWz5eZ1dXr5dQ5WyOXm__TgqqT510ZXdqex2h6d2MAl_BSf-QUaNhAvVdgIUQrfx2jD_516W408alzEN7bUn4uENa4kp715CCVDddpU9ffpGhjX7PqRGs2DynLpSbHqMJzR1l1AvuUigRGvbR6qJRQHv_jNxip1W_hdWs7Kl-NN8QEyH70LyKRJeMPrXi46w";

/**
 * AuthShell — split-screen frame shared by /login and /register, matching
 * the approved "Atelier Sign-In" design: a full-height editorial portrait
 * with a quote on the left (desktop only), and a tabbed form panel on the
 * right. Each page supplies its own form as children.
 */
export default function AuthShell({
  active,
  children,
}: {
  active: "signin" | "register";
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-[calc(100vh-5rem)] bg-stone-50 text-espresso font-sans flex flex-col lg:flex-row">
      {/* Editorial Portrait — desktop only */}
      <div className="hidden lg:block relative lg:w-1/2 min-h-[70vh] bg-stone-950">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt="" className="absolute inset-0 w-full h-full object-cover opacity-80" src={PORTAL_IMAGE} />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950/95 via-stone-950/40 to-stone-950/10" />
        <div className="relative z-10 h-full flex flex-col justify-between p-10 xl:p-14 text-white">
          <span className="text-[11px] uppercase tracking-[0.25em] text-stone-300">Lark Tribe Private Portal</span>
          <blockquote className="font-editorial text-3xl xl:text-4xl italic font-light leading-snug max-w-lg">
            &ldquo;Welcome back to the Lark Tribe Atelier. Your wishlist, orders, and saved details await.&rdquo;
          </blockquote>
          <div className="flex items-center gap-3">
            <span className="text-[11px] uppercase tracking-widest text-stone-300">Archival Continuity</span>
            <span className="h-px flex-1 bg-white/20" />
            <span className="text-[11px] text-stone-400">Curated garments, made to last</span>
          </div>
        </div>
      </div>

      {/* Form Panel */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-8 py-12 sm:py-16">
        <div className="w-full max-w-md">
          <div className="flex items-center justify-between gap-6 border-b border-stone-200 mb-8">
            <div className="flex items-center gap-6 text-xs uppercase tracking-widest font-semibold">
              <Link
                href="/login"
                className={`pb-3 -mb-px border-b-2 transition ${
                  active === "signin" ? "border-espresso text-espresso" : "border-transparent text-stone-400 hover:text-stone-600"
                }`}
              >
                Patron Sign In
              </Link>
              <Link
                href="/register"
                className={`pb-3 -mb-px border-b-2 transition ${
                  active === "register" ? "border-espresso text-espresso" : "border-transparent text-stone-400 hover:text-stone-600"
                }`}
              >
                Create Account
              </Link>
            </div>
            <span className="hidden sm:inline text-[10px] uppercase tracking-widest text-stone-400 pb-3">Est. 2024</span>
          </div>

          {children}
        </div>
      </div>
    </main>
  );
}
