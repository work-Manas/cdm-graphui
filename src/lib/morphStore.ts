"use client";

import { create } from "zustand";

type MorphStore = {
  enteringKeys: Set<string>;
  exitingKeys: Set<string>;
  morphAt: number;
  beginMorph: (enter: string[], exit: string[]) => void;
  finishMorph: () => void;
};

export const useMorphStore = create<MorphStore>((set) => ({
  enteringKeys: new Set<string>(),
  exitingKeys: new Set<string>(),
  morphAt: 0,
  beginMorph: (enter, exit) =>
    set({
      enteringKeys: new Set(enter),
      exitingKeys: new Set(exit),
      morphAt: Date.now(),
    }),
  finishMorph: () =>
    set({
      enteringKeys: new Set<string>(),
      exitingKeys: new Set<string>(),
    }),
}));
