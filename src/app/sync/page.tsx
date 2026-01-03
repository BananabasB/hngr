"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Download, Upload, FileJson, Copy, Check, Loader2 } from "lucide-react";
import { useAppState } from "@/lib/state-context";
import { isUserInUK, getUserGeolocation } from "@/lib/geolocation";
import Link from "next/link";
import { useState } from "react";

export default function SyncPage() {
  const { db, setDb } = useAppState();
  
  // Import/Export states
  const [copied, setCopied] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [brantSteeleCode, setBrantSteeleCode] = useState("");
  const [importingBrantSteele, setImportingBrantSteele] = useState(false);
  const [showImgurWarning, setShowImgurWarning] = useState(false);
  const [imgurTributes, setImgurTributes] = useState<string[]>([]);
  const [userLocation, setUserLocation] = useState<string>("");

  // Import/Export functions
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

  const importFromBrantSteele = async () => {
    if (!brantSteeleCode.trim()) return;
    
    setImportingBrantSteele(true);
    setImportError(null);
    
    try {
      const code = brantSteeleCode.includes('://') 
        ? new URL(brantSteeleCode).searchParams.get('c') 
        : brantSteeleCode.trim();
      
      if (!code) {
        throw new Error('Invalid BrantSteele URL or code format');
      }

      const response = await fetch('/api/brantsteele-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch data from BrantSteele');
      }
      
      const { data: brantSteeleData } = await response.json();
      const hngrData = await convertBrantSteeleToHngr(brantSteeleData);
      
      localStorage.setItem("hngr-db", JSON.stringify(hngrData));
      setDb(hngrData);
      setBrantSteeleCode("");
      setImportError(null);
    } catch (error) {
      console.error('Failed to import from BrantSteele:', error);
      setImportError(error instanceof Error ? error.message : 'Failed to import from BrantSteele');
    } finally {
      setImportingBrantSteele(false);
    }
  };

  const convertBrantSteeleToHngr = async (brantData: any) => {
    const hngrData: any = {
      tributes: {} as Record<string, any>,
      events: {},
      tributeReferralName: {
        singular: "tribute",
        plural: "tributes"
      },
      metadata: {
        importedFrom: 'brantsteele',
        importedAt: new Date().toISOString(),
        originalData: brantData
      }
    };

    if (brantData.tributes) {
      const imgurTributeNames: string[] = [];
      
      brantData.tributes.forEach((tribute: any, index: number) => {
        const tributeId = `tribute_${index + 1}`;
        
        if (tribute.image && tribute.image.includes('imgur.com')) {
          imgurTributeNames.push(tribute.name || `Tribute ${index + 1}`);
        }
        
        const getPronouns = (isMale: boolean) => {
          if (isMale) {
            return {
              subject: "he",
              object: "him",
              possessive: "his", 
              reflexive: "himself"
            };
          } else {
            return {
              subject: "she",
              object: "her",
              possessive: "her",
              reflexive: "herself"
            };
          }
        };
        
        hngrData.tributes[tributeId] = {
          id: tributeId,
          name: tribute.name || `Tribute ${index + 1}`,
          pronouns: tribute.pronouns || getPronouns(index % 2 === 0),
          image: tribute.image || null,
          bio: tribute.bio || "",
          district: tribute.district || Math.floor(Math.random() * 12) + 1,
          health: { physical: 100, mental: 100 },
          foodLvl: 5,
          relationships: {},
          ...(tribute.gender && { gender: tribute.gender }),
          ...(tribute.skills && { skills: tribute.skills })
        };
      });
      
      if (imgurTributeNames.length > 0) {
        const isUK = await isUserInUK();
        if (isUK) {
          const geo = await getUserGeolocation();
          setUserLocation(geo.country || 'United Kingdom');
          setImgurTributes(imgurTributeNames);
          setShowImgurWarning(true);
        }
      }
    }

    const allTributeIds = Object.keys(hngrData.tributes);
    allTributeIds.forEach(id1 => {
      allTributeIds.forEach(id2 => {
        if (id1 !== id2) {
          hngrData.tributes[id1].relationships[id2] = { trust: 0, alliance: false };
        }
      });
    });

    if (brantData.events) {
      hngrData.events = brantData.events;
    }

    return hngrData;
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">sync & import/export</h1>
        <p className="text-muted-foreground">manage your game data and imports</p>
      </div>
      
      <div className="space-y-6">
        {/* Export Section */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">export data</h2>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              export your game data to backup or share with others
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              <Button
                onClick={copyToClipboard}
                disabled={!db}
                className="gap-2"
                variant="outline"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    copied to clipboard!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    copy to clipboard
                  </>
                )}
              </Button>
              <Button
                onClick={exportData}
                disabled={!db}
                className="gap-2"
              >
                <FileJson className="w-4 h-4" />
                download as json
              </Button>
            </div>
          </div>
        </Card>

        {/* Import Section */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Upload className="w-5 h-5" />
            <h2 className="text-xl font-semibold">import from BrantSteele</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            import tribute data from BrantSteele's Hunger Games simulator. click "save" on the BrantSteele page, then paste your season code here.
          </p>
          <Alert>
            <AlertTitle>Important Note</AlertTitle>
            <AlertDescription>
              BrantSteele imports are experimental. Some data may not transfer perfectly. 
              We recommend backing up your current data before importing.
              Event data will not be imported from BrantSteele.
            </AlertDescription>
          </Alert>

          <div className="space-y-3 flex flex-col">
            <InputOTP 
              value={brantSteeleCode}
              onChange={(value) => setBrantSteeleCode(value)}
              maxLength={8}
              inputMode="text"
              className="w-full"
            >
              <InputOTPGroup className="w-full justify-center">
                <InputOTPSlot index={0} className="w-16 h-20 text-2xl" />
                <InputOTPSlot index={1} className="w-16 h-20 text-2xl" />
                <InputOTPSlot index={2} className="w-16 h-20 text-2xl" />
                <InputOTPSlot index={3} className="w-16 h-20 text-2xl" />
                <InputOTPSlot index={4} className="w-16 h-20 text-2xl" />
                <InputOTPSlot index={5} className="w-16 h-20 text-2xl" />
                <InputOTPSlot index={6} className="w-16 h-20 text-2xl" />
                <InputOTPSlot index={7} className="w-16 h-20 text-2xl" />
              </InputOTPGroup>
            </InputOTP>
            
            <Button
              onClick={importFromBrantSteele}
              disabled={!brantSteeleCode.trim() || importingBrantSteele}
              className="w-full gap-2"
            >
              {importingBrantSteele ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  importing...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  import from BrantSteele
                </>
              )}
            </Button>
          </div>

          {importError && importError.includes('brantsteele') && (
            <p className="text-sm text-destructive mt-3">{importError}</p>
          )}
        </Card>
      </div>

      {/* Imgur Warning Dialog */}
      <Dialog open={showImgurWarning} onOpenChange={setShowImgurWarning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>⚠️ Imgur images detected</DialogTitle>
            <DialogDescription>
              <div className="space-y-3">
                <p>
                  <strong>important notice for {userLocation} users:</strong> Imgur is blocked in {userLocation} due to the Online Safety Act 2023.
                </p>
                <p>
                  there {imgurTributes.length === 1 ? 'is' : 'are'} {imgurTributes.length} Imgur-hosted tribute image{imgurTributes.length === 1 ? '' : 's'} in this backup that may not be visible in the UK.
                </p>
                
                <p>
                  you can still proceed with the import, but the images may not load. consider using alternative image hosts or rehosting the images if you're in {userLocation}.
                </p>
                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={() => setShowImgurWarning(false)}
                    className="flex-1"
                  >
                    continue anyway
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowImgurWarning(false)}
                  >
                    <Link href="/imgur-access">
                      learn more
                    </Link>
                  </Button>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}
