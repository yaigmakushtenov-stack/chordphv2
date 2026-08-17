export const STORAGE_FOLDERS = ["images", "music"] as const;

export type StorageFolder = (typeof STORAGE_FOLDERS)[number];

export type CreateUploadInput = {
  ownerId: string;
  folder: StorageFolder;
  fileName: string;
  contentType: string;
  contentLength: number;
};

export type SignedUpload = {
  key: string;
  uploadUrl: string;
  expiresIn: number;
  headers: Record<string, string>;
};

export interface StorageProvider {
  createUploadUrl(input: CreateUploadInput): Promise<SignedUpload>;
  createDownloadUrl(key: string): Promise<string>;
  deleteObject(key: string): Promise<void>;
}

export function isStorageFolder(value: unknown): value is StorageFolder {
  return (
    typeof value === "string" &&
    (STORAGE_FOLDERS as readonly string[]).includes(value)
  );
}
