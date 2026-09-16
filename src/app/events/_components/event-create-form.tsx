"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import * as EventActions from "@/actions/event-actions";
import { showToast } from "@/components/shared/toast";

export function EventCreateForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [place, setPlace] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [isPending, startTransition] = useTransition();
  const timezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    [],
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    const parsedStartDate = new Date(startDate);

    if (Number.isNaN(parsedStartDate.getTime())) {
      showToast({
        title: "Event not created",
        description: "Choose a valid date and time.",
        tone: "error",
      });
      return;
    }

    startTransition(async () => {
      const result = await EventActions.createNew({
        title,
        startDate: parsedStartDate.toISOString(),
        place,
        timezone,
        locationAddress,
      });

      if (!result.ok) {
        showToast({
          title: "Event not created",
          description: result.error.message,
          tone: "error",
        });
        return;
      }

      showToast({ title: "Event created", tone: "success" });
      router.push(`/events/${result.data.eventId}`);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid max-w-3xl gap-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <label className="grid gap-1.5 text-[12px] font-bold lg:col-span-2">
          Event name
          <input
            required
            maxLength={120}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Saturday Practice"
            className="h-12 rounded-xl border border-[#d9d9d9] bg-white px-3 text-[14px] font-medium outline-none transition focus:border-[#ed1746] focus:ring-3 focus:ring-[#ed1746]/10 dark:border-[#3a3a3f] dark:bg-[#202023] dark:focus:border-[#ed1746]"
          />
        </label>

        <label className="grid gap-1.5 text-[12px] font-bold">
          Date and time
          <input
            required
            type="datetime-local"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className="h-12 rounded-xl border border-[#d9d9d9] bg-white px-3 text-[14px] font-medium outline-none transition focus:border-[#ed1746] focus:ring-3 focus:ring-[#ed1746]/10 dark:border-[#3a3a3f] dark:bg-[#202023] dark:focus:border-[#ed1746]"
          />
        </label>

        <label className="grid gap-1.5 text-[12px] font-bold">
          Location name
          <input
            required
            maxLength={255}
            value={place}
            onChange={(event) => setPlace(event.target.value)}
            placeholder="Main rehearsal room"
            className="h-12 rounded-xl border border-[#d9d9d9] bg-white px-3 text-[14px] font-medium outline-none transition focus:border-[#ed1746] focus:ring-3 focus:ring-[#ed1746]/10 dark:border-[#3a3a3f] dark:bg-[#202023] dark:focus:border-[#ed1746]"
          />
        </label>

        <label className="grid gap-1.5 text-[12px] font-bold lg:col-span-2">
          Address
          <input
            maxLength={255}
            value={locationAddress}
            onChange={(event) => setLocationAddress(event.target.value)}
            placeholder="Street, city, province"
            className="h-12 rounded-xl border border-[#d9d9d9] bg-white px-3 text-[14px] font-medium outline-none transition focus:border-[#ed1746] focus:ring-3 focus:ring-[#ed1746]/10 dark:border-[#3a3a3f] dark:bg-[#202023] dark:focus:border-[#ed1746]"
          />
        </label>
      </div>

      <div className="flex flex-wrap justify-end gap-2 border-t border-[#ececec] pt-5 dark:border-[#303034]">
        <button
          type="button"
          disabled={isPending}
          onClick={() => router.push("/events")}
          className="inline-flex h-11 items-center justify-center rounded-full border border-[#d9d9d9] px-5 text-[12px] font-bold transition hover:border-[#ed1746] hover:text-[#ed1746] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] disabled:opacity-50 dark:border-[#3a3a3f]"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending || !title.trim() || !startDate || !place.trim()}
          className="inline-flex h-11 items-center justify-center rounded-full bg-[#ed1746] px-6 text-[12px] font-bold text-white transition hover:bg-[#d90f3b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] disabled:cursor-not-allowed disabled:opacity-55"
        >
          {isPending ? "Creating..." : "Create event"}
        </button>
      </div>
    </form>
  );
}
