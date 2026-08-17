import type { StorageFolder } from "./storage-provider";

type StorageRule = {
  allowedContentTypes: ReadonlySet<string>;
  maxBytes: number;
};

export const STORAGE_RULES: Record<StorageFolder, StorageRule> = {
  images: {
    allowedContentTypes: new Set([
      "image/gif",
      "image/jpeg",
      "image/png",
      "image/webp",
    ]),
    maxBytes: 10 * 1024 * 1024,
  },
  music: {
    allowedContentTypes: new Set([
      "audio/flac",
      "audio/mp4",
      "audio/mpeg",
      "audio/ogg",
      "audio/wav",
    ]),
    maxBytes: 50 * 1024 * 1024,
  },
};
