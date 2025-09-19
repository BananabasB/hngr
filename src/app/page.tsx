import { AppSidebar } from "@/components/app-sidebar";
import App from "next/app";
import { SidebarProvider } from "@/components/ui/sidebar";

export default function Home() {
  return (
    <div className="h-screen w-screen flex bg-base">
      <SidebarProvider><AppSidebar></AppSidebar></SidebarProvider>
        <main>
          
        </main>
    </div>
  );
}
