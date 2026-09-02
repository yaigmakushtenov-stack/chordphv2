"use client";

import { useSyncExternalStore } from "react";

import type { StageRuntimeState } from "@/types/stage";

type Listener = () => void;

const listeners = new Set<Listener>();
let stageRuntimeState: StageRuntimeState | null = null;

export function publishStageRuntimeState(state: StageRuntimeState): void {
  stageRuntimeState = state;

  for (const listener of listeners) {
    listener();
  }
}

export function getStageRuntimeState(): StageRuntimeState | null {
  return stageRuntimeState;
}

export function useStageRuntimeState(): StageRuntimeState | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): StageRuntimeState | null {
  return stageRuntimeState;
}

function getServerSnapshot(): StageRuntimeState | null {
  return null;
}
