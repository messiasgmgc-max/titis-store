import type { Metadata } from "next";
import { Outfit, Inter } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Titi's Store - Consultoria de Imagem & StyleMatch Premium",
  description: "Plataforma exclusiva de consultoria de imagem masculina. Descubra combinações de looks de alta alfaiataria, análise cromática de tom de pele e elegância sob medida.",
  keywords: ["Titi's Store", "Consultoria de imagem", "Estilo masculino", "Titi's Stylematch", "Alfaiataria", "Análise cromática", "Looks masculinos"],
  openGraph: {
    title: "Titi's Store - Consultoria de Imagem & StyleMatch",
    description: "Eleve sua presença e autenticidade com a curadoria de estilo Titi's Store.",
    images: ["/logo_titis.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${outfit.variable} ${inter.variable}`}>
      <body className="bg-[#0B0C10] text-slate-100 antialiased min-h-screen selection:bg-[#D4AF37] selection:text-[#0B0C10] font-[family-name:var(--font-sans)]">
        {children}
      </body>
    </html>
  );
}
