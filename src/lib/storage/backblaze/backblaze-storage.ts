import "server-only";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import type {
  CreateUploadInput,
  CreateUploadUrlForKeyInput,
  SignedUpload,
  StoredObjectMetadata,
  StorageProvider,
} from "../storage-provider";

const ROOT_PREFIX = "chordph";
const PRESIGNED_URL_TTL_SECONDS = 5 * 60;

type BackblazeConfig = {
  endpoint: string;
  region: string;
  bucket: string;
  keyId: string;
  applicationKey: string;
};

export class BackblazeStorage implements StorageProvider {
  private client: S3Client | undefined;
  private config: BackblazeConfig | undefined;

  async createUploadUrl(input: CreateUploadInput): Promise<SignedUpload> {
    const key = this.createObjectKey(input);

    return this.createUploadUrlForKey({
      key,
      contentType: input.contentType,
      contentLength: input.contentLength,
    });
  }

  async createUploadUrlForKey(
    input: CreateUploadUrlForKeyInput,
  ): Promise<SignedUpload> {
    this.assertManagedKey(input.key);

    const config = this.getConfig();
    const command = new PutObjectCommand({
      Bucket: config.bucket,
      Key: input.key,
      ContentType: input.contentType,
      ContentLength: input.contentLength,
    });
    const uploadUrl = await getSignedUrl(this.getClient(), command, {
      expiresIn: PRESIGNED_URL_TTL_SECONDS,
    });

    return {
      key: input.key,
      uploadUrl,
      expiresIn: PRESIGNED_URL_TTL_SECONDS,
      headers: {
        "Content-Type": input.contentType,
      },
    };
  }

  async getObjectMetadata(key: string): Promise<StoredObjectMetadata> {
    this.assertManagedKey(key);

    const config = this.getConfig();
    const result = await this.getClient().send(
      new HeadObjectCommand({
        Bucket: config.bucket,
        Key: key,
      }),
    );

    if (
      typeof result.ContentLength !== "number" ||
      !Number.isSafeInteger(result.ContentLength) ||
      result.ContentLength < 0
    ) {
      throw new Error("Backblaze returned an invalid object size.");
    }

    return {
      contentLength: result.ContentLength,
      contentType: result.ContentType,
      etag: result.ETag,
      lastModified: result.LastModified,
      metadata: result.Metadata ?? {},
    };
  }

  async createDownloadUrl(key: string) {
    this.assertManagedKey(key);
    const config = this.getConfig();
    const command = new GetObjectCommand({
      Bucket: config.bucket,
      Key: key,
    });

    return getSignedUrl(this.getClient(), command, {
      expiresIn: PRESIGNED_URL_TTL_SECONDS,
    });
  }

  async deleteObject(key: string) {
    this.assertManagedKey(key);
    const config = this.getConfig();

    await this.getClient().send(
      new DeleteObjectCommand({
        Bucket: config.bucket,
        Key: key,
      }),
    );
  }

  private getClient() {
    if (this.client) {
      return this.client;
    }

    const config = this.getConfig();
    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.keyId,
        secretAccessKey: config.applicationKey,
      },
    });

    return this.client;
  }

  private getConfig() {
    if (this.config) {
      return this.config;
    }

    const endpoint = this.requireEnvironmentVariable("B2_ENDPOINT");
    const endpointUrl = new URL(endpoint);

    if (endpointUrl.protocol !== "https:") {
      throw new Error("B2_ENDPOINT must use HTTPS.");
    }

    this.config = {
      endpoint: endpointUrl.origin,
      region: this.requireEnvironmentVariable("B2_REGION"),
      bucket: this.requireEnvironmentVariable("B2_BUCKET"),
      keyId: this.requireEnvironmentVariable("B2_KEY_ID"),
      applicationKey: this.requireEnvironmentVariable("B2_APPLICATION_KEY"),
    };

    return this.config;
  }

  private createObjectKey(input: CreateUploadInput) {
    const ownerId = input.ownerId.replace(/[^a-zA-Z0-9_-]/g, "");
    const originalName = input.fileName.trim().split(/[\\/]/).pop() ?? "";
    const safeName = originalName
      .normalize("NFKD")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^[.-]+|[.-]+$/g, "")
      .slice(0, 120);

    if (!ownerId || !safeName) {
      throw new Error("The owner or file name is invalid.");
    }

    return `${ROOT_PREFIX}/${input.folder}/${ownerId}/${crypto.randomUUID()}-${safeName}`;
  }

  private assertManagedKey(key: string) {
    if (!key.startsWith(`${ROOT_PREFIX}/`)) {
      throw new Error("Refusing to access an unmanaged storage key.");
    }
  }

  private requireEnvironmentVariable(name: string) {
    const value = process.env[name]?.trim();

    if (!value) {
      throw new Error(`Missing required environment variable: ${name}`);
    }

    return value;
  }
}
