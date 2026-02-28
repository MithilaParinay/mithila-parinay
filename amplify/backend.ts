import { defineBackend } from "@aws-amplify/backend";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3n from "aws-cdk-lib/aws-s3-notifications";

import { auth } from "./auth/resource";
import { data } from "./data/resource";
import { storage } from "./storage/resource";
import { selfieAutoCheck } from "./functions/selfieAutoCheck/resource";

const backend = defineBackend({
  auth,
  data,
  storage,
  selfieAutoCheck,
});

// Rekognition permission
backend.selfieAutoCheck.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: ["rekognition:DetectFaces"],
    resources: ["*"],
  })
);

// Allow Lambda to read from S3 bucket
backend.storage.resources.bucket.grantRead(backend.selfieAutoCheck.resources.lambda);

// Allow Lambda to call AppSync
backend.selfieAutoCheck.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: ["appsync:GraphQL"],
    resources: ["*"],
  })
);

// ✅ Add AppSync URL env (cast to avoid TS type mismatch)
(backend.selfieAutoCheck.resources.lambda as any).addEnvironment(
  "APPSYNC_URL",
  (backend.data.resources.graphqlApi as any).graphqlUrl ?? (backend.data.resources.graphqlApi as any).attrGraphQlUrl
);

// 5) S3 trigger on uploads to private/verification/
// backend.storage.resources.bucket.addEventNotification(
//   s3.EventType.OBJECT_CREATED_PUT,
//   new s3n.LambdaDestination(backend.selfieAutoCheck.resources.lambda),
//   { prefix: "private/verification/" }
// );