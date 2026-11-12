import type { Metadata } from "next";
import "./globals.css";
import { ParcelleProvider } from "@/lib/parcelle/context";
import { MotionRoot } from "@/components/MotionRoot";
import { ModeApp } from "@/components/ModeApp";
import { HorsLigne } from "@/components/HorsLigne";

export const metadata: Metadata = {
  title: "ForoSat — choisir sa prochaine rotation",
  description: "Comparer trois rotations de cultures à partir de 20 ans de données satellites NASA.",
};

const FONTS =
  "https://fonts.googleapis.com/css2?family=Unbounded:wght@400;500;700;800&family=Inter+Tight:wght@400;500;600;700&family=Instrument+Serif:ital@1&display=swap";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href={FONTS} />
      </head>
      <body className="font-sans bg-paper text-ink min-h-screen"><ParcelleProvider>{children}</ParcelleProvider><MotionRoot /><ModeApp /><HorsLigne /></body>
    </html>
  );
}
