"use client";

import { type FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import * as GroupActions from "@/actions/group-actions";
import type { BandDetailData } from "@/app/bands/_components/band-detail";
import { formatGroupInstrument, GROUP_INSTRUMENT_OPTIONS } from "@/app/bands/_components/instrument-selector";
import { showToast } from "@/components/shared/toast";
import type { GroupInstrument } from "@/generated/prisma/client";

type BandMemberManagerProps = {
  groupId: string;
  members: BandDetailData["members"];
};

export function BandMemberManager({ groupId, members }: BandMemberManagerProps) {
  const router = useRouter();
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [instrument, setInstrument] = useState<GroupInstrument | "">("");
  const [isPending, startTransition] = useTransition();

  function handleSave(event: FormEvent<HTMLFormElement>, memberUserId: string): void {
    event.preventDefault();

    startTransition(async () => {
      const result = await GroupActions.saveMember({ groupId, memberUserId, instrument });

      if (!result.ok) {
        showToast({ title: "Member not saved", description: result.error.message, tone: "error" });
        return;
      }

      setEditingMemberId(null);
      showToast({ title: "Member saved", tone: "success" });
      router.refresh();
    });
  }

  function handleRemove(memberUserId: string): void {
    startTransition(async () => {
      const result = await GroupActions.removeMember({ groupId, memberUserId });

      if (!result.ok) {
        showToast({ title: "Member not removed", description: result.error.message, tone: "error" });
        return;
      }

      setRemovingMemberId(null);
      showToast({ title: "Member removed", tone: "success" });
      router.refresh();
    });
  }

  return (
    <section aria-label="Manage band members" className="border-t border-[#ececec] p-5 dark:border-[#303034] sm:p-6">
      <h3 className="text-[15px] font-bold">Members</h3>
      <p className="mt-1 text-[12px] text-[#666] dark:text-[#b4b4bc]">
        Edit instruments or remove members from this band.
      </p>
      <div className="mt-3 divide-y divide-[#ececec] dark:divide-[#303034]">
        {members.map((member) => (
          <div key={member.id} className="grid min-w-0 gap-3 py-4">
            <div className="min-w-0">
              <p className="truncate text-[13px] font-bold">{member.name}</p>
              <p className="mt-1 text-[11px] text-[#666] dark:text-[#b4b4bc]">
                {member.instrument ? formatGroupInstrument(member.instrument) : "No instrument"}
                {" · "}<span className="capitalize">{member.role.toLowerCase()}</span>
              </p>
            </div>
            {editingMemberId === member.id ? (
              <form onSubmit={(event) => handleSave(event, member.id)} className="grid gap-3">
                <label className="grid gap-1.5 text-[12px] font-bold">
                  Instrument
                  <select
                    value={instrument}
                    disabled={isPending}
                    onChange={(event) => setInstrument(event.target.value as GroupInstrument | "")}
                    className="h-10 w-full rounded-xl border border-[#d9d9d9] bg-white px-3 text-[13px] font-medium text-[#111] outline-none transition focus:border-[#ed1746] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] disabled:opacity-50 dark:border-[#3a3a3f] dark:bg-[#202023] dark:text-white dark:focus:border-[#ed1746]"
                  >
                    <option value="">No instrument</option>
                    {GROUP_INSTRUMENT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
                <div className="flex flex-wrap justify-end gap-2">
                  <button type="button" disabled={isPending} onClick={() => setEditingMemberId(null)} className="inline-flex h-9 items-center justify-center rounded-full border border-[#d9d9d9] px-4 text-[12px] font-bold transition hover:border-[#ed1746] hover:text-[#ed1746] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] disabled:opacity-50 dark:border-[#3a3a3f]">
                    Cancel
                  </button>
                  <button type="submit" disabled={isPending} className="inline-flex h-9 items-center justify-center rounded-full bg-[#ed1746] px-4 text-[12px] font-bold text-white transition hover:bg-[#d90f3b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] disabled:opacity-55">
                    {isPending ? "Saving…" : "Save member"}
                  </button>
                </div>
              </form>
            ) : removingMemberId === member.id ? (
              <div role="alert" className="grid gap-3 rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/35">
                <p className="text-[12px] leading-5 text-red-700 dark:text-red-300">
                  Remove {member.name} from this band? They will lose access to its content.
                </p>
                <div className="flex flex-wrap justify-end gap-2">
                  <button type="button" disabled={isPending} onClick={() => setRemovingMemberId(null)} className="inline-flex h-9 items-center justify-center rounded-full border border-red-200 px-4 text-[12px] font-bold text-red-700 transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/60">
                    Cancel
                  </button>
                  <button type="button" disabled={isPending} onClick={() => handleRemove(member.id)} className="inline-flex h-9 items-center justify-center rounded-full bg-red-600 px-4 text-[12px] font-bold text-white transition hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:opacity-55">
                    {isPending ? "Removing…" : "Remove member"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={isPending} aria-label={`Edit instrument for ${member.name}`} onClick={() => { setInstrument(member.instrument ?? ""); setEditingMemberId(member.id); setRemovingMemberId(null); }} className="inline-flex h-9 items-center justify-center rounded-full border border-[#d9d9d9] px-4 text-[12px] font-bold transition hover:border-[#ed1746] hover:text-[#ed1746] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] disabled:opacity-50 dark:border-[#3a3a3f]">
                  Edit instrument
                </button>
                {member.role !== "OWNER" ? (
                  <button type="button" disabled={isPending} aria-label={`Remove ${member.name} from this band`} onClick={() => { setRemovingMemberId(member.id); setEditingMemberId(null); }} className="inline-flex h-9 items-center justify-center rounded-full border border-red-200 px-4 text-[12px] font-bold text-red-600 transition hover:border-red-600 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:opacity-50 dark:border-red-900 dark:text-red-400 dark:hover:border-red-500 dark:hover:bg-red-950/35">
                    Remove
                  </button>
                ) : null}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
