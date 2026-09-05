import "server-only";

import {
  GroupInstrument,
  GroupMembershipStatus,
  GroupRole,
  Prisma,
} from "@/generated/prisma/client";
import {
  GroupPermission,
  hasGroupPermission,
  type GroupPermission as GroupPermissionValue,
} from "@/lib/groups/permissions";
import prisma from "@/lib/prisma";

const MAX_GROUP_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 320;

const groupSelect = {
  id: true,
  name: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.GroupSelect;

const groupMembershipSelect = {
  instrument: true,
  role: true,
  group: {
    select: groupSelect,
  },
} satisfies Prisma.GroupMembershipSelect;

const groupDetailSelect = {
  id: true,
  name: true,
  createdAt: true,
  updatedAt: true,
  memberships: {
    orderBy: [{ createdAt: "asc" as const }, { userId: "asc" as const }],
    select: {
      acceptedAt: true,
      createdAt: true,
      instrument: true,
      invitedAt: true,
      role: true,
      status: true,
      user: {
        select: {
          id: true,
          email: true,
          image: true,
          name: true,
        },
      },
    },
  },
  eventGroupSetLists: {
    orderBy: [{ createdAt: "desc" as const }, { id: "desc" as const }],
    select: {
      id: true,
      createdAt: true,
      event: {
        select: {
          id: true,
          title: true,
          startDate: true,
          place: true,
        },
      },
      eventSetList: {
        select: {
          id: true,
          orderNumber: true,
        },
      },
      setList: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  },
} satisfies Prisma.GroupSelect;

export type GroupRecord = Prisma.GroupGetPayload<{
  select: typeof groupSelect;
}>;

export type GroupMembershipRecord = Prisma.GroupMembershipGetPayload<{
  select: typeof groupMembershipSelect;
}>;

export type GroupDetailRecord = Prisma.GroupGetPayload<{
  select: typeof groupDetailSelect;
}>;

export type CreateGroupInput = {
  userId: string;
  name: string;
};

export type CreateGroupResult = GroupRecord & {
  role: GroupRole;
};

export type AddGroupMemberInput = {
  email: string;
  groupId: string;
  instrument?: GroupInstrument | string | null;
  invitedById: string;
};

export class GroupServiceError extends Error {
  constructor(
    public readonly code:
      | "CONFLICT"
      | "FORBIDDEN"
      | "INVALID_INPUT"
      | "NOT_FOUND",
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
      createdById: userId,
      name,
      memberships: {
        create: {
          userId,
          instrument: null,
          role: GroupRole.OWNER,
          status: GroupMembershipStatus.ACCEPTED,
          invitedById: userId,
          acceptedAt: new Date(),
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

export async function getGroupDetailForUser(
  userId: string,
  groupId: string,
): Promise<GroupDetailRecord | null> {
  const normalizedUserId = requireText(userId, "userId", 255);
  const normalizedGroupId = requireText(groupId, "groupId", 255);

  return prisma.group.findFirst({
    where: {
      id: normalizedGroupId,
      memberships: {
        some: {
          userId: normalizedUserId,
          status: GroupMembershipStatus.ACCEPTED,
        },
      },
    },
    select: groupDetailSelect,
  });
}

export async function addGroupMember(input: AddGroupMemberInput): Promise<void> {
  const groupId = requireText(input.groupId, "groupId", 255);
  const invitedById = requireText(input.invitedById, "invitedById", 255);
  const email = requireEmail(input.email);
  const instrument = optionalInstrument(input.instrument);

  await prisma.$transaction(async (transaction) => {
    const inviterMembership = await transaction.groupMembership.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId: invitedById,
        },
      },
      select: {
        role: true,
        status: true,
      },
    });

    if (
      !inviterMembership ||
      inviterMembership.status !== GroupMembershipStatus.ACCEPTED
    ) {
      throw new GroupServiceError(
        "FORBIDDEN",
        "You do not have access to this band.",
      );
    }

    if (
      !hasGroupPermission(inviterMembership.role, GroupPermission.INVITE_MEMBERS)
    ) {
      throw new GroupServiceError(
        "FORBIDDEN",
        "You cannot add members to this band.",
      );
    }

    const user = await transaction.betterAuthUser.findUnique({
      where: { email },
      select: { id: true },
    });

    if (!user) {
      throw new GroupServiceError(
        "NOT_FOUND",
        "No ChordPH user was found for that email address.",
      );
    }

    const existingMembership = await transaction.groupMembership.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId: user.id,
        },
      },
      select: { userId: true },
    });

    if (existingMembership) {
      throw new GroupServiceError(
        "CONFLICT",
        "That user is already a member of this band.",
      );
    }

    await transaction.groupMembership.create({
      data: {
        acceptedAt: new Date(),
        groupId,
        instrument,
        invitedById,
        role: GroupRole.MEMBER,
        status: GroupMembershipStatus.ACCEPTED,
        userId: user.id,
      },
    });
  });
}

export async function userHasGroupPermission(
  userId: string,
  groupId: string,
  permission: GroupPermissionValue,
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

function requireEmail(value: string): string {
  const email = requireText(value, "email", MAX_EMAIL_LENGTH).toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new GroupServiceError(
      "INVALID_INPUT",
      "Enter a valid email address.",
    );
  }

  return email;
}

function optionalInstrument(
  value: GroupInstrument | string | null | undefined,
): GroupInstrument | null {
  if (value == null) {
    return null;
  }

  if (typeof value !== "string") {
    throw new GroupServiceError("INVALID_INPUT", "instrument is invalid.");
  }

  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return null;
  }

  if (!isGroupInstrument(normalizedValue)) {
    throw new GroupServiceError("INVALID_INPUT", "instrument is invalid.");
  }

  return normalizedValue;
}

function isGroupInstrument(value: string): value is GroupInstrument {
  return Object.values(GroupInstrument).includes(value as GroupInstrument);
}

export const GroupService = {
  addGroupMember,
  createGroup,
  getGroupDetailForUser,
  listGroupsForUser,
};
