import type { ReactNode } from "react";

import type {
  GroupMembershipStatus,
  GroupRole,
} from "@/generated/prisma/client";
import {
  hasGroupPermission,
  type GroupPermission,
} from "@/lib/groups/permissions";

type GroupMembershipGuardProps = {
  children: ReactNode;
  fallback?: ReactNode;
  membership:
    | {
        role: GroupRole;
        status: GroupMembershipStatus;
      }
    | null
    | undefined;
  roles?: readonly GroupRole[];
};

export function GroupMembershipGuard({
  children,
  fallback = null,
  membership,
  roles,
}: GroupMembershipGuardProps) {
  if (!membership || membership.status !== "ACCEPTED") {
    return <>{fallback}</>;
  }

  if (roles && !roles.includes(membership.role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

type GroupPermissionGuardProps = {
  children: ReactNode;
  fallback?: ReactNode;
  permission: GroupPermission;
  role: GroupRole | null | undefined;
};

export function GroupPermissionGuard({
  children,
  fallback = null,
  permission,
  role,
}: GroupPermissionGuardProps) {
  if (!hasGroupPermission(role, permission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
