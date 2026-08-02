"use client";

import { create } from "zustand";

type MorphStore = {
  prevArchId: string | null;
  enteringIds: Set<string>;
  exitingIds: Set<string>;
  morphAt: number;
  beginMorph: (prevId: string | null, enter: string[], exit: string[]) => void;
  finishMorph: () => void;
};

export const useMorphStore = create<MorphStore>((set) => ({
  prevArchId: null,
  enteringIds: new Set<string>(),
  exitingIds: new Set<string>(),
  morphAt: 0,
  beginMorph: (prevId, enter, exit) =>
    set({
      prevArchId: prevId,
      enteringIds: new Set(enter),
      exitingIds: new Set(exit),
      morphAt: Date.now(),
    }),
  finishMorph: () =>
    set({
      prevArchId: null,
      enteringIds: new Set<string>(),
      exitingIds: new Set<string>(),
    }),
}));
