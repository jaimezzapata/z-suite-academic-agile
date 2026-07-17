import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Agile Academic Hub | z-Suite",
  description: "Plataforma premium de gestión y seguimiento de proyectos académicos ágiles con análisis de métricas y tableros Kanban.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const theme = localStorage.getItem('theme') || 'dark';
                  if (theme === 'dark') {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                  
                  const color = localStorage.getItem('theme-color');
                  if (color) {
                    document.documentElement.style.setProperty('--brand-color', color);
                    document.documentElement.style.setProperty('--color-brand-purple', color);
                  }
                  const colorHover = localStorage.getItem('theme-color-hover');
                  if (colorHover) {
                    document.documentElement.style.setProperty('--brand-color-hover', colorHover);
                    document.documentElement.style.setProperty('--color-brand-purple-hover', colorHover);
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
