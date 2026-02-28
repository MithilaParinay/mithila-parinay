import { defineFunction } from "@aws-amplify/backend";

export const verifySelfieFace = defineFunction({
  name: "verifySelfieFace",
  entry: "./handler.ts",
  timeoutSeconds: 20,
});