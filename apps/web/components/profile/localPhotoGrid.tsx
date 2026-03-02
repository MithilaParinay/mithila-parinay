"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  files: File[];
  onChange: (next: File[]) => void;
  max?: number;
  min?: number;
  title?: string;
};

export default function LocalPhotoGrid({
  files,
  onChange,
  max = 9,
  min = 3,
  title = "Profile photos",
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [replaceIndex, setReplaceIndex] = useState<number | null>(null);
  const [brokenPreviews, setBrokenPreviews] = useState<Record<number, boolean>>({});
  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviews(urls);
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [files]);

  function openPicker() {
    inputRef.current?.click();
  }

  function addFiles(fileList: FileList | null) {
    if (!fileList?.length) return;

    const picked = Array.from(fileList);
    if (replaceIndex !== null) {
      const replacement = picked[0];
      if (replacement) {
        const next = [...files];
        next[replaceIndex] = replacement;
        onChange(next);
        setBrokenPreviews((prev) => ({ ...prev, [replaceIndex]: false }));
      }
      setReplaceIndex(null);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    const remaining = max - files.length;
    const selected = picked.slice(0, Math.max(remaining, 0));
    if (!selected.length) return;
    onChange([...files, ...selected]);
    if (inputRef.current) inputRef.current.value = "";
  }

  function removeAt(index: number) {
    onChange(files.filter((_, idx) => idx !== index));
    setBrokenPreviews((prev) => {
      const next: Record<number, boolean> = {};
      Object.entries(prev).forEach(([k, v]) => {
        const idx = Number(k);
        if (idx < index) next[idx] = v;
        if (idx > index) next[idx - 1] = v;
      });
      return next;
    });
  }

  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= files.length) return;
    const next = [...files];
    const tmp = next[index];
    next[index] = next[target];
    next[target] = tmp;
    onChange(next);
    setBrokenPreviews((prev) => {
      const out = { ...prev };
      const a = out[index];
      out[index] = out[target];
      out[target] = a;
      return out;
    });
  }

  function replaceAt(index: number) {
    setReplaceIndex(index);
    inputRef.current?.click();
  }

  return (
    <section className="rounded-2xl border border-pink-100 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-extrabold text-pink-800">{title}</h3>
          {/* <p className="text-sm text-slate-600">
            Upload up to {max} photos in a grid. {min > 0 ? `Minimum ${min} recommended.` : "No minimum required."}
          </p> */}
        </div>
        <button type="button" className="btn-outline text-sm" onClick={openPicker} disabled={files.length >= max}>
          Add photos
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => addFiles(e.target.files)}
      />

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
        {Array.from({ length: max }).map((_, idx) => {
          const preview = previews[idx];
          if (!preview) {
            return (
              <button
                key={`empty-${idx}`}
                type="button"
                onClick={openPicker}
                className="relative aspect-[3/4] rounded-2xl border-2 border-dashed border-pink-200 bg-pink-50/50 text-sm font-semibold text-pink-500"
              >
                {idx < min ? `Add photo ${idx + 1} *` : `Photo slot ${idx + 1}`}
              </button>
            );
          }

          return (
            <div key={`photo-${idx}`} className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-pink-100 bg-slate-100">
              {brokenPreviews[idx] ? (
                <div className="flex h-full w-full items-center justify-center p-3 text-center text-sm font-semibold text-slate-600">
                  Preview unavailable. You can replace this photo.
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={preview}
                  alt={`Selected photo ${idx + 1}`}
                  className="h-full w-full object-cover"
                  onError={() => setBrokenPreviews((prev) => ({ ...prev, [idx]: true }))}
                />
              )}
              <button
                type="button"
                onClick={() => removeAt(idx)}
                className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-1 text-xs font-semibold text-white"
              >
                Remove
              </button>
              <div className="absolute left-2 top-2 flex gap-1">
                <button
                  type="button"
                  onClick={() => move(idx, -1)}
                  disabled={idx === 0}
                  className="rounded-full bg-black/65 px-2 py-1 text-xs font-semibold text-white disabled:opacity-40"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={() => move(idx, 1)}
                  disabled={idx === files.length - 1}
                  className="rounded-full bg-black/65 px-2 py-1 text-xs font-semibold text-white disabled:opacity-40"
                >
                  →
                </button>
                <button
                  type="button"
                  onClick={() => replaceAt(idx)}
                  className="rounded-full bg-black/65 px-2 py-1 text-xs font-semibold text-white"
                >
                  Replace
                </button>
              </div>
              <div className="absolute bottom-2 left-2 rounded-full bg-white/90 px-2 py-1 text-xs font-semibold text-slate-700">
                {idx + 1}
              </div>
            </div>
          );
        })}
      </div>

      <p className={`mt-3 text-sm ${files.length >= min ? "text-emerald-600" : "text-pink-700"}`}>
        {min > 0
          ? `Selected: ${files.length}/${max} ${files.length >= min ? "Minimum met." : `Please keep at least ${min}.`}`
          : `Selected: ${files.length}/${max}`}
      </p>
    </section>
  );
}
