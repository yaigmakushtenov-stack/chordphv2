"use server";

import "server-only";

import { headers } from "next/headers";

import type { GroupRole } from "@/generated/prisma/client";
import {
  actionFailure,
  actionSuccess,
  type ActionResult,
} from "@/lib/actions";
import { auth } from "@/lib/auth";
import { createGroup, GroupServiceError } from "@/lib/groups";

export type CreateGroupActionInput = {
  name: string;
};

export type GroupActionData = {
  id: string;
  name: string;
  role: GroupRole;
  createdAt: string;
  updatedAt: string;
};

export async function createGroupAction(
  input: CreateGroupActionInput,
): Promise<ActionResult<GroupActionData>> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return actionFailure("UNAUTHENTICATED", "Sign in to create a group.");
  }

  if (!isRecord(input) || typeof input.name !== "string") {
    return actionFailure("VALIDATION_ERROR", "The group name is invalid.", {
      fieldErrors: {
        name: ["Enter a group name."],
      },
    });
  }

  try {
    const group = await createGroup({
      userId: session.user.id,
      name: input.name,
    });

    return actionSuccess({
      id: group.id,
      name: group.name,
      role: group.role,
      createdAt: group.createdAt.toISOString(),
      updatedAt: group.updatedAt.toISOString(),
    });
  } catch (error: unknown) {
    if (!(error instanceof GroupServiceError)) {
      throw error;
    }

    return actionFailure("VALIDATION_ERROR", "The group name is invalid.", {
      fieldErrors: {
        name: [error.message],
      },
    });
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
