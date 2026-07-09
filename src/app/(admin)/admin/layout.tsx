import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "后台管理 | DeepChat",
  description: "DeepChat 后台管理控制台",
};

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return children;
}
