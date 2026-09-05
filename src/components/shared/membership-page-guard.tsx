import type { ReactNode } from "react";
import { notFound } from "next/navigation";

import type {
  GroupMembershipStatus,
  GroupRole,
} from "@/generated/prisma/client";
import {
  hasGroupPermission,
  type GroupPermission,
} from "@/lib/groups/permissions";

type GroupMembershipPageGuardProps = {
  children: ReactNode;
  membership:
    | {
        role: GroupRole;
        status: GroupMembershipStatus;
      }
    | null
    | undefined;
  roles?: readonly GroupRole[];
};

export function GroupMembershipPageGuard({
  children,
  membership,
  roles,
}: GroupMembershipPageGuardProps) {
  if (!membership || membership.status !== "ACCEPTED") {
    notFound();
  }

  if (roles && !roles.includes(membership.role)) {
    notFound();
  }

  return <>{children}</>;
}

type GroupPermissionPageGuardProps = {
  children: ReactNode;
  permission: GroupPermission;
  role: GroupRole | null | undefined;
};

export function GroupPermissionPageGuard({
  children,
  permission,
  role,
}: GroupPermissionPageGuardProps) {
  if (!hasGroupPermission(role, permission)) {
    notFound();
  }

  return <>{children}</>;
}
