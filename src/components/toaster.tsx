"use client";

import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="top-center"
      richColors
      closeButton
      dir="auto"
      toastOptions={{
        style: {
          borderRadius: "0.9rem",
          fontFamily: "var(--font-sans)",
        },
      }}
    />
  );
}
