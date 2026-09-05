"use client";

import * as Ably from "ably";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { createStageChannelName } from "@/lib/realtime/stage-channel";
import type {
  StageRuntimePosition,
  StageSyncConnectionStatus,
  StageSyncEvent,
  StageSyncEventBase,
  StageSyncLockState,
  StageSyncMode,
  StageSyncPresenceData,
  StageSyncSnapshot,
  StageTrackTransposes,
} from "@/types/stage";

const SNAPSHOT_EVENT = "stage:snapshot";
const VIEWPORT_EVENT = "stage:viewport";
const SPEED_EVENT = "stage:speed";
const TRACK_TRANSPOSE_EVENT = "stage:track-transpose";

type StageSyncSnapshotData = {
  position: StageRuntimePosition | null;
  speed: number;
  trackTransposes: StageTrackTransposes;
};

type StageSyncEventDraft =
  | {
      position: StageRuntimePosition | null;
      speed: number;
      trackTransposes: StageTrackTransposes;
      type: "snapshot";
    }
  | {
      mode: "jump" | "scroll-end";
      position: StageRuntimePosition | null;
      speed: number;
      type: "viewport";
    }
  | {
      position: StageRuntimePosition | null;
      speed: number;
      type: "speed";
    }
  | {
      setListTrackId: string;
      transpose: number;
      type: "track-transpose";
    };

type UseStageSyncInput = {
  bandId: string | null;
  canPublish: boolean;
  eventId: string;
  lockState: StageSyncLockState;
  onSnapshot: (event: StageSyncSnapshot) => void;
  onTrackTranspose: (event: Extract<StageSyncEvent, { type: "track-transpose" }>) => void;
  onViewport: (event: Extract<StageSyncEvent, { type: "viewport" | "speed" }>) => void;
  role: "OWNER" | "MODERATOR" | "MEMBER" | null;
  setListId: string;
  snapshot: StageSyncSnapshotData;
  syncMode: StageSyncMode;
  userId: string;
};

type UseStageSyncResult = {
  isSyncAvailable: boolean;
  lastControllerLabel: string | null;
  publishSnapshot: () => void;
  publishSpeed: (input: {
    position: StageRuntimePosition | null;
    speed: number;
  }) => void;
  publishTrackTranspose: (input: {
    setListTrackId: string;
    transpose: number;
  }) => void;
  publishViewport: (input: {
    mode: "jump" | "scroll-end";
    position: StageRuntimePosition | null;
    speed: number;
  }) => void;
  status: StageSyncConnectionStatus;
};

