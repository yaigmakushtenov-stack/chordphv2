"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";

import * as GroupActions from "@/actions/group-actions";
import type {
  GroupInstrument,
  GroupMembershipStatus,
  GroupRole,
} from "@/generated/prisma/client";
import {
  formatGroupInstrument,
  InstrumentSelector,
} from "@/app/bands/_components/instrument-selector";
import { GroupPermissionGuard } from "@/components/shared/membership-guard";
import { showToast } from "@/components/shared/toast";
import { GroupPermission } from "@/lib/groups/permissions";

export type BandDetailData = {
  currentUserRole: GroupRole | null;
  events: {
    eventId: string;
    eventSetListId: string;
    id: string;
    place: string;
    setListId: string;
    setListTitle: string;
    startDate: string;
    title: string;
  }[];
  id: string;
  members: {
    email: string;
    id: string;
    image: string | null;
    instrument: GroupInstrument | null;
    name: string;
    role: GroupRole;
    status: GroupMembershipStatus;
  }[];
  name: string;
};

type BandDetailProps = {
  band: BandDetailData;
};

export function BandDetail({ band }: BandDetailProps) {
  return (
    <div className="grid gap-8">
      <section className="grid gap-4" aria-label="Band members">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-[15px] font-bold">Members</h2>
            <p className="mt-1 text-[12px] text-[#717171] dark:text-[#a1a1aa]">
              {band.members.length}{" "}
              {band.members.length === 1 ? "member" : "members"}
            </p>
          </div>
          <GroupPermissionGuard
            permission={GroupPermission.INVITE_MEMBERS}
            role={band.currentUserRole}
          >
            <AddMemberForm groupId={band.id} />
          </GroupPermissionGuard>
        </div>

        <div className="divide-y divide-[#e9e9e9] border-y border-[#e9e9e9] dark:divide-[#303034] dark:border-[#303034]">
          {band.members.map((member) => (
            <div
              key={member.id}
              className="grid gap-3 px-2 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <MemberAvatar image={member.image} name={member.name} />
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-bold">
                    {member.name}
                  </span>
                  <span className="mt-1 block truncate text-[12px] text-[#666] dark:text-[#b4b4bc]">
                    {member.email}
                  </span>
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <span className="rounded-full bg-[#f1f1f1] px-3 py-1.5 text-[11px] font-bold dark:bg-[#28282c]">
                  {member.instrument
                    ? formatGroupInstrument(member.instrument)
                    : "No instrument"}
                </span>
                <span className="rounded-full bg-[#f1f1f1] px-3 py-1.5 text-[11px] font-bold dark:bg-[#28282c]">
                  {formatRole(member.role)}
                </span>
                {member.status !== "ACCEPTED" ? (
                  <span className="rounded-full border border-[#ed1746]/30 px-3 py-1.5 text-[11px] font-bold text-[#ed1746]">
                    Pending
                  </span>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4" aria-label="Band events">
        <div>
          <h2 className="text-[15px] font-bold">Events</h2>
          <p className="mt-1 text-[12px] text-[#717171] dark:text-[#a1a1aa]">
            {band.events.length}{" "}
            {band.events.length === 1 ? "event setlist" : "event setlists"}
          </p>
        </div>

        {band.events.length ? (
          <div className="divide-y divide-[#e9e9e9] border-y border-[#e9e9e9] dark:divide-[#303034] dark:border-[#303034]">
            {band.events.map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.eventId}`}
                className="grid gap-2 px-2 py-4 transition hover:bg-[#f7f7f7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-3 dark:hover:bg-[#202023]"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-bold">
                    {event.title}
                  </span>
                  <span className="mt-1 block truncate text-[12px] text-[#666] dark:text-[#b4b4bc]">
                    {event.setListTitle} · {event.place}
                  </span>
                </span>
                <span className="text-[12px] font-bold text-[#717171] dark:text-[#a1a1aa]">
                  {formatDate(event.startDate)}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-[#d9d9d9] px-5 py-10 text-center dark:border-[#3a3a3f]">
            <h2 className="text-[15px] font-bold">No events yet</h2>
            <p className="mx-auto mt-2 max-w-md text-[13px] leading-5 text-[#666] dark:text-[#b4b4bc]">
              Events will appear here after this band is assigned to an event
              setlist.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function AddMemberForm({ groupId }: { groupId: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [instrument, setInstrument] = useState<GroupInstrument | "">("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    startTransition(async () => {
      const result = await GroupActions.addMember({
        email,
        groupId,
        instrument,
      });

      if (!result.ok) {
        showToast({
          title: "Member not added",
          description: result.error.message,
          tone: "error",
        });
        return;
      }

      setEmail("");
      setInstrument("");
      showToast({ title: "Member added", tone: "success" });
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-2 sm:grid-cols-[minmax(180px,240px)_minmax(150px,200px)_auto]"
    >
      <input
        required
        maxLength={320}
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="member@example.com"
        className="h-10 rounded-full border border-[#d9d9d9] bg-white px-4 text-[12px] font-medium outline-none transition focus:border-[#ed1746] focus:ring-3 focus:ring-[#ed1746]/10 dark:border-[#3a3a3f] dark:bg-[#202023] dark:focus:border-[#ed1746]"
      />
      <InstrumentSelector
        disabled={isPending}
        value={instrument}
        onChange={setInstrument}
      />
      <button
        type="submit"
        disabled={isPending || !email.trim()}
        className="inline-flex h-10 items-center justify-center rounded-full bg-[#ed1746] px-5 text-[12px] font-bold text-white transition hover:bg-[#d90f3b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] disabled:cursor-not-allowed disabled:opacity-55"
      >
        {isPending ? "Adding..." : "Add"}
      </button>
    </form>
  );
}

function MemberAvatar({
  image,
  name,
}: {
  image: string | null;
  name: string;
}) {
  if (image) {
    return (
      <span
        aria-hidden="true"
        className="size-10 shrink-0 rounded-full bg-cover bg-center"
        style={{ backgroundImage: `url(${image})` }}
      />
    );
  }

  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#ed1746] text-[13px] font-black text-white">
      {name.trim().charAt(0).toUpperCase() || "B"}
    </span>
  );
}

function formatRole(role: GroupRole): string {
  return role.toLowerCase().replace(/^\w/, (value) => value.toUpperCase());
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(new Date(value));
}
