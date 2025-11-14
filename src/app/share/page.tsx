"use client";

import { useEffect, useState, useRef } from "react";
import { setupDatabase, type HngrDB, type Tribute } from "@/lib/setup";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Gupter, IBM_Plex_Mono } from "next/font/google";
import {
  Copy,
  Download,
  Share2,
  Check,
  Upload,
  FileJson,
  Image as ImageIcon,
  Loader2,
  Sun,
  Moon
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// @ts-ignore - dom-to-image-more doesn't have TypeScript definitions
import domtoimage from "dom-to-image-more";

const gupter = Gupter({ weight: "400", subsets: ["latin"] });
const ibmMono = IBM_Plex_Mono({ weight: ["400", "500", "700"], subsets: ["latin"] });

export default function SharePage() {
  const [db, setDb] = useState<HngrDB | null>(null);
  const [copied, setCopied] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [exportingAll, setExportingAll] = useState(false);
  const [exportTheme, setExportTheme] = useState<"light" | "dark">("light");
  const [selectedDay, setSelectedDay] = useState<string>("");
  const dayRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

  useEffect(() => {
    const database = setupDatabase();
    setDb(database);
  }, []);

  const exportData = () => {
    if (!db) return;

    const dataStr = JSON.stringify(db, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `hngr-data-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = async () => {
    if (!db) return;

    try {
      const dataStr = JSON.stringify(db, null, 2);
      await navigator.clipboard.writeText(dataStr);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const importedData = JSON.parse(content);

        // Basic validation
        if (!importedData.tributes || !importedData.tributeReferralName) {
          setImportError("Invalid data format");
          return;
        }

        // Save to localStorage and update state
        localStorage.setItem("hngr-db", JSON.stringify(importedData));
        setDb(importedData);
        setImportError(null);
      } catch (err) {
        setImportError("Failed to parse JSON file");
        console.error(err);
      }
    };
    reader.readAsText(file);
  };

  const getTributeCount = () => {
    if (!db) return 0;
    return Object.values(db.tributes).filter(t => t.name).length;
  };

  const getEventCount = () => {
    if (!db) return 0;
    return Object.values(db.events).flat().length;
  };

  const exportDayAsPNG = async (day: number) => {
    const element = dayRefs.current[day];
    if (!element) return;

    try {
      // Use dom-to-image-more with filter to remove problematic styles
      const blob = await domtoimage.toBlob(element, {
        width: 800 * 2,
        height: element.scrollHeight * 2,
        style: {
          transform: 'scale(2)',
          transformOrigin: 'top left',
          width: '800px',
          height: element.scrollHeight + 'px'
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

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `hngr-day-${day}-${exportTheme}.png`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export PNG:", error);
    }
  };

  const exportAllDaysAsPNG = async () => {
    if (!db) return;
    setExportingAll(true);

    const days = Object.keys(db.events).map(Number).sort((a, b) => a - b);

    for (const day of days) {
      await exportDayAsPNG(day);
      // Small delay between exports
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    setExportingAll(false);
  };

  return (
    <div className="w-full flex flex-col gap-3">
      <div className="bg-gradient-to-b from-base-100 via-base-100 text-center justify-center content-center items-center to-sidebar-accent border-b-2 border-border min-h-40 w-full">
        <h1 className={`${gupter.className} text-7xl`}>share</h1>
      </div>

      <div className="text-center flex flex-col p-6 justify-center gap-6 max-w-2xl mx-auto w-full">
        {/* Data Overview */}
        <Card className="p-6">
          <h2 className="text-2xl font-semibold mb-4">your data</h2>
          {db ? (
            <div className="grid grid-cols-2 gap-4 text-left">
              <div className="flex flex-col gap-1">
                <span className="text-sm text-muted-foreground">
                  {db.tributeReferralName.plural}
                </span>
                <span className="text-3xl font-bold">{getTributeCount()}/24</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-sm text-muted-foreground">events</span>
                <span className="text-3xl font-bold">{getEventCount()}</span>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">loading...</p>
          )}
        </Card>

        {/* Export Section */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Share2 className="w-5 h-5" />
            <h2 className="text-xl font-semibold">export data</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            export your {db?.tributeReferralName.plural || "data"} and events to share with others or backup your progress
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={exportData}
              disabled={!db}
              className="flex-1 gap-2"
            >
              <Download className="w-4 h-4" />
              download json
            </Button>

            <Button
              onClick={copyToClipboard}
              disabled={!db}
              variant="outline"
              className="flex-1 gap-2"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  copy to clipboard
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* Import Section */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Upload className="w-5 h-5" />
            <h2 className="text-xl font-semibold">import data</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            import data from a JSON file. this will replace your current data.
          </p>

          <label htmlFor="file-upload">
            <Button
              variant="secondary"
              className="w-full gap-2 cursor-pointer"
              asChild
            >
              <span>
                <FileJson className="w-4 h-4" />
                choose file
              </span>
            </Button>
            <input
              id="file-upload"
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
          </label>

          {importError && (
            <p className="text-sm text-destructive mt-3">{importError}</p>
          )}
        </Card>

        {/* PNG Export Section */}
        {db && Object.keys(db.events).length > 0 && (
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <ImageIcon className="w-5 h-5" />
              <h2 className="text-xl font-semibold">export as images</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              export each day's events as PNG images to share on social media
            </p>

            {/* Theme Toggle */}
            <div className="flex items-center gap-3 mb-6">
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

            <Button
              onClick={exportAllDaysAsPNG}
              disabled={exportingAll}
              className="w-full gap-2 mb-4"
            >
              {exportingAll ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  exporting all days...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  download all days as PNG
                </>
              )}
            </Button>

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
                    {Object.keys(db.events)
                      .map(Number)
                      .sort((a, b) => a - b)
                      .map((day) => (
                        <SelectItem key={day} value={String(day)}>
                          day {day}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
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
            {Object.entries(db.events).map(([day, events]) => {
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
