import "server-only";

import { CloudflareR2Storage } from "./cloudflare-r2/cloudflare-r2-storage";
import type { StorageProvider } from "./storage-provider";

export const storage: StorageProvider = new CloudflareR2Storage();

export type {
  CreateUploadInput,
  CreateUploadUrlForKeyInput,
  PutObjectInput,
  SignedUpload,
  StoredObjectMetadata,
  StorageFolder,
  StorageProvider,
} from "./storage-provider";
