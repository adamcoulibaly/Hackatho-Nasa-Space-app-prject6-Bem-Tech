"use client";

import { useSearchParams } from "next/navigation";
import type { Climat, Culture } from "@/lib/contract";
import { FicheVue } from "./FicheVue";

export function FicheDepuisUrl(props: { id: "A" | "B" | "C"; initial: Climat; cultures: Culture[] }) {
  const params = useSearchParams();
  return <FicheVue {...props} params={new URLSearchParams(params.toString())} />;
}
