export const STORAGE_FOLDERS = ["images", "music"] as const;

export type StorageFolder = (typeof STORAGE_FOLDERS)[number];

export type CreateUploadInput = {
  ownerId: string;
  folder: StorageFolder;
  fileName: string;
  contentType: string;
  contentLength: number;
};

export type CreateUploadUrlForKeyInput = {
  key: string;
  contentType: string;
  contentLength: number;
};

export type SignedUpload = {
  key: string;
  uploadUrl: string;
  expiresIn: number;
  headers: Record<string, string>;
};

export type StoredObjectMetadata = {
  contentLength: number;
  contentType: string | undefined;
  etag: string | undefined;
  lastModified: Date | undefined;
  metadata: Record<string, string>;
};

export interface StorageProvider {
  createUploadUrl(input: CreateUploadInput): Promise<SignedUpload>;
  createUploadUrlForKey(
    input: CreateUploadUrlForKeyInput,
  ): Promise<SignedUpload>;
  getObjectMetadata(key: string): Promise<StoredObjectMetadata>;
  createDownloadUrl(key: string): Promise<string>;
  deleteObject(key: string): Promise<void>;
}

export function isStorageFolder(value: unknown): value is StorageFolder {
  return (
    typeof value === "string" &&
    (STORAGE_FOLDERS as readonly string[]).includes(value)
  );
}