export function useStageSync(input: UseStageSyncInput): UseStageSyncResult {
  const channelName = useMemo(() => {
    if (!input.bandId) {
      return null;
    }

    return createStageChannelName({
      bandId: input.bandId,
      eventId: input.eventId,
      setListId: input.setListId,
    });
  }, [input.bandId, input.eventId, input.setListId]);
  const clientId = `user:${input.userId}`;
  const [status, setStatus] = useState<StageSyncConnectionStatus>(
    channelName ? "connecting" : "unavailable",
  );
  const [lastControllerLabel, setLastControllerLabel] = useState<string | null>(
    null,
  );
  const channelRef = useRef<Ably.RealtimeChannel | null>(null);
  const connectionIdRef = useRef("");
  const sequenceRef = useRef(0);
  const latestEventRef = useRef({ key: "", sequence: 0, sentAt: 0 });
  const inputRef = useRef(input);

  useEffect(() => {
    inputRef.current = input;
  }, [input]);

  const publishEvent = useCallback(
    (event: StageSyncEventDraft) => {
      const channel = channelRef.current;
      const connectionId = connectionIdRef.current;

      if (!channel || !connectionId || !inputRef.current.canPublish) {
        return;
      }

      const base = {
        sender: {
          canPublish: inputRef.current.canPublish,
          clientId,
          connectionId,
          role: inputRef.current.role,
          userId: inputRef.current.userId,
        },
        sequence: (sequenceRef.current += 1),
        sentAt: Date.now(),
      } satisfies StageSyncEventBase;
      const payload = createEventPayload(base, event);

      void channel.publish(getEventName(payload.type), payload);
      setLastControllerLabel(formatControllerLabel(payload.sender.role));
    },
    [clientId],
  );

  const publishSnapshot = useCallback(() => {
    publishEvent({
      position: inputRef.current.snapshot.position,
      speed: inputRef.current.snapshot.speed,
      trackTransposes: inputRef.current.snapshot.trackTransposes,
      type: "snapshot",
    });
  }, [publishEvent]);

  const publishViewport: UseStageSyncResult["publishViewport"] = useCallback(
    ({ mode, position, speed }) => {
      publishEvent({
        mode,
        position,
        speed,
        type: "viewport",
      });
    },
    [publishEvent],
  );

  const publishSpeed: UseStageSyncResult["publishSpeed"] = useCallback(
    ({ position, speed }) => {
      publishEvent({
        position,
        speed,
        type: "speed",
      });
    },
    [publishEvent],
  );

  const publishTrackTranspose: UseStageSyncResult["publishTrackTranspose"] =
    useCallback(
      ({ setListTrackId, transpose }) => {
        publishEvent({
          setListTrackId,
          transpose,
          type: "track-transpose",
        });
      },
      [publishEvent],
    );

  useEffect(() => {
    if (!channelName || !input.bandId) {
      return;
    }

    let isActive = true;
    const client = new Ably.Realtime({
      authMethod: "GET",
      authUrl: `/api/ably/token?eventId=${encodeURIComponent(
        input.eventId,
      )}&setListId=${encodeURIComponent(
        input.setListId,
      )}&bandId=${encodeURIComponent(input.bandId)}`,
      closeOnUnload: true,
    });
    const channel = client.channels.get(channelName);
    channelRef.current = channel;

    function handleConnectionStateChange(
      stateChange: Ably.ConnectionStateChange,
    ): void {
      if (!isActive) {
        return;
      }

      if (stateChange.current === "connected") {
        connectionIdRef.current = client.connection.id ?? "";
        setStatus(connectionIdRef.current ? "connected" : "connecting");
        return;
      }

      if (
        stateChange.current === "failed" ||
        stateChange.current === "suspended"
      ) {
        setStatus("disconnected");
        return;
      }

      setStatus("connecting");
    }

    function handleMessage(message: Ably.Message): void {
      const event = message.data;

      if (!isStageSyncEvent(event)) {
        return;
      }

      if (
        event.sender.clientId === clientId &&
        event.sender.connectionId === connectionIdRef.current
      ) {
        return;
      }

      if (isStaleEvent(event, latestEventRef.current)) {
        return;
      }

      latestEventRef.current = {
        key: createEventKey(event),
        sequence: event.sequence,
        sentAt: event.sentAt,
      };
      setLastControllerLabel(formatControllerLabel(event.sender.role));

      if (event.type === "track-transpose") {
        inputRef.current.onTrackTranspose(event);
        return;
      }

      if (event.type === "snapshot") {
        inputRef.current.onSnapshot(event);
        return;
      }

      if (event.type === "viewport" || event.type === "speed") {
        inputRef.current.onViewport(event);
      }
    }

    async function enterStage(): Promise<void> {
      setStatus("connecting");
      client.connection.on(handleConnectionStateChange);
      await channel.subscribe(SNAPSHOT_EVENT, handleMessage);
      if (!isActive) {
        return;
      }

      await channel.subscribe(VIEWPORT_EVENT, handleMessage);
      if (!isActive) {
        return;
      }

      await channel.subscribe(SPEED_EVENT, handleMessage);
      if (!isActive) {
        return;
      }

      await channel.subscribe(TRACK_TRANSPOSE_EVENT, handleMessage);
      if (!isActive) {
        return;
      }

      await channel.presence.subscribe(() => {
        if (inputRef.current.canPublish) {
          publishSnapshot();
        }
      });
      if (!isActive) {
        return;
      }

      await channel.presence.enter({
        canLead: input.canPublish,
        role: input.role,
        synced: input.syncMode === "synced",
        userId: input.userId,
      } satisfies StageSyncPresenceData);

      if (input.canPublish) {
        publishSnapshot();
      }
    }

    const enterStagePromise = enterStage().catch((error: unknown) => {
      if (isActive) {
        console.error("Failed to join stage sync", error);
        setStatus("disconnected");
      }
    });

    return () => {
      isActive = false;
      channelRef.current = null;
      channel.unsubscribe();
      channel.presence.unsubscribe();
      client.connection.off(handleConnectionStateChange);
      void enterStagePromise.finally(() => {
        window.setTimeout(() => {
          try {
            client.close();
          } catch {
            // Ably can already be closing during React effect teardown.
          }
        }, 0);
      });
    };
  }, [
    channelName,
    clientId,
    input.bandId,
    input.canPublish,
    input.eventId,
    input.role,
    input.setListId,
    input.syncMode,
    input.userId,
    publishSnapshot,
  ]);

  useEffect(() => {
    const channel = channelRef.current;

    if (!channel) {
      return;
    }

    void channel.presence
      .update({
        canLead: input.canPublish,
        role: input.role,
        synced: input.syncMode === "synced",
        userId: input.userId,
      } satisfies StageSyncPresenceData)
      .catch(() => undefined);
  }, [input.canPublish, input.role, input.syncMode, input.userId]);

  return {
    isSyncAvailable: Boolean(channelName),
    lastControllerLabel,
    publishSnapshot,
    publishSpeed,
    publishTrackTranspose,
    publishViewport,
    status,
  };
}

