import "server-only";

import { GroupRole, Prisma } from "@/generated/prisma/client";
import {
  hasGroupPermission,
  type GroupPermission,
} from "@/lib/groups/permissions";
import prisma from "@/lib/prisma";

const MAX_GROUP_NAME_LENGTH = 100;

const groupSelect = {
  id: true,
  name: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.GroupSelect;

const groupMembershipSelect = {
  role: true,
  group: {
    select: groupSelect,
  },
} satisfies Prisma.GroupMembershipSelect;

export type GroupRecord = Prisma.GroupGetPayload<{
  select: typeof groupSelect;
}>;

export type GroupMembershipRecord = Prisma.GroupMembershipGetPayload<{
  select: typeof groupMembershipSelect;
}>;

export type CreateGroupInput = {
  userId: string;
  name: string;
};

export type CreateGroupResult = GroupRecord & {
  role: GroupRole;
};

export class GroupServiceError extends Error {
  constructor(
    public readonly code: "INVALID_INPUT",
    message: string,
  ) {
    super(message);
    this.name = "GroupServiceError";
  }
}

export async function createGroup(
  input: CreateGroupInput,
): Promise<CreateGroupResult> {
  const userId = requireText(input.userId, "userId", 255);
  const name = requireText(input.name, "name", MAX_GROUP_NAME_LENGTH);

  const group = await prisma.group.create({
    data: {
      name,
      memberships: {
        create: {
          userId,
          role: GroupRole.OWNER,
        },
      },
    },
    select: groupSelect,
  });

  return {
    ...group,
    role: GroupRole.OWNER,
  };
}

export async function listGroupsForUser(
  userId: string,
): Promise<GroupMembershipRecord[]> {
  const normalizedUserId = requireText(userId, "userId", 255);

  return prisma.groupMembership.findMany({
    where: {
      userId: normalizedUserId,
    },
    orderBy: {
      createdAt: "asc",
    },
    select: groupMembershipSelect,
  });
}

export async function userHasGroupPermission(
  userId: string,
  groupId: string,
  permission: GroupPermission,
): Promise<boolean> {
  const normalizedUserId = requireText(userId, "userId", 255);
  const normalizedGroupId = requireText(groupId, "groupId", 255);
  const membership = await prisma.groupMembership.findUnique({
    where: {
      groupId_userId: {
        groupId: normalizedGroupId,
        userId: normalizedUserId,
      },
    },
    select: {
      role: true,
    },
  });

  return hasGroupPermission(membership?.role, permission);
}

function requireText(value: string, field: string, maxLength: number): string {
  if (typeof value !== "string") {
    throw new GroupServiceError("INVALID_INPUT", `${field} is required.`);
  }

  const normalizedValue = value.trim();

  if (!normalizedValue || normalizedValue.length > maxLength) {
    throw new GroupServiceError(
      "INVALID_INPUT",
      `${field} must be between 1 and ${maxLength} characters.`,
    );
  }

  return normalizedValue;
}
