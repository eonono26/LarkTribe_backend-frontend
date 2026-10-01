"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { mediaUrl } from "@/lib/api";

interface Props {
  images: Array<{
    id: number;
    image: string;
    alt_text: string;
    order: number;
  }>;
  productName: string;
  discountPercent?: number;
  productId: number | string;
}

export default function ProductImageGallery({
  images,
  productName,
  discountPercent,
}: Props) {
  const [idx, setIdx] = useState(0);
  const [open, setOpen] = useState(false);

  const imageKey = images.map((i) => i.id).join(",");

  useEffect(() => {
    setIdx((prev) => (prev >= images.length ? 0 : prev));
  }, [imageKey, images.length]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);

      if (e.key === "ArrowRight") {
        setIdx((current) => (current + 1) % images.length);
      }

      if (e.key === "ArrowLeft") {
        setIdx(
          (current) => (current - 1 + images.length) % images.length
        );
      }
    };

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, images.length]);

  if (!images?.length) {
    return (
      <div className="aspect-[3/4] bg-stone-100 flex items-center justify-center text-xs text-stone-400">
        No image
      </div>
    );
  }

  const many = images.length > 1;

  const previous = (e?: React.MouseEvent) => {
    e?.stopPropagation();

    setIdx(
      (current) => (current - 1 + images.length) % images.length
    );
  };

  const next = (e?: React.MouseEvent) => {
    e?.stopPropagation();

    setIdx((current) => (current + 1) % images.length);
  };

  return (
    <>
      <div className="w-full">
        {/* Main image */}
        <div
          className="group relative w-full bg-[#f5f5f3] overflow-hidden cursor-zoom-in"
          onClick={() => setOpen(true)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setOpen(true);
            }
          }}
          aria-label={`View ${productName}`}
        >
          <div className="relative aspect-[4/5] w-full">
            <Image
              key={images[idx].id}
              src={mediaUrl(images[idx].image)}
              alt={images[idx].alt_text || productName}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 70vw"
              className="object-cover transition-transform duration-700 group-hover:scale-[1.015]"
            />
          </div>

          {discountPercent ? (
            <span className="absolute top-5 left-5 bg-black text-white px-3 py-1.5 text-[10px] tracking-[0.18em] uppercase">
              -{discountPercent}%
            </span>
          ) : null}

          {/* Previous */}
          {many && (
            <button
              type="button"
              onClick={previous}
              aria-label="Previous image"
              className="
                absolute left-4 top-1/2 -translate-y-1/2
                w-10 h-10
                flex items-center justify-center
                bg-white/90
                opacity-0
                group-hover:opacity-100
                transition-opacity duration-300
                hover:bg-white
              "
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
              >
                <path
                  d="M15 19l-7-7 7-7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}

          {/* Next */}
          {many && (
            <button
              type="button"
              onClick={next}
              aria-label="Next image"
              className="
                absolute right-4 top-1/2 -translate-y-1/2
                w-10 h-10
                flex items-center justify-center
                bg-white/90
                opacity-0
                group-hover:opacity-100
                transition-opacity duration-300
                hover:bg-white
              "
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
              >
                <path
                  d="M9 5l7 7-7 7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}

          {/* Image counter */}
          {many && (
            <div
              className="
                absolute bottom-4 right-4
                bg-white/90
                px-3 py-1.5
                text-[10px]
                tracking-widest
              "
            >
              {String(idx + 1).padStart(2, "0")} /{" "}
              {String(images.length).padStart(2, "0")}
            </div>
          )}
        </div>

        {/* Thumbnails */}
        {many && (
          <div className="grid grid-cols-4 gap-2 mt-2">
            {images.map((image, i) => (
              <button
                key={image.id}
                type="button"
                onClick={() => setIdx(i)}
                aria-label={`View image ${i + 1}`}
                className={`
                  relative aspect-square overflow-hidden
                  bg-stone-100
                  transition-opacity
                  ${
                    i === idx
                      ? "opacity-100"
                      : "opacity-45 hover:opacity-100"
                  }
                `}
              >
                <Image
                  src={mediaUrl(image.image)}
                  alt=""
                  fill
                  sizes="120px"
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen gallery */}
      {open && (
        <div
          className="fixed inset-0 z-[100] bg-white"
          onClick={() => setOpen(false)}
        >
          {/* Close */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
            aria-label="Close"
            className="
              absolute top-5 right-5 z-30
              w-10 h-10
              border border-stone-300
              flex items-center justify-center
              hover:bg-stone-100
            "
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
            >
              <path
                d="M6 6l12 12M18 6L6 18"
                strokeLinecap="round"
              />
            </svg>
          </button>

          {/* Main fullscreen image */}
          <div
            className="absolute inset-0 flex items-center justify-center p-6 md:p-12"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative w-full h-full">
              <Image
                src={mediaUrl(images[idx].image)}
                alt={images[idx].alt_text || productName}
                fill
                priority
                sizes="100vw"
                className="object-contain"
              />
            </div>
          </div>

          {/* Previous */}
          {many && (
            <button
              type="button"
              onClick={previous}
              className="
                absolute left-5 md:left-10 top-1/2
                -translate-y-1/2
                z-20
                w-12 h-12
                border border-stone-300
                bg-white/90
                flex items-center justify-center
                hover:bg-stone-100
              "
              aria-label="Previous image"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
              >
                <path
                  d="M15 19l-7-7 7-7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}

          {/* Next */}
          {many && (
            <button
              type="button"
              onClick={next}
              className="
                absolute right-5 md:right-10 top-1/2
                -translate-y-1/2
                z-20
                w-12 h-12
                border border-stone-300
                bg-white/90
                flex items-center justify-center
                hover:bg-stone-100
              "
              aria-label="Next image"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
              >
                <path
                  d="M9 5l7 7-7 7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}

          {/* Bottom thumbnails */}
          {many && (
            <div
              className="
                absolute bottom-5 left-1/2
                -translate-x-1/2
                z-20
                flex gap-2
              "
              onClick={(e) => e.stopPropagation()}
            >
              {images.map((image, i) => (
                <button
                  key={image.id}
                  type="button"
                  onClick={() => setIdx(i)}
                  className={`
                    relative
                    w-14 h-14
                    overflow-hidden
                    border
                    ${
                      i === idx
                        ? "border-black"
                        : "border-transparent opacity-50 hover:opacity-100"
                    }
                  `}
                >
                  <Image
                    src={mediaUrl(image.image)}
                    alt=""
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}