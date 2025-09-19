import { AppSidebar } from "@/components/app-sidebar";
import App from "next/app";
import { SidebarProvider } from "@/components/ui/sidebar";
import { BowArrow } from "lucide-react";
import { Gupter } from "next/font/google";

const gupter = Gupter({ weight: "400", subsets: ["latin"] });

export default function Home() {
  return (
  <div className="w-full flex gap-3">
    <div className="bg-gradient-to-b from-stone-100 text-center flex justify-center content-center items-center to-stone-200 border-b-2 border-b-stone-300 min-h-40 w-full">
      <h1 className={`${gupter.className} text-7xl`}>districts</h1>
    </div>
  </div>
  );
}
