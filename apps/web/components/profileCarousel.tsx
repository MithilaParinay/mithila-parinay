"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function ProfileCarousel({ photos }: { photos: string[] }) {
  const safePhotos = useMemo(() => (photos?.length ? photos : ["/next.svg"]), [photos]);
  const [index, setIndex] = useState(0);

  const next = () => setIndex((prev) => (prev + 1) % safePhotos.length);
  const prev = () => setIndex((prev) => (prev - 1 + safePhotos.length) % safePhotos.length);

  const active = safePhotos[index];

  return (
    <div className="relative h-[520px] w-full overflow-hidden rounded-3xl bg-slate-900 shadow-xl">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={active} alt="Profile photo" className="absolute inset-0 h-full w-full object-cover blur-2xl opacity-35" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={active} alt="Profile photo" className="relative z-10 h-full w-full object-contain" />

      <div className="absolute inset-0 z-20 bg-gradient-to-t from-black/45 to-transparent" />

      <button
        onClick={prev}
        className="absolute left-6 top-1/2 z-30 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full gradient-primary shadow-lg"
      >
        <ChevronLeft size={20} />
      </button>

      <button
        onClick={next}
        className="absolute right-6 top-1/2 z-30 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full gradient-primary shadow-lg"
      >
        <ChevronRight size={20} />
      </button>

      <div className="absolute bottom-4 right-4 z-30 rounded-full bg-black/60 px-4 py-1 text-sm font-semibold text-white">
        {index + 1} / {safePhotos.length}
      </div>
    </div>
  );
}
