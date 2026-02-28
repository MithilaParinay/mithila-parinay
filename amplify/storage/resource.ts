import { defineStorage } from "@aws-amplify/backend";

export const storage = defineStorage({
  name: "mpstorage",
  access: (allow) => ({
    "users/{entity_id}/*": [
      allow.authenticated.to(["read", "write", "delete"]),
    ],
  }),
});

