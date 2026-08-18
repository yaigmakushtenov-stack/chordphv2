import "server-only";

import { BackblazeStorage } from "./backblaze/backblaze-storage";
import type { StorageProvider } from "./storage-provider";

export const storage: StorageProvider = new BackblazeStorage();

export type {
  CreateUploadInput,
  CreateUploadUrlForKeyInput,
  PutObjectInput,
  SignedUpload,
  StoredObjectMetadata,
  StorageFolder,
  StorageProvider,
} from "./storage-provider";
