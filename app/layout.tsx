import "./globals.css";

export const metadata = {
  title: "Dance Analyst",
  description: "Breakdance practice management tool",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="bg-[#0A0A0C] text-zinc-100 antialiased">
        {children}
      </body>
    </html>
  );
}