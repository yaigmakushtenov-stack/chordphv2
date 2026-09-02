import {
  GroupRole,
  type GroupRole as GroupRoleValue,
} from "@/generated/prisma/enums";

export const GroupPermission = {
  VIEW_GROUP: "VIEW_GROUP",
  UPDATE_GROUP: "UPDATE_GROUP",
  DELETE_GROUP: "DELETE_GROUP",
  VIEW_MEMBERS: "VIEW_MEMBERS",
  INVITE_MEMBERS: "INVITE_MEMBERS",
  REMOVE_MEMBERS: "REMOVE_MEMBERS",
  UPDATE_MEMBER_ROLES: "UPDATE_MEMBER_ROLES",
  VIEW_CONTENT: "VIEW_CONTENT",
  CREATE_CONTENT: "CREATE_CONTENT",
  MANAGE_CONTENT: "MANAGE_CONTENT",
} as const;

export type GroupPermission =
  (typeof GroupPermission)[keyof typeof GroupPermission];

const ownerPermissions = Object.freeze([
  GroupPermission.VIEW_GROUP,
  GroupPermission.UPDATE_GROUP,
  GroupPermission.DELETE_GROUP,
  GroupPermission.VIEW_MEMBERS,
  GroupPermission.INVITE_MEMBERS,
  GroupPermission.REMOVE_MEMBERS,
  GroupPermission.UPDATE_MEMBER_ROLES,
  GroupPermission.VIEW_CONTENT,
  GroupPermission.CREATE_CONTENT,
  GroupPermission.MANAGE_CONTENT,
] satisfies readonly GroupPermission[]);

const moderatorPermissions = Object.freeze([
  GroupPermission.VIEW_GROUP,
  GroupPermission.VIEW_MEMBERS,
  GroupPermission.VIEW_CONTENT,
  GroupPermission.CREATE_CONTENT,
  GroupPermission.MANAGE_CONTENT,
] satisfies readonly GroupPermission[]);

const memberPermissions = Object.freeze([
  GroupPermission.VIEW_GROUP,
  GroupPermission.VIEW_MEMBERS,
  GroupPermission.VIEW_CONTENT,
  GroupPermission.CREATE_CONTENT,
] satisfies readonly GroupPermission[]);

export const GROUP_ROLE_PERMISSIONS: Readonly<
  Record<GroupRoleValue, readonly GroupPermission[]>
> = Object.freeze({
  [GroupRole.OWNER]: ownerPermissions,
  [GroupRole.MODERATOR]: moderatorPermissions,
  [GroupRole.MEMBER]: memberPermissions,
});

export function hasGroupPermission(
  role: GroupRoleValue | null | undefined,
  permission: GroupPermission,
): boolean {
  if (!role) {
    return false;
  }

  return GROUP_ROLE_PERMISSIONS[role].includes(permission);
}

export function getGroupPermissions(
  role: GroupRoleValue | null | undefined,
): readonly GroupPermission[] {
  if (!role) {
    return [];
  }

  return GROUP_ROLE_PERMISSIONS[role];
}
