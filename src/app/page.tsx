"use client";

import { useEffect, useState } from "react";
import { setupDatabase } from "@/lib/setup";
import { Gupter } from "next/font/google";
import { updateReferralName } from "@/lib/localStorage";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import DistrictTributes from "@/components/district-tributes";

const gupter = Gupter({ weight: "400", subsets: ["latin"] });

export default function Home() {
  const [db, setDb] = useState<any>(null);
  const [referralKey, setReferralKey] = useState("tributes");

  useEffect(() => {
    const database = setupDatabase();
    setDb(database);
    if (database?.tributeReferralName?.plural) {
      // figure out which key matches the current db
      if (database.tributeReferralName.plural === "volunteers") {
        setReferralKey("volunteers");
      } else if (database.tributeReferralName.plural === "nominees") {
        setReferralKey("nominees");
      } else {
        setReferralKey("tributes");
      }
    }
    console.log("hngr db", database);
  }, []);

  const handleChange = (value: string) => {
    setReferralKey(value);
    updateReferralName(db, setDb, value);
  };

  return (
    <div className="w-full flex flex-col gap-3">
      <div className="bg-gradient-to-b from-stone-100 via-stone-100 text-center justify-center content-center items-center to-stone-200 border-b-2 border-b-stone-300 min-h-40 w-full">
        <h1 className={`${gupter.className} text-7xl`}>districts</h1>
      </div>
      <div className="text-center flex flex-col p-3 justify-center gap-2">
        <div className="flex w-full  items-center content-center justify-center gap-2">
          <p>people that participate are called: </p>
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
            <p>loading tributes…</p>
          )}
        </div>
      </div>
    </div>
  );
}
