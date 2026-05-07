"use client";

import React, { useState } from "react";
import { Gupter } from "next/font/google";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { DistrictTributes } from "@/components/district-tributes";
import { Badge } from "@/components/ui/badge";
import { useAppState } from "@/lib/state-context-refactored";

const gupter = Gupter({ weight: "400", subsets: ["latin"] });

export default function Home() {
  const { db, updateReferralName, currentSeason } = useAppState();
  const [referralKey, setReferralKey] = useState("tributes");

  // Update referral key when db changes
  React.useEffect(() => {
    if (db?.tributeReferralName?.plural) {
      if (db.tributeReferralName.plural === "volunteers") {
        setReferralKey("volunteers");
      } else if (db.tributeReferralName.plural === "nominees") {
        setReferralKey("nominees");
      } else {
        setReferralKey("tributes");
      }
    }
  }, [db]);

const handleChange = (value: string) => {
  if (
    value === "tributes" ||
    value === "volunteers" ||
    value === "nominees"
  ) {
    setReferralKey(value);
    updateReferralName(value);
  }
};

  return (
    <div className="w-full flex flex-col gap-3">
      <div data-onboarding="districts" className="bg-gradient-to-b from-base-100 via-base-100 text-center justify-center content-center items-center to-sidebar-accent border-b-2 border-border min-h-40 w-full">
        <h1 className={`${gupter.className} text-7xl`}>districts</h1>
        {currentSeason && (
          <div className="flex items-center justify-center gap-2 mt-2">
            <Badge variant="outline">{currentSeason.name}</Badge>
            <Badge variant={
              currentSeason.status === 'active' ? 'default' :
              currentSeason.status === 'completed' ? 'secondary' :
              currentSeason.status === 'archived' ? 'outline' : 'outline'
            }>
              {currentSeason.status}
            </Badge>
          </div>
        )}
      </div>
      <div className="text-center flex flex-col p-3 justify-center gap-2">
        <div data-onboarding="tribute-naming" className="flex w-full  items-center content-center justify-center gap-2">
          <p>people that participate are called:</p>
          <DropdownMenu>
            <DropdownMenuTrigger className="flex cursor-pointer flex-row gap-2">
              {db ? db.tributeReferralName.plural : "loading..."}
              <ChevronDown className="w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuRadioGroup
                value={referralKey}
                onValueChange={handleChange}
              >
                <DropdownMenuRadioItem value="tributes">
                  tributes
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="volunteers">
                  volunteers
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="nominees">
                  nominees
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <br />
        <div>
          {db ? (
            <DistrictTributes tributes={db.tributes} />
          ) : (
            <p>loading...</p>
          )}
        </div>
      </div>
    </div>
  );
}
