"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Share2, Upload, X } from "lucide-react";

type VirtualTryOnProps = {
  productName: string;
  productImageUrl?: string | null;
};

const MAX_PHOTO_SIZE = 10 * 1024 * 1024;

export default function VirtualTryOn({ productName, productImageUrl }: VirtualTryOnProps) {
  const [open, setOpen] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState("");
  const [hasPhotoPermission, setHasPhotoPermission] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    return () => {
      if (photoUrl) URL.revokeObjectURL(photoUrl);
    };
  }, [photoUrl]);

  function choosePhoto(file?: File) {
    setError("");
    setPhotoUrl(null);
    setPhotoName("");
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Choose an image file.");
      return;
    }
    if (file.size > MAX_PHOTO_SIZE) {
      setError("Choose an image smaller than 10 MB.");
      return;
    }
    setPhotoUrl(URL.createObjectURL(file));
    setPhotoName(file.name);
  }

  async function shareProduct() {
    const url = window.location.href;
    const shareData = { title: productName, text: `Take a look at ${productName} on LarkTribe.`, url };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setError("Product link copied. You can share it with a friend.");
      } else {
        setError("Sharing is not available in this browser.");
      }
    } catch (shareError) {
      if (shareError instanceof DOMException && shareError.name === "AbortError") return;
      setError("Could not share this product. Please try again.");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full border border-stone-300 py-3 text-[11px] uppercase tracking-[0.16em] font-medium hover:border-black transition"
      >
        Try It On
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="try-on-title"
            className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto bg-white p-5 sm:p-8"
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close virtual try-on"
              className="absolute right-4 top-4 p-2 text-stone-500 hover:text-black"
            >
              <X size={20} />
            </button>
            <p className="text-[10px] uppercase tracking-[0.22em] text-stone-500">Virtual styling studio</p>
            <h2 id="try-on-title" className="mt-2 font-editorial text-2xl sm:text-3xl">Try {productName}</h2>
            <p className="mt-2 max-w-xl text-sm text-stone-500">
              Choose a clear, full-length photo and preview your setup before trying another colour or style.
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="flex min-h-64 items-center justify-center bg-stone-100">
                {photoUrl ? (
                  // A local object URL keeps this image on the shopper's device.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoUrl} alt="Your selected photo preview" className="max-h-[28rem] w-full object-contain" />
                ) : (
                  <div className="p-8 text-center">
                    <Upload className="mx-auto mb-3 text-stone-500" size={24} />
                    <p className="text-sm font-medium">Your photo</p>
                    <p className="mt-1 text-xs text-stone-500">Full-length, well-lit photos work best.</p>
                  </div>
                )}
              </div>
              <div className="relative flex min-h-64 items-center justify-center overflow-hidden bg-stone-100">
                {productImageUrl ? (
                  <Image src={productImageUrl} alt={productName} fill className="object-contain" sizes="(max-width: 640px) 100vw, 40vw" />
                ) : (
                  <p className="p-8 text-center text-sm text-stone-500">{productName}</p>
                )}
              </div>
            </div>

            <label className="mt-5 flex cursor-pointer items-start gap-3 text-sm text-stone-700">
              <input
                type="checkbox"
                checked={hasPhotoPermission}
                onChange={(event) => setHasPhotoPermission(event.target.checked)}
                className="mt-1 accent-black"
              />
              <span>I own this photo or have permission from the person shown to use it.</span>
            </label>

            <div className="mt-4 flex flex-wrap gap-3">
              <label className="inline-flex cursor-pointer items-center justify-center gap-2 bg-black px-5 py-3 text-[11px] uppercase tracking-widest text-white hover:bg-stone-800">
                <Upload size={15} />
                {photoName ? "Choose another photo" : "Choose a photo"}
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(event) => {
                    choosePhoto(event.target.files?.[0]);
                    event.currentTarget.value = "";
                  }}
                />
              </label>
              <button
                type="button"
                onClick={shareProduct}
                className="inline-flex items-center gap-2 border border-stone-300 px-5 py-3 text-[11px] uppercase tracking-widest hover:border-black"
              >
                <Share2 size={15} />
                Share product
              </button>
            </div>
            {photoName && <p className="mt-2 text-xs text-stone-500">Selected: {photoName}</p>}
            {error && <p role="status" className="mt-3 text-sm text-red-700">{error}</p>}

            {photoUrl && (
              <div className="mt-5 border-l-2 border-stone-300 bg-stone-50 p-4">
                <p className="text-sm font-medium">
                  {hasPhotoPermission ? "Photo ready for virtual try-on" : "Confirm photo permission to continue"}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-stone-600">
                  AI try-on is not connected yet. Your photo is only previewed in this browser and has not been uploaded or processed. We&apos;ll enable generated previews after the provider and privacy review are approved.
                </p>
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
