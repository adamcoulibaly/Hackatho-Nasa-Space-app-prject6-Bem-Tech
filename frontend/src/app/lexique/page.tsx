import { SiteHeader } from "@/components/SiteHeader";
import { LexiqueSearch } from "@/components/LexiqueSearch";
import { getLexique } from "@/lib/data";

export const metadata = { title: "Lexique — ForoSat" };

export default async function LexiquePage() {
  const termes = await getLexique();
  return (
    <>
      <SiteHeader current="lexique" />
      <main className="mx-auto flex max-w-[1360px] flex-col gap-6 px-6 pb-14 pt-8">
        <h1 className="m-0 font-display text-[clamp(30px,3.4vw,46px)] font-bold leading-[1.05] tracking-[-0.04em]">
          Les mots, <span className="font-serif font-normal italic text-green-dark">en une phrase.</span>
        </h1>
        <LexiqueSearch termes={termes} />
      </main>
    </>
  );
}
