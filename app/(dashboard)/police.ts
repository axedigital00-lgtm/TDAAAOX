import { Inter } from "next/font/google";

// Police de l'admin marchand (D10) : auto-hébergée par next/font, variable lue par .adm (globals.css).
export const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-inter", display: "swap" });
