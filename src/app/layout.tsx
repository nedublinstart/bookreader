import type { Metadata } from "next";
import { IBM_Plex_Sans, Source_Serif_4 } from "next/font/google";
import "./globals.css";

const sourceSerif = Source_Serif_4({
  variable: "--font-newsreader",
  subsets: ["latin", "cyrillic"],
  style: ["normal", "italic"],
});

const plex = IBM_Plex_Sans({
  variable: "--font-figtree",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Семестр — трекер чтения для вуза",
  description:
    "Контроль чтения учебников и литературы: дедлайны, дневная норма, стрики и темп до зачёта.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ru"
      className={`${sourceSerif.variable} ${plex.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
