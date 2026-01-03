"use client";

import { useEffect, useState, useRef } from "react";
import { setupDatabase, type HngrDB, type Tribute } from "@/lib/setup";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Gupter, IBM_Plex_Mono } from "next/font/google";
import {
  Download,
  Check,
  Image as ImageIcon,
  Sun,
  Moon,
  Smartphone,
  BowArrow
} from "lucide-react";
import { DeviceSyncDialog } from "@/components/device-sync/device-sync-dialog";
import { useAppState } from "@/lib/state-context";
import { useAuth } from "@/lib/auth";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { simulateGame } from "@/lib/simulation";
// Dynamic import for dom-to-image-more to avoid Node.js runtime errors

const gupter = Gupter({ weight: "400", subsets: ["latin"] });
const ibmMono = IBM_Plex_Mono({ weight: ["400", "500", "700"], subsets: ["latin"] });

export default function SharePage() {
  const { db, setDb } = useAppState();
  const { isPlus } = useAuth();
  const [importError, setImportError] = useState<string | null>(null);
  const [exportTheme, setExportTheme] = useState<"light" | "dark">("light");
  const [selectedDay, setSelectedDay] = useState<string>("");
  const [removeBranding, setRemoveBranding] = useState(true); // For hngr+ users
  const dayRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});






  const getTributeCount = () => {
    if (!db) return 0;
    return Object.values(db.tributes).filter(t => t.name).length;
  };

  const getEventCount = () => {
    if (!db) return 0;
    // Use the same simulation logic as the timeline
    const simulatedEvents = simulateGame(db);
    const count = Object.values(simulatedEvents).flat().length;
    console.log('Event count:', count, 'Simulated events:', simulatedEvents);
    return count;
  };

  const getAvailableDays = () => {
    if (!db) return [];
    // Use the same simulation logic as the timeline
    const simulatedEvents = simulateGame(db);
    return Object.keys(simulatedEvents)
      .map(Number)
      .filter(day => simulatedEvents[day] && simulatedEvents[day].length > 0)
      .sort((a, b) => a - b);
  };

  const exportDayAsPNG = async (day: number) => {
    console.log('Exporting day:', day, 'Element exists:', !!dayRefs.current[day]);
    const element = dayRefs.current[day];
    if (!element) {
      console.error('No element found for day:', day);
      return;
    }

    try {
      console.log('Starting PNG export for day:', day);
      // Dynamically import dom-to-image-more to avoid Node.js runtime errors
      // @ts-ignore - dom-to-image-more doesn't have TypeScript definitions
      const domtoimage = (await import("dom-to-image-more")).default;

      // Create a clone of the element to modify for brand-free export
      const clonedElement = element.cloneNode(true) as HTMLElement;
      
      // For hngr+ users, remove hngr branding from the export
      if (isPlus && removeBranding) {
        console.log('Removing hngr branding for hngr+ user');
        // Remove any elements containing hngr branding
        const brandingElements = clonedElement.querySelectorAll('[data-hngr-branding], .hngr-branding, [class*="hngr"]');
        brandingElements.forEach(el => el.remove());
        
        // Remove any text containing "hngr" from the cloned element
        const walker = document.createTreeWalker(
          clonedElement,
          NodeFilter.SHOW_TEXT,
          null
        );
        
        const textNodes: Text[] = [];
        let node;
        while (node = walker.nextNode()) {
          if (node.nodeValue && node.nodeValue.toLowerCase().includes('hngr')) {
            textNodes.push(node as Text);
          }
        }
        
        textNodes.forEach(textNode => {
          if (textNode.nodeValue) {
            textNode.nodeValue = textNode.nodeValue.replace(/hngr/gi, '');
          }
        });
      }

      // Use dom-to-image-more with filter to remove problematic styles
      const blob = await domtoimage.toBlob(clonedElement, {
        width: 800 * 2,
        height: clonedElement.scrollHeight * 2,
        style: {
          transform: 'scale(2)',
          transformOrigin: 'top left',
          width: '800px',
          height: clonedElement.scrollHeight + 'px'
        },
        bgcolor: exportTheme === "dark" ? "#1f2937" : "#ffffff",
        filter: (node: any) => {
          // Filter out style and link elements that might cause issues
          if (node.tagName === 'STYLE' || node.tagName === 'LINK') {
            return false;
          }
          return true;
        }
      });

      console.log('Generated blob, size:', blob.size, 'type:', blob.type);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      
      // Brand-free filename for hngr+ users
      const filenamePrefix = (isPlus && removeBranding) ? "day" : "hngr-day";
      link.download = `${filenamePrefix}-${day}-${exportTheme}.png`;
      console.log('Downloading file:', link.download);
      
      link.click();
      URL.revokeObjectURL(url);
      console.log('Export completed successfully');
    } catch (error) {
      console.error("Failed to export PNG:", error);
    }
  };


  return (
    <div className="w-full flex flex-col gap-3">
      <div className="bg-gradient-to-b from-base-100 via-base-100 text-center justify-center content-center items-center to-sidebar-accent border-b-2 border-border min-h-32 sm:min-h-40 w-full">
        <h1 className={`${gupter.className} text-5xl sm:text-7xl`}>share</h1>
      </div>

      <div className="text-center flex flex-col p-4 sm:p-6 justify-center gap-4 sm:gap-6 max-w-2xl mx-auto w-full">
        {/* Device Sync */}
        <Card className="p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Smartphone className="w-5 h-5" />
            <h2 className="text-lg sm:text-xl font-semibold">device sync</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4 sm:mb-6">
            transfer your data between devices seamlessly
          </p>
          <DeviceSyncDialog
            currentState={db}
            onStateReceived={setDb}
          >
            <Button className="w-full gap-2">
              <Smartphone className="w-4 h-4" />
              sync devices
            </Button>
          </DeviceSyncDialog>
        </Card>

        {/* Data Overview */}
        <Card className="p-4 sm:p-6">
          <h2 className="text-xl sm:text-2xl font-semibold mb-4">your data</h2>
          {db ? (
            <div className="grid grid-cols-2 gap-4 text-left">
              <div className="flex flex-col gap-1">
                <span className="text-sm text-muted-foreground">
                  {db.tributeReferralName.plural}
                </span>
                <span className="text-2xl sm:text-3xl font-bold">{getTributeCount()}/24</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-sm text-muted-foreground">events</span>
                <span className="text-2xl sm:text-3xl font-bold">{getEventCount()}</span>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">loading...</p>
          )}
        </Card>

        
        
        {/* PNG Export Section */}
        {db && (
          <Card className="p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <ImageIcon className="w-5 h-5" />
              <h2 className="text-lg sm:text-xl font-semibold">export as images</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4 sm:mb-6">
              export each day's events as PNG images to share on social media
            </p>

            {getEventCount() > 0 ? (
              <>
                {/* Theme Toggle */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4 sm:mb-6">
                  <span className="text-sm font-medium">export theme:</span>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setExportTheme("light")}
                      variant={exportTheme === "light" ? "default" : "outline"}
                      size="sm"
                      className="gap-2"
                    >
                      <Sun className="w-4 h-4" />
                      light
                    </Button>
                    <Button
                      onClick={() => setExportTheme("dark")}
                      variant={exportTheme === "dark" ? "default" : "outline"}
                      size="sm"
                      className="gap-2"
                    >
                      <Moon className="w-4 h-4" />
                      dark
                    </Button>
                  </div>
                </div>

                {/* Branding Toggle for hngr+ users */}
                {isPlus && (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4 sm:mb-6">
                    <span className="text-sm font-medium">branding:</span>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setRemoveBranding(true)}
                        variant={removeBranding ? "default" : "outline"}
                        size="sm"
                        className="gap-2"
                      >
                        <Check className="w-4 h-4" />
                        brand-free
                      </Button>
                      <Button
                        onClick={() => setRemoveBranding(false)}
                        variant={!removeBranding ? "default" : "outline"}
                        size="sm"
                        className="gap-2"
                      >
                        <BowArrow className="w-4 h-4" />
                        with hngr
                      </Button>
                    </div>
                  </div>
                )}


                <div className="flex flex-col gap-3">
                  <p className="text-sm font-semibold">or export individual day:</p>
                  <div className="flex gap-2">
                    <Select
                      value={selectedDay}
                      onValueChange={(value) => {
                        setSelectedDay(value);
                        exportDayAsPNG(Number(value));
                      }}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="select a day to export" />
                      </SelectTrigger>
                      <SelectContent>
                        {getAvailableDays().map((day) => (
                          <SelectItem key={day} value={String(day)}>
                            day {day}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-6 sm:py-8">
                <p className="text-muted-foreground text-sm">
                  no events to export yet. start a simulation to create events that can be exported as images.
                </p>
              </div>
            )}
          </Card>
        )}

        {/* Info Card */}
        <Card className="p-6 bg-sidebar-accent border-sidebar-accent">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold">note:</span> all data is stored locally in your browser.
            exported files contain all your {db?.tributeReferralName.plural || "tributes"},
            their relationships, and event history.
          </p>
        </Card>

        {/* Hidden event cards for PNG export */}
        {db && (
          <div style={{ position: "fixed", left: "-9999px", top: "0" }}>
            <style>{`
              [data-export-card] * {
                border: none !important;
                outline: none !important;
              }
            `}</style>
            {Object.entries(simulateGame(db)).map(([day, events]) => {
              const isDark = exportTheme === "dark";
              const bgColor = isDark ? "#1f2937" : "#ffffff";
              const textColor = isDark ? "#f3f4f6" : "#1f2937";
              const headingColor = isDark ? "#ffffff" : "#111827";
              const cardBgColor = isDark ? "#374151" : "#f9fafb";
              const mutedTextColor = isDark ? "#d1d5db" : "#6b7280";
              const avatarBgColor = isDark ? "#4b5563" : "#e5e7eb";

              return (
                <div
                  key={`day-${day}`}
                  id={`day-${day}-export`}
                  data-export-card
                  ref={(el) => {
                    dayRefs.current[Number(day)] = el;
                  }}
                  className={ibmMono.className}
                  style={{
                    backgroundColor: bgColor,
                    color: textColor,
                    padding: "32px",
                    width: "800px",
                    boxSizing: "border-box",
                    border: "none",
                    outline: "none"
                  }}
                >
                  <h2
                    className={gupter.className}
                    style={{
                      color: headingColor,
                      fontSize: "48px",
                      fontWeight: "bold",
                      marginBottom: "24px",
                      textAlign: "center",
                      border: "none",
                      outline: "none"
                    }}
                  >
                    day {day}
                  </h2>

                  <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                    {events.map((event: any, idx: number) => (
                      <div
                        key={idx}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: "12px",
                          padding: "16px",
                          backgroundColor: cardBgColor,
                          borderRadius: "8px",
                          border: "none",
                          outline: "none"
                        }}
                      >
                        {/* tribute avatars */}
                        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "12px" }}>
                          {Object.values(event.roles).map((tributeId: any) => {
                            const tribute: Tribute | undefined = db.tributes[tributeId as string];
                            if (!tribute) return null;
                            return (
                              <div
                                key={tribute.id}
                                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}
                              >
                                <div
                                  style={{
                                    width: "64px",
                                    height: "64px",
                                    borderRadius: "50%",
                                    overflow: "hidden",
                                    backgroundColor: avatarBgColor,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    border: "none",
                                    outline: "none"
                                  }}
                                >
                                  {tribute.image ? (
                                    <img
                                      src={tribute.image}
                                      alt={tribute.name}
                                      style={{ width: "100%", height: "100%", objectFit: "cover", border: "none" }}
                                    />
                                  ) : (
                                    <span style={{ fontSize: "18px", color: mutedTextColor, fontWeight: "500", border: "none" }}>
                                      {tribute.name[0] || "?"}
                                    </span>
                                  )}
                                </div>
                                <span style={{ fontSize: "12px", fontWeight: "500", color: mutedTextColor, border: "none" }}>
                                  {tribute.name || "Unknown"}
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        {/* event description */}
                        <p
                          style={{
                            textAlign: "center",
                            fontSize: "18px",
                            lineHeight: "1.6",
                            color: textColor,
                            border: "none",
                            outline: "none"
                          }}
                        >
                          {event.description.map((part: any, i: number) => {
                            if (typeof part === "string") return part;
                            const tribute = db.tributes[event.roles[part.role]];
                            if (!tribute) return null;
                            const [first, ...rest] = part.prop.split(".");
                            let value: any = (tribute as any)[first];
                            for (const key of rest) value = value?.[key];
                            return <span key={i}>{value}</span>;
                          })}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

          </div>
  );
}
