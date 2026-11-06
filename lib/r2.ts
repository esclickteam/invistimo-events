import { S3Client } from "@aws-sdk/client-s3";

function requiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

let bucketName: string | null = null;
let client: S3Client | null = null;

export function getR2BucketName() {
  if (!bucketName) bucketName = requiredEnv("R2_BUCKET_NAME");
  return bucketName;
}

export function getR2Client() {
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: requiredEnv("R2_ENDPOINT"),
      credentials: {
        accessKeyId: requiredEnv("R2_ACCESS_KEY_ID"),
        secretAccessKey: requiredEnv("R2_SECRET_ACCESS_KEY"),
      },
    });
  }

  return client;
}
