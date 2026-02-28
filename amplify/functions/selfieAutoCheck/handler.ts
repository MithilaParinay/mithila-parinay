import { RekognitionClient, DetectFacesCommand } from "@aws-sdk/client-rekognition";
import { SignatureV4 } from "@aws-sdk/signature-v4";
import { HttpRequest } from "@aws-sdk/protocol-http";
import { Sha256 } from "@aws-crypto/sha256-js";

const rekognition = new RekognitionClient({});

function parseAppSyncUrl(appsyncUrl: string) {
  const u = new URL(appsyncUrl);
  return {
    hostname: u.hostname,
    path: u.pathname,
    protocol: u.protocol,
  };
}

async function signedAppSyncRequest(params: {
  appsyncUrl: string;
  region: string;
  body: any;
}) {
  const { appsyncUrl, region, body } = params;
  const { hostname, path } = parseAppSyncUrl(appsyncUrl);

  const signer = new SignatureV4({
    service: "appsync",
    region,
    sha256: Sha256,
    // credentials are automatically provided in Lambda
    credentials: undefined as any,
  });

  const request = new HttpRequest({
    protocol: "https:",
    hostname,
    method: "POST",
    path,
    headers: {
      "content-type": "application/json",
      host: hostname,
    },
    body: JSON.stringify(body),
  });

  const signed = await signer.sign(request);

  const res = await fetch(appsyncUrl, {
    method: signed.method,
    headers: signed.headers as any,
    body: signed.body as any,
  });

  const json = await res.json();
  return { status: res.status, json };
}

export const handler = async (event: any) => {
  try {
    const record = event?.Records?.[0];
    const bucket = record?.s3?.bucket?.name;
    const rawKey = record?.s3?.object?.key;

    if (!bucket || !rawKey) return { ok: false, reason: "Missing S3 bucket/key" };

    const key = decodeURIComponent(rawKey.replace(/\+/g, " "));

    // Only process selfie objects
    if (!key.startsWith("private/verification/")) return { ok: true, skipped: true };
    if (!key.includes("/selfie-")) return { ok: true, skipped: true };

    // Expected: private/verification/{profileId}/{vrId}/selfie-xxx.jpg
    const parts = key.split("/");
    const profileId = parts?.[2];
    const vrId = parts?.[3];

    if (!profileId || !vrId) {
      return { ok: false, reason: "Could not parse profileId/vrId", key };
    }

    const out = await rekognition.send(
      new DetectFacesCommand({
        Image: { S3Object: { Bucket: bucket, Name: key } },
        Attributes: ["DEFAULT"],
      })
    );

    const faces = out.FaceDetails ?? [];
    const faceCount = faces.length;

    let selfieCheckStatus: "PASS" | "FAIL" = "PASS";
    let selfieCheckReason = "Face detected";

    // MVP rule: exactly 1 face
    if (faceCount === 0) {
      selfieCheckStatus = "FAIL";
      selfieCheckReason = "No face detected. Please retake a clear selfie.";
    } else if (faceCount > 1) {
      selfieCheckStatus = "FAIL";
      selfieCheckReason = "Multiple faces detected. Please upload only your selfie.";
    }

    const appsyncUrl = process.env.APPSYNC_URL!;
    const region = process.env.AWS_REGION!;

    const mutation = /* GraphQL */ `
      mutation UpdateVerificationRequest($input: UpdateVerificationRequestInput!) {
        updateVerificationRequest(input: $input) {
          id
          status
          selfieCheckStatus
          selfieCheckReason
          reviewNotes
        }
      }
    `;

    const input: any = {
      id: vrId,
      selfieCheckStatus,
      selfieCheckReason,
    };

    if (selfieCheckStatus === "FAIL") {
      input.status = "NEEDS_MORE_INFO";
      input.reviewNotes = `Selfie check failed: ${selfieCheckReason}`;
    } else {
      input.reviewNotes = `Selfie check passed: ${selfieCheckReason}`;
    }

    const { status, json } = await signedAppSyncRequest({
      appsyncUrl,
      region,
      body: { query: mutation, variables: { input } },
    });

    return {
      ok: true,
      bucket,
      key,
      profileId,
      vrId,
      faceCount,
      selfieCheckStatus,
      selfieCheckReason,
      appsyncHttpStatus: status,
      appsyncResponse: json,
    };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? String(e) };
  }
};