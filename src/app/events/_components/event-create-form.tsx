"use client";

import { FormEvent, MouseEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import * as EventActions from "@/actions/event-actions";
import { showToast } from "@/components/shared/toast";

const DEFAULT_MAP_POINT = {
  latitude: 14.5995,
  longitude: 120.9842,
};

export function EventCreateForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [place, setPlace] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
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
        latitude,
        longitude,
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

  function handleMapClick(event: MouseEvent<HTMLButtonElement>): void {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width;
    const y = (event.clientY - bounds.top) / bounds.height;

    setLatitude(roundCoordinate(90 - y * 180));
    setLongitude(roundCoordinate(x * 360 - 180));
  }

  function useDefaultPoint(): void {
    setLatitude(DEFAULT_MAP_POINT.latitude);
    setLongitude(DEFAULT_MAP_POINT.longitude);
  }

  const markerPosition =
    latitude === null || longitude === null
      ? null
      : {
          left: `${((longitude + 180) / 360) * 100}%`,
          top: `${((90 - latitude) / 180) * 100}%`,
        };

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

      <div className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[13px] font-black">Map point</h2>
          <button
            type="button"
            onClick={useDefaultPoint}
            className="inline-flex h-8 items-center rounded-full border border-[#d9d9d9] px-3 text-[11px] font-bold transition hover:border-[#ed1746] hover:text-[#ed1746] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:border-[#3a3a3f]"
          >
            Manila
          </button>
        </div>

        <button
          type="button"
          onClick={handleMapClick}
          aria-label="Choose event map point"
          className="relative aspect-[16/8] overflow-hidden rounded-xl border border-[#d9d9d9] bg-[#f7f7f7] text-left shadow-inner transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:border-[#3a3a3f] dark:bg-[#19191b]"
        >
          <span className="absolute inset-0 bg-[linear-gradient(90deg,rgba(237,23,70,0.10)_1px,transparent_1px),linear-gradient(0deg,rgba(17,17,17,0.08)_1px,transparent_1px)] bg-[size:8.333%_16.666%] dark:bg-[linear-gradient(90deg,rgba(237,23,70,0.18)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,0.08)_1px,transparent_1px)]" />
          <span className="absolute inset-x-0 top-1/2 h-px bg-[#111]/20 dark:bg-white/20" />
          <span className="absolute inset-y-0 left-1/2 w-px bg-[#111]/20 dark:bg-white/20" />
          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-bold text-[#555] shadow-sm dark:bg-[#242428]/90 dark:text-[#d4d4d8]">
            {latitude === null || longitude === null
              ? "No point selected"
              : `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`}
          </span>
          {markerPosition ? (
            <span
              aria-hidden="true"
              style={markerPosition}
              className="absolute size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#ed1746] shadow-[0_0_0_6px_rgba(237,23,70,0.18)]"
            />
          ) : null}
        </button>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1.5 text-[12px] font-bold">
            Latitude
            <input
              type="number"
              step="0.000001"
              min="-90"
              max="90"
              value={latitude ?? ""}
              onChange={(event) =>
                setLatitude(parseOptionalCoordinate(event.target.value))
              }
              className="h-12 rounded-xl border border-[#d9d9d9] bg-white px-3 text-[14px] font-medium outline-none transition focus:border-[#ed1746] focus:ring-3 focus:ring-[#ed1746]/10 dark:border-[#3a3a3f] dark:bg-[#202023] dark:focus:border-[#ed1746]"
            />
          </label>
          <label className="grid gap-1.5 text-[12px] font-bold">
            Longitude
            <input
              type="number"
              step="0.000001"
              min="-180"
              max="180"
              value={longitude ?? ""}
              onChange={(event) =>
                setLongitude(parseOptionalCoordinate(event.target.value))
              }
              className="h-12 rounded-xl border border-[#d9d9d9] bg-white px-3 text-[14px] font-medium outline-none transition focus:border-[#ed1746] focus:ring-3 focus:ring-[#ed1746]/10 dark:border-[#3a3a3f] dark:bg-[#202023] dark:focus:border-[#ed1746]"
            />
          </label>
        </div>
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

function parseOptionalCoordinate(value: string): number | null {
  if (!value.trim()) {
    return null;
  }

  const coordinate = Number(value);
  return Number.isFinite(coordinate) ? coordinate : null;
}

function roundCoordinate(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}
