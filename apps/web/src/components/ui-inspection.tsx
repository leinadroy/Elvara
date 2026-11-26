"use client";

import { Agentation } from "agentation";

export function UiInspection() {
  return process.env.NODE_ENV === "development" ? <Agentation /> : null;
}
