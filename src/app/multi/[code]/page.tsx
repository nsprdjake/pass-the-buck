"use client";

import { use } from "react";
import { RemoteGameProvider } from "@/context/RemoteGameContext";
import MultiGameShell from "./shell";

export default function MultiGamePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const normalizedCode = code.toUpperCase();
  return (
    <RemoteGameProvider code={normalizedCode}>
      <MultiGameShell code={normalizedCode} />
    </RemoteGameProvider>
  );
}
