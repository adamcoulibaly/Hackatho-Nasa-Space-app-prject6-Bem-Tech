import type { Climat } from "@/lib/contract";

export function AlertCard({ alerte }: { alerte: Climat["alertes"][number] }) {
  const surveiller = alerte.type === "surveiller";
  return (
    <div className="flex flex-col gap-2.5 rounded-3xl bg-white p-[22px]">
      <span className={`self-start rounded-full px-[11px] py-[5px] text-[13px] font-bold ${surveiller ? "bg-[#FDE7CC] text-[#7A3D00]" : "bg-[#D7F0E2] text-[#00502B]"}`}>
        {surveiller ? "À surveiller" : "Favorable"}
      </span>
      <span className="font-display text-lg font-bold tracking-[-0.02em]">{alerte.titre}</span>
      <span className="text-[15px] leading-[1.55] text-muted">{alerte.texte}</span>
    </div>
  );
}
