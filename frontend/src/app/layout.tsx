import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";
import { Toaster } from "react-hot-toast";
import UserProvider from "~/context/UserContext";
import ErrorBoundary from "~/components/ErrorBoundary";

export const metadata: Metadata = {
  title: "Smart Finance Tracker",
  description: "Track your expenses and income",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable}`}>
      <body>
        <ErrorBoundary>
          <UserProvider>
            {children}
            <Toaster
              toastOptions={{
                className: "",
                style: {
                  fontSize: '13px'
                },
              }}
            />
          </UserProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