function getEventName(type: StageSyncEvent["type"]): string {
  if (type === "snapshot") {
    return SNAPSHOT_EVENT;
  }

  if (type === "viewport") {
    return VIEWPORT_EVENT;
  }

  if (type === "speed") {
    return SPEED_EVENT;
  }

  return TRACK_TRANSPOSE_EVENT;
}

function createEventPayload(
  base: StageSyncEventBase,
  event: StageSyncEventDraft,
): StageSyncEvent {
  if (event.type === "snapshot") {
    return {
      ...base,
      position: event.position,
      speed: event.speed,
      trackTransposes: event.trackTransposes,
      type: event.type,
    };
  }

  if (event.type === "viewport") {
    return {
      ...base,
      mode: event.mode,
      position: event.position,
      speed: event.speed,
      type: event.type,
    };
  }

  if (event.type === "speed") {
    return {
      ...base,
      position: event.position,
      speed: event.speed,
      type: event.type,
    };
  }

  return {
    ...base,
    setListTrackId: event.setListTrackId,
    transpose: event.transpose,
    type: event.type,
  };
}

function isStaleEvent(
  event: StageSyncEvent,
  latestEvent: { key: string; sequence: number },
): boolean {
  const eventKey = createEventKey(event);

  return eventKey === latestEvent.key && event.sequence <= latestEvent.sequence;
}

function createEventKey(event: StageSyncEvent): string {
  return `${event.sender.clientId}:${event.sender.connectionId}`;
}

function formatControllerLabel(
  role: "OWNER" | "MODERATOR" | "MEMBER" | null,
): string {
  if (role === "OWNER") {
    return "Owner";
  }

  if (role === "MODERATOR") {
    return "Moderator";
  }

  return "Member";
}

function isStageSyncEvent(value: unknown): value is StageSyncEvent {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const event = value as {
    sender?: {
      clientId?: unknown;
      connectionId?: unknown;
      role?: unknown;
      userId?: unknown;
    };
    sequence?: unknown;
    sentAt?: unknown;
    type?: unknown;
  };

  return (
    typeof event.sender?.clientId === "string" &&
    typeof event.sender.connectionId === "string" &&
    typeof event.sender.userId === "string" &&
    typeof event.sequence === "number" &&
    typeof event.sentAt === "number" &&
    (event.type === "snapshot" ||
      event.type === "viewport" ||
      event.type === "speed" ||
      event.type === "track-transpose")
  );
}
