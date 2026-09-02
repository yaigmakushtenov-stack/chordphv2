"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import * as GroupActions from "@/actions/group-actions";
import { showToast } from "@/components/shared/toast";

export function BandCreateForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    startTransition(async () => {
      const result = await GroupActions.create({ name });

      if (!result.ok) {
        showToast({
          title: "Band not created",
          description: result.error.message,
          tone: "error",
        });
        return;
      }

      showToast({ title: "Band created", tone: "success" });
      router.push("/bands");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid max-w-xl gap-5">
      <label className="grid gap-1.5 text-[12px] font-bold">
        Band name
        <input
          required
          maxLength={100}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="The Saturday Practice Band"
          className="h-12 rounded-xl border border-[#d9d9d9] bg-white px-3 text-[14px] font-medium outline-none transition focus:border-[#ed1746] focus:ring-3 focus:ring-[#ed1746]/10 dark:border-[#3a3a3f] dark:bg-[#202023] dark:focus:border-[#ed1746]"
        />
      </label>
      <div className="flex flex-wrap justify-end gap-2 border-t border-[#ececec] pt-5 dark:border-[#303034]">
        <button
          type="button"
          disabled={isPending}
          onClick={() => router.push("/bands")}
          className="inline-flex h-11 items-center justify-center rounded-full border border-[#d9d9d9] px-5 text-[12px] font-bold transition hover:border-[#ed1746] hover:text-[#ed1746] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] disabled:opacity-50 dark:border-[#3a3a3f]"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending || !name.trim()}
          className="inline-flex h-11 items-center justify-center rounded-full bg-[#ed1746] px-6 text-[12px] font-bold text-white transition hover:bg-[#d90f3b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] disabled:cursor-not-allowed disabled:opacity-55"
        >
          {isPending ? "Creating..." : "Create band"}
        </button>
      </div>
    </form>
  );
}
