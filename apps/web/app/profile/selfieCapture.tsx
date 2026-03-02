"use client";
import "@/lib/amplifyClient";
import { useEffect, useRef, useState } from "react";

export default function SelfieCapture({
  onCapture,
}: {
  onCapture: (file: File) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [err, setErr] = useState("");

  async function startCamera() {
    setErr("");
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        await videoRef.current.play();
      }
    } catch (e: any) {
      setErr(e?.message ?? "Camera permission denied");
    }
  }

  function stopCamera() {
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  function capture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const w = video.videoWidth || 640;
    const h = video.videoHeight || 480;

    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, w, h);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `selfie-${Date.now()}.jpg`, {
        type: "image/jpeg",
      });
      onCapture(file);
    }, "image/jpeg", 0.9);
  }

  useEffect(() => {
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontWeight: 700 }}>Selfie (Live capture)</div>

      {!stream ? (
        <button onClick={startCamera} style={{ padding: 10, marginTop: 8 }}>
          Start camera
        </button>
      ) : (
        <div style={{ marginTop: 8 }}>
          <video
            ref={videoRef}
            style={{ width: 320, borderRadius: 12, border: "1px solid #333" }}
            playsInline
            muted
          />
          <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
            <button onClick={capture} style={{ padding: 10 }}>
              Capture & upload
            </button>
            <button onClick={stopCamera} style={{ padding: 10 }}>
              Stop camera
            </button>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: "none" }} />

      {err && <p style={{ color: "tomato", marginTop: 8 }}>{err}</p>}
      <p style={{ opacity: 0.7, marginTop: 8 }}>
        This uses your camera and captures a new photo (not from gallery).
      </p>
    </div>
  );
}
