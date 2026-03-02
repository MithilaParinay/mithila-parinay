"use client";

import { useMemo, useRef, useState } from "react";
import { uploadData, remove } from "aws-amplify/storage";
import { v4 as uuidv4 } from "uuid";

type Props = {
  userId: string;
  photoKeys: string[];
  onChange: (nextKeys: string[]) => Promise<void> | void; // save to Profile
  max?: number; // 9
  min?: number; // 3
};

export default function PhotoGridUploader({
  userId,
  photoKeys,
  onChange,
  max = 9,
  min = 3,
}: Props) {
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const canAddMore = photoKeys.length < max;

  const requiredStatus = useMemo(() => {
    if (photoKeys.length >= min) return { ok: true, text: `Minimum ${min} photos met.` };
    return { ok: false, text: `At least ${min} photos are required.` };
  }, [photoKeys.length, min]);

  async function handleAdd(files: FileList | null) {
    if (!files || files.length === 0) return;

    const remaining = max - photoKeys.length;
    const selected = Array.from(files).slice(0, remaining);

    setBusy(true);
    try {
      const uploadedKeys: string[] = [];

      for (const file of selected) {
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const key = `users/${userId}/photos/${uuidv4()}.${ext}`;

        await uploadData({
          path: key,
          data: file,
          options: { contentType: file.type },
        }).result;

        uploadedKeys.push(key);
      }

      const next = [...photoKeys, ...uploadedKeys];
      await onChange(next);
      if (inputRef.current) inputRef.current.value = "";
    } finally {
      setBusy(false);
    }
  }

  async function handleReplace(index: number, file: File | null) {
    if (!file) return;
    setBusy(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const key = `users/${userId}/photos/${uuidv4()}.${ext}`;

      await uploadData({
        path: key,
        data: file,
        options: { contentType: file.type },
      }).result;

      const oldKey = photoKeys[index];
      const next = [...photoKeys];
      next[index] = key;

      await onChange(next);

      // optional: remove old file
      if (oldKey) await remove({ path: oldKey });
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(index: number) {
    const key = photoKeys[index];
    if (!key) return;

    setBusy(true);
    try {
      const next = photoKeys.filter((_, i) => i !== index);
      await onChange(next);
      await remove({ path: key });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-3xl border border-pink-100 bg-white/70 p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Profile photos</h2>
          <p className="mt-1 text-sm text-slate-600">
            Upload up to <span className="font-semibold">{max}</span> photos.{" "}
            <span className={requiredStatus.ok ? "text-emerald-600" : "text-rose-600"}>
              {requiredStatus.text}
            </span>
          </p>
        </div>

        <button
          disabled={!canAddMore || busy}
          onClick={() => inputRef.current?.click()}
          className="rounded-full bg-gradient-to-r from-pink-600 to-orange-500 px-4 py-2 text-sm font-semibold text-white shadow disabled:opacity-50"
        >
          {busy ? "Uploading..." : "Add photos"}
        </button>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleAdd(e.target.files)}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: max }).map((_, i) => {
          const key = photoKeys[i];

          if (!key) {
            return (
              <div
                key={i}
                className="group flex min-h-[260px] cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-pink-200 bg-pink-50/40 text-pink-400 hover:bg-pink-50"
                onClick={() => canAddMore && inputRef.current?.click()}
              >
                <div className="text-lg font-semibold">Add photo</div>
                <div className="mt-1 text-sm">Photo {i + 1}{i < min ? " *" : ""}</div>
              </div>
            );
          }

          // NOTE: You’ll need a helper to convert storage key -> URL (getUrl)
          return (
            <PhotoCard
              key={key}
              index={i}
              storageKey={key}
              required={i < min}
              busy={busy}
              onDelete={() => handleDelete(i)}
              onReplace={(file) => handleReplace(i, file)}
            />
          );
        })}
      </div>
    </div>
  );
}

function PhotoCard({
  index,
  storageKey,
  required,
  busy,
  onReplace,
  onDelete,
}: {
  index: number;
  storageKey: string;
  required: boolean;
  busy: boolean;
  onReplace: (file: File | null) => void;
  onDelete: () => void;
}) {
  const replaceRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="rounded-3xl border border-pink-100 bg-white p-4 shadow-sm">
      <div className="relative overflow-hidden rounded-2xl bg-slate-100">
        {/* Replace this <img> src with getUrl(storageKey) */}
        <img
          src={`/api/storage-image?key=${encodeURIComponent(storageKey)}`}
          alt={`Photo ${index + 1}`}
          className="h-[220px] w-full object-cover"
        />
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="text-sm text-slate-700">
          Photo {index + 1} {required ? <span className="text-rose-600">*</span> : null}
        </div>

        <div className="flex items-center gap-3">
          <button
            disabled={busy}
            className="text-sm font-semibold text-rose-600 hover:underline disabled:opacity-50"
            onClick={() => replaceRef.current?.click()}
          >
            Replace
          </button>
          <button
            disabled={busy}
            className="text-sm font-semibold text-slate-600 hover:underline disabled:opacity-50"
            onClick={onDelete}
          >
            Delete
          </button>
          <input
            ref={replaceRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onReplace(e.target.files?.[0] ?? null)}
          />
        </div>
      </div>
    </div>
  );
}