import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Titi's Consultoria de Imagem & StyleMatch Premium",
  description: "Plataforma exclusiva de consultoria de imagem masculina. Descubra combinações de looks de alta alfaiataria, análise cromática de tom de pele e elegância sob medida.",
  keywords: ["Consultoria de imagem", "Estilo masculino", "Titi's Stylematch", "Alfaiataria", "Análise cromática", "Looks masculinos"],
  openGraph: {
    title: "Titi's Consultoria de Imagem & StyleMatch",
    description: "Eleve sua presença e autenticidade com a curadoria de estilo Titi's.",
    images: ["/hero_titis_style.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${playfair.variable} ${inter.variable}`}>
      <body className="bg-[#0B0C10] text-slate-100 antialiased min-h-screen selection:bg-[#D4AF37] selection:text-[#0B0C10]">
        {children}
      </body>
    </html>
  );
}
