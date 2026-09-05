"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { GroupInstrument, type GroupRole } from "@/generated/prisma/client";
import {
  actionFailure,
  actionSuccess,
  type ActionResult,
} from "@/lib/actions";
import { auth } from "@/lib/auth";
import { GroupService, GroupServiceError } from "@/services/group-service";

export type CreateGroupActionInput = {
  name: string;
};

export type AddGroupMemberActionInput = {
  email: string;
  groupId: string;
  instrument: string;
};

export type GroupActionData = {
  id: string;
  name: string;
  role: GroupRole;
  createdAt: string;
  updatedAt: string;
};

export async function create(
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
    const group = await GroupService.createGroup({
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

export async function addMember(
  input: AddGroupMemberActionInput,
): Promise<ActionResult<null>> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return actionFailure("UNAUTHENTICATED", "Sign in to add a band member.");
  }

  if (
    !isRecord(input) ||
    typeof input.groupId !== "string" ||
    typeof input.email !== "string" ||
    !isOptionalGroupInstrument(input.instrument)
  ) {
    return actionFailure("VALIDATION_ERROR", "The member details are invalid.");
  }

  try {
    await GroupService.addGroupMember({
      email: input.email,
      groupId: input.groupId,
      instrument: input.instrument,
      invitedById: session.user.id,
    });
    revalidatePath(`/bands/${input.groupId}`);

    return actionSuccess(null);
  } catch (error: unknown) {
    if (!(error instanceof GroupServiceError)) {
      throw error;
    }

    if (error.code === "FORBIDDEN") {
      return actionFailure("FORBIDDEN", error.message);
    }

    if (error.code === "NOT_FOUND") {
      return actionFailure("NOT_FOUND", error.message, {
        fieldErrors: {
          email: [error.message],
        },
      });
    }

    if (error.code === "CONFLICT") {
      return actionFailure("CONFLICT", error.message, {
        fieldErrors: {
          email: [error.message],
        },
      });
    }

    return actionFailure("VALIDATION_ERROR", "The member details are invalid.", {
      fieldErrors: {
        email: input.email.trim() ? [] : ["Enter an email address."],
        instrument: isOptionalGroupInstrument(input.instrument)
          ? []
          : ["Choose an instrument."],
      },
    });
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isOptionalGroupInstrument(
  value: unknown,
): value is GroupInstrument | "" {
  return (
    value === "" ||
    (typeof value === "string" &&
      Object.values(GroupInstrument).includes(value as GroupInstrument))
  );
}
