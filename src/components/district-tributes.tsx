import { Avatar, AvatarFallback, AvatarImage } from "@radix-ui/react-avatar";
import { Gupter } from "next/font/google";
import React from "react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { load } from "@/lib/localStorage";
import { HngrDB } from "@/lib/setup";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { PencilLine } from "lucide-react";
const gupter = Gupter({ weight: "400", subsets: ["latin"] });

type Tribute = {
  id: number;
  name: string;
  pronouns: string[];
  image: string; // image URL
};

type Props = {
  tributes: Record<number, Tribute[]>; // { 1: [...], 2: [...], ... }
};

export function DistrictTributes({ tributes }: Props) {
  return (
    <div className="flex flex-col gap-6">
      {Object.entries(tributes).map(([district, people]) => (
        <div key={district} className="rounded p-4">
          <h2 className={`text-3xl font-bold mb-2 ${gupter.className}`}>
            district {district}
          </h2>
          <ul className="grid md:grid-cols-2 grid-rows-2 md:grid-rows-1 items-center gap-2">
            {people.map((t) => (
              <li
                key={t.id}
                className="flex flex-col items-center justify-center gap-2"
              >
                <Avatar className="w-32 h-32 rounded-md">
                  <AvatarImage
                    src={t.image}
                    className="object-cover rounded-md w-full h-full"
                  />
                  <AvatarFallback className="w-full h-full flex items-center justify-center text-sm">
                    no image
                  </AvatarFallback>
                </Avatar>
                <span>{t.name || "no name"}</span>
                <span className="text-gray-500">
                  (
                  {(() => {
                    // If t.pronouns is not present, fallback
                    if (!t.pronouns) return "no pronouns";
                    // If it's an array
                    if (Array.isArray(t.pronouns)) {
                      const joined = t.pronouns.filter(Boolean).join("/");
                      return joined || "no pronouns";
                    }
                    // If it's an object, join subject/object/determiner/pronoun
                    if (typeof t.pronouns === "object" && t.pronouns !== null) {
                      const keys = ["subject", "object", "determiner", "pronoun"];
                      const pronounsObj = t.pronouns as Record<string, string>;
                      const values = keys.map((k) => pronounsObj[k]).filter(Boolean);
                      const joined = values.join("/");
                      return joined || "no pronouns";
                    }
                    // Fallback
                    return "no pronouns";
                  })()}
                  )
                </span>
                <EditTribute id={t.id.toString()} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function EditTribute({ id }: { id: string }) {
  const db = load<HngrDB>("hngr-db");
  const singular = db?.tributeReferralName.singular ?? "tribute";

  // Find the tribute object from all districts
  let tribute: any = null;
  if (db && db.tributes) {
    for (const district of Object.values(db.tributes)) {
      const found = (district as any[]).find((t) => t.id.toString() === id);
      if (found) {
        tribute = found;
        break;
      }
    }
  }

  // Extract initial state values from the tribute, with fallbacks
  const initialName = tribute?.name ?? "";
  const initialImage = tribute?.image ?? "";
  // Map pronouns array/object to {subject, object, determiner, pronoun}
  let initialPronouns = { subject: "", object: "", determiner: "", pronoun: "" };
  if (tribute?.pronouns) {
    if (Array.isArray(tribute.pronouns)) {
      // If it's an array, map by index
      initialPronouns = {
        subject: tribute.pronouns[0] ?? "",
        object: tribute.pronouns[1] ?? "",
        determiner: tribute.pronouns[2] ?? "",
        pronoun: tribute.pronouns[3] ?? "",
      };
    } else if (
      typeof tribute.pronouns === "object" &&
      tribute.pronouns !== null
    ) {
      // If it's an object, use keys
      initialPronouns = {
        subject: tribute.pronouns.subject ?? "",
        object: tribute.pronouns.object ?? "",
        determiner: tribute.pronouns.determiner ?? "",
        pronoun: tribute.pronouns.pronoun ?? "",
      };
    }
  }

  // local draft state, prefilled with tribute values
  const [draftImage, setDraftImage] = React.useState(initialImage);
  const [draftName, setDraftName] = React.useState(initialName);
  const [draftPronouns, setDraftPronouns] = React.useState(initialPronouns);

  function handleSave() {
    if (!db) return;

    for (const district of Object.values(db.tributes)) {
      const t = (district as any[]).find((t) => t.id.toString() === id);
      if (t) {
        t.name = draftName;
        t.image = draftImage;
        t.pronouns = draftPronouns;
        break;
      }
    }

    localStorage.setItem("hngr-db", JSON.stringify(db));
    window.location.reload();
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button><PencilLine></PencilLine>edit</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>{`change ${singular} data`}</DialogTitle>
        <div className="gap-3 flex flex-col">
          <div className="grid w-full max-w-sm items-center gap-3">
            <Label htmlFor="picture">Picture</Label>
            <Input
              id="picture"
              type="file"
              className="w-full flex"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files && e.target.files[0];
                if (!file) return;
                // Read file
                const reader = new FileReader();
                reader.onload = async (ev) => {
                  const img = new window.Image();
                  img.onload = () => {
                    const canvas = document.createElement("canvas");
                    const maxDim = 200;
                    let width = img.width;
                    let height = img.height;
                    if (width > height) {
                      if (width > maxDim) {
                        height = Math.round((height * maxDim) / width);
                        width = maxDim;
                      }
                    } else {
                      if (height > maxDim) {
                        width = Math.round((width * maxDim) / height);
                        height = maxDim;
                      }
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext("2d");
                    if (ctx) {
                      ctx.drawImage(img, 0, 0, width, height);
                      const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
                      setDraftImage(dataUrl);
                    }
                  };
                  img.src = ev.target?.result as string;
                };
                reader.readAsDataURL(file);
              }}
            />
          </div>
          {/* Also allow fallback to URL for power users */}

          <Input
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            placeholder="enter a name..."
          />

          <Input
            value={draftPronouns.subject}
            onChange={(e) =>
              setDraftPronouns((p) => ({ ...p, subject: e.target.value }))
            }
            placeholder="they"
          />
          <Input
            value={draftPronouns.object}
            onChange={(e) =>
              setDraftPronouns((p) => ({ ...p, object: e.target.value }))
            }
            placeholder="them"
          />
          <Input
            value={draftPronouns.determiner}
            onChange={(e) =>
              setDraftPronouns((p) => ({ ...p, determiner: e.target.value }))
            }
            placeholder="their"
          />
          <Input
            value={draftPronouns.pronoun}
            onChange={(e) =>
              setDraftPronouns((p) => ({ ...p, pronoun: e.target.value }))
            }
            placeholder="theirs"
          />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button onClick={handleSave}>done</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
