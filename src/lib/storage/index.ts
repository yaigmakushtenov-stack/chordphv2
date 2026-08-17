import "server-only";

import { BackblazeStorage } from "./backblaze/backblaze-storage";
import type { StorageProvider } from "./storage-provider";

export const storage: StorageProvider = new BackblazeStorage();

export type {
  CreateUploadInput,
  SignedUpload,
  StorageFolder,
  StorageProvider,
} from "./storage-provider";
