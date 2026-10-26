function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

export const env = {
  databaseUrl: required("DATABASE_URL", "file:./dev.db"),
  authSecret: required("AUTH_SECRET", "dev-only-change-me-album-saas-32chars!!"),
  appUrl: required("APP_URL", "http://localhost:3010"),
  storageRoot: required("STORAGE_ROOT", "./data"),
  storageSignedSecret: required(
    "STORAGE_SIGNED_SECRET",
    "dev-storage-signed-secret-change"
  ),
  faceAiProvider: (process.env.FACE_AI_PROVIDER || "none") as
    | "none"
    | "rekognition"
    | "local_dev",
  faceAiEnabledGlobally: process.env.FACE_AI_ENABLED_GLOBALLY === "true",
  paymentProvider: process.env.PAYMENT_PROVIDER || "none",
  invistimoIntegrationEnabled:
    process.env.INVISTIMO_INTEGRATION_ENABLED === "true",
  awsRegion: process.env.AWS_REGION || "",
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  rekognitionPrefix: process.env.REKOGNITION_COLLECTION_PREFIX || "album-dev",
};
