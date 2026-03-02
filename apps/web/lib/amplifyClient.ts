import { generateClient } from "aws-amplify/data";

// ✅ IMPORTANT: adjust this import path based on your repo structure
// If your amplify folder is at repo root and Next app is apps/web,
// this usually works:
import type { Schema } from "../../../amplify/data/resource";

export const client = generateClient<Schema>();