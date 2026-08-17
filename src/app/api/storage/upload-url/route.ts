import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { storage } from "@/lib/storage";
import { isStorageFolder } from "@/lib/storage/storage-provider";
import { STORAGE_RULES } from "@/lib/storage/storage-rules";

type UploadRequest = {
  folder?: unknown;
  fileName?: unknown;
  contentType?: unknown;
  size?: unknown;
};

export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: UploadRequest;

  try {
    body = (await request.json()) as UploadRequest;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isStorageFolder(body.folder)) {
    return Response.json({ error: "Invalid storage folder" }, { status: 400 });
  }

  if (typeof body.fileName !== "string" || body.fileName.length > 255) {
    return Response.json({ error: "Invalid file name" }, { status: 400 });
  }

  const rule = STORAGE_RULES[body.folder];

  if (
    typeof body.contentType !== "string" ||
    !rule.allowedContentTypes.has(body.contentType)
  ) {
    return Response.json({ error: "Unsupported file type" }, { status: 415 });
  }

  if (
    typeof body.size !== "number" ||
    !Number.isSafeInteger(body.size) ||
    body.size < 1 ||
    body.size > rule.maxBytes
  ) {
    return Response.json(
      { error: `File size must be between 1 byte and ${rule.maxBytes} bytes` },
      { status: 400 },
    );
  }

  try {
    const signedUpload = await storage.createUploadUrl({
      ownerId: session.user.id,
      folder: body.folder,
      fileName: body.fileName,
      contentType: body.contentType,
      contentLength: body.size,
    });

    return Response.json(signedUpload);
  } catch (error) {
    console.error("Failed to create a storage upload URL", error);

    return Response.json(
      { error: "Storage is not configured" },
      { status: 503 },
    );
  }
}
