import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Project Anti-Gravity — Intelligent Returns Bridge",
  description: "Six-layer retail returns mitigation platform, fraud detector, P2P optimizer, and green loyalty ledger utilizing Groq API Llama 3 / Vision.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Leaflet Map Stylesheets and Scripts (100% Free OpenStreetMap client) */}
        <link 
          rel="stylesheet" 
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" 
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" 
          crossOrigin="" 
        />
        <script 
          src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" 
          integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" 
          crossOrigin="" 
          defer
        ></script>
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
