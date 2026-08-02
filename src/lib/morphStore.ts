"use client";

import { create } from "zustand";

type MorphStore = {
  prevArchId: string | null;
  enteringKeys: Set<string>;
  exitingKeys: Set<string>;
  morphAt: number;
  beginMorph: (prevId: string | null, enter: string[], exit: string[]) => void;
  finishMorph: () => void;
};

export const useMorphStore = create<MorphStore>((set) => ({
  prevArchId: null,
  enteringKeys: new Set<string>(),
  exitingKeys: new Set<string>(),
  morphAt: 0,
  beginMorph: (prevId, enter, exit) =>
    set({
      prevArchId: prevId,
      enteringKeys: new Set(enter),
      exitingKeys: new Set(exit),
      morphAt: Date.now(),
    }),
  finishMorph: () =>
    set({
      prevArchId: null,
      enteringKeys: new Set<string>(),
      exitingKeys: new Set<string>(),
    }),
}));
