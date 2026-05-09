import { Avatar, AvatarFallback, AvatarImage } from "@radix-ui/react-avatar";
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
import { useAppState } from "@/lib/state-context-refactored";
import { HngrDB, Tribute } from "@/lib/setup";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { PencilLine, Upload } from "lucide-react";
import { Textarea } from "./ui/textarea";
import { autocompletePronouns } from "@/lib/pronoun-autocomplete";
import { Gupter } from "next/font/google";

const gupter = Gupter({ weight: "400", subsets: ["latin"] });

type Props = {
  tributes: Record<string, Tribute>; // { id: Tribute, ... }
};

export function DistrictTributes({ tributes }: Props) {
  // Get unique districts from tributes
  const districts = Array.from(
    new Set(Object.values(tributes).map((t) => t.district))
  );

  return (
    <div className="flex flex-col gap-6">
      {districts.map((district) => {
        const people = Object.values(tributes).filter(
          (t) => t.district === district
        );
        return (
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
                      src={t.image ?? undefined}
                      className="object-cover rounded-md w-full h-full"
                    />
                    <AvatarFallback className="w-full h-full flex items-center justify-center text-sm">
                      no image
                    </AvatarFallback>
                  </Avatar>
                  <span>{t.name || "no name"}</span>
                  <span className="text-gray-500">
                    {t.pronouns
                      ? `${t.pronouns.subject}/${t.pronouns.object}/${t.pronouns.possessive}/${t.pronouns.reflexive}`
                      : "no pronouns"}
                  </span>
                  <p className="text-sm text-muted-foreground text-center max-w-sm px-2">
                    {t.bio?.trim() ? t.bio : "no bio yet"}
                  </p>
                  <EditTribute id={t.id} />
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

export function EditTribute({ id }: { id: string }) {
  const { db, setDb } = useAppState();
  const singular = db?.tributeReferralName.singular ?? "tribute";

  // Find the tribute object directly by id
  const tribute = db?.tributes[id];

  // Extract initial state values from the tribute, with fallbacks
  const initialName = tribute?.name ?? "";
  const initialImage = tribute?.image ?? "";
  const initialBio = tribute?.bio ?? "";
  // Initialize pronouns with existing values or defaults
  const initialPronouns = tribute?.pronouns ? {
    subject: tribute.pronouns.subject ?? "",
    object: tribute.pronouns.object ?? "",
    possessive: tribute.pronouns.possessive ?? "",
    reflexive: tribute.pronouns.reflexive ?? "",
  } : {
    subject: "",
    object: "",
    possessive: "",
    reflexive: "",
  };

  // local draft state, prefilled with tribute values
  const [draftImage, setDraftImage] = React.useState(initialImage);
  const [draftName, setDraftName] = React.useState(initialName);
  const [draftPronouns, setDraftPronouns] = React.useState(initialPronouns);
  const [draftBio, setDraftBio] = React.useState(initialBio);

  function handlePronounAutocomplete(value: string, field: keyof typeof draftPronouns) {
    // Update the current field
    setDraftPronouns((p) => ({ ...p, [field]: value }));
    
    // Try to autocomplete if this is the subject field
    if (field === 'subject') {
      const autocompleteResult = autocompletePronouns(value);
      if (autocompleteResult) {
        setDraftPronouns(autocompleteResult);
      }
    }
  }

  function handleSave() {
    if (!db || !setDb) return;

    const updatedDb: HngrDB = { 
      ...db,
      tributes: { ...db.tributes }
    };
    const t = updatedDb.tributes[id];
    if (t) {
      t.name = draftName;
      t.image = draftImage;
      t.pronouns = draftPronouns;
      t.bio = draftBio;
    }

    console.log("all tributes", updatedDb.tributes);
    console.log("count", Object.keys(updatedDb.tributes).length);

    setDb(updatedDb);
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>
          <PencilLine></PencilLine>edit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>{`change ${singular} data`}</DialogTitle>
        <div className="gap-3 flex flex-col">
          <div className="flex flex-col w-full items-center gap-3">
            <Label htmlFor="picture" className="sr-only">
              Picture
            </Label>
            <div
              onClick={() => document.getElementById("picture")?.click()}
              className="cursor-pointer relative group"
            >
              <Avatar className="w-32 h-32 rounded-md">
                <AvatarImage
                  src={draftImage || undefined}
                  className="object-cover rounded-md w-full h-full"
                />
                <AvatarFallback className="w-full h-full flex items-center justify-center text-sm hover:bg-gray-100 transition">
                  click to upload
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 bg-black/50 flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity rounded-md flex items-center justify-center">
                <Upload className="stroke-white" />
                <span className="text-white text-sm text-center px-2">
                  drag photos here or upload
                </span>
              </div>
            </div>
            <Input
              id="picture"
              type="file"
              className="hidden"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files && e.target.files[0];
                if (!file) return;
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

          <Input
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            placeholder="enter a name..."
            className={`text-center h-fit !text-5xl ${gupter.className}`}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <Input
              value={draftPronouns.subject}
              onChange={(e) =>
                handlePronounAutocomplete(e.target.value, 'subject')
              }
              placeholder="they"
            />
            <Input
              value={draftPronouns.object}
              onChange={(e) =>
                handlePronounAutocomplete(e.target.value, 'object')
              }
              placeholder="them"
            />
            <Input
              value={draftPronouns.possessive}
              onChange={(e) =>
                handlePronounAutocomplete(e.target.value, 'possessive')
              }
              placeholder="their"
            />
            <Input
              value={draftPronouns.reflexive}
              onChange={(e) =>
                handlePronounAutocomplete(e.target.value, 'reflexive')
              }
              placeholder="theirs"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor={`bio-${id}`}>bio</Label>
            <Textarea
              id={`bio-${id}`}
              value={draftBio}
              onChange={(e) => setDraftBio(e.target.value)}
              placeholder="who is this tribute?"
              rows={4}
            />
          </div>
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
