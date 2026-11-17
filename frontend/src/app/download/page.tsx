import Link from "next/link";

// Set these in .env.local once the app is published, e.g.
// NEXT_PUBLIC_PLAY_STORE_URL=https://play.google.com/store/apps/details?id=...
const PLAY = process.env.NEXT_PUBLIC_PLAY_STORE_URL;
const APPLE = process.env.NEXT_PUBLIC_APP_STORE_URL;

export const metadata = { title: "Get the Larktribe app" };

export default function DownloadPage() {
  return (
    <main className="container-shell py-16 max-w-xl text-center font-sans">
      <h1 className="font-display text-2xl font-bold">A better experience in the app</h1>
      <p className="mt-3 text-sm text-stone-600">
        Faster checkout, M-Pesa payments, order tracking and app-only offers — right on your phone.
      </p>
      <div className="mt-8 flex flex-col gap-3">
        {PLAY && (
          <a href={PLAY} className="bg-black text-white py-3 text-xs uppercase tracking-widest hover:bg-stone-800 transition">
            Get it on Google Play
          </a>
        )}
        {APPLE && (
          <a href={APPLE} className="bg-black text-white py-3 text-xs uppercase tracking-widest hover:bg-stone-800 transition">
            Download on the App Store
          </a>
        )}
        {!PLAY && !APPLE && (
          <p className="text-sm text-stone-500">The app is coming soon. In the meantime you can shop right here.</p>
        )}
        <Link href="/" className="text-xs uppercase tracking-widest text-stone-500 underline underline-offset-4 py-2">
          Continue on website
        </Link>
      </div>
    </main>
  );
}
