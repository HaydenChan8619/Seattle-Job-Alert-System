import "./globals.css";

export const metadata = {
  title: "Seattle Tech Job Monitor & Speed Tracker",
  description: "Real-time automated detector and instant application tracker for SWE & PM roles in Greater Seattle tech hubs (Seattle, Bellevue, Redmond).",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#09090b] text-[#fafafa] antialiased selection:bg-zinc-800 selection:text-white">
        {children}
      {/* impeccable-live-start */}
<script src="http://localhost:8400/live.js?token=fbad250d-a6aa-490f-af5e-05e538f17665"></script>
{/* impeccable-live-end */}
</body>
    </html>
  );
}
