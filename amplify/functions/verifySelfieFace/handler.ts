import { RekognitionClient, DetectFacesCommand } from "@aws-sdk/client-rekognition";

type Payload = {
  bucket: string;
  key: string; // e.g. private/verification/<profileId>/<vrId>/selfie-xxx.jpg
};

export const handler = async (event: any) => {
  const payload: Payload = event?.arguments ?? event?.payload ?? event;

  const bucket = payload?.bucket;
  const key = payload?.key;

  if (!bucket || !key) {
    return { ok: false, reason: "Missing bucket or key" };
  }

  // basic guardrail
  if (!key.startsWith("private/verification/")) {
    return { ok: false, reason: "Invalid key path" };
  }

  const rekognition = new RekognitionClient({});

  const out = await rekognition.send(
    new DetectFacesCommand({
      Image: { S3Object: { Bucket: bucket, Name: key } },
      Attributes: ["DEFAULT"],
    })
  );

  const faces = out.FaceDetails ?? [];
  const faceCount = faces.length;

  // Optional stricter rules:
  // - exactly 1 face
  // - good confidence
  const ok = faceCount === 1;

  if (!ok) {
    return {
      ok: false,
      faceCount,
      reason:
        faceCount === 0
          ? "No face detected. Please retake a clear selfie."
          : "Multiple faces detected. Please upload only your selfie.",
    };
  }

  const confidence = faces[0]?.Confidence ?? 0;

  return {
    ok: true,
    faceCount,
    confidence,
    reason: "Face detected",
  };
};