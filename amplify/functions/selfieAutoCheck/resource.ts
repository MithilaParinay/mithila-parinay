import { defineFunction } from "@aws-amplify/backend";

export const selfieAutoCheck = defineFunction({
  name: "selfieAutoCheck",
  entry: "./handler.ts",
  timeoutSeconds: 30,
});