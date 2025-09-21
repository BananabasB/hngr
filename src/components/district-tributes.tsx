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
                  ({t.pronouns.join("/") || "no pronouns"})
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
  const [image, setImage] = React.useState("");
  const [name, setName] = React.useState("");
  const [pronouns, setPronouns] = React.useState({
    subject: "",
    object: "",
    determiner: "",
    pronoun: "",
  });

  const db = load<HngrDB>("hngr-db");
  const singular = db?.tributeReferralName.singular ?? "tribute";

  function handleSave() {
    if (!db) return;
    // find tribute by id
    for (const district of Object.values(db.tributes)) {
      const tribute = (district as any[]).find(t => t.id.toString() === id);
      if (tribute) {
        tribute.name = name;
        tribute.image = image;
        tribute.pronouns = pronouns;
        break;
      }
    }
    localStorage.setItem("hngr-db", JSON.stringify(db));
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>edit</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>{`change ${singular} data`}</DialogTitle>
        <div className="gap-3 flex flex-col">
          <div className="flex flex-col gap-2">
            <Label htmlFor="imageURLInput" className="opacity-40">image</Label>
            <Input value={image} onChange={e => setImage(e.target.value)} id="imageURLInput" placeholder="enter an image URL..." />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="nameInput" className="opacity-40">name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} id="nameInput" placeholder="enter a name..." />
          </div>

          <div className="flex flex-col gap-2">
  <Label className="opacity-40">pronouns</Label>
  <div className="grid grid-cols-2 gap-2">
    <div>
      <Label htmlFor="pronounSubject" className="text-xs opacity-70">subject (“he is cool”)</Label>
      <Input id="pronounSubject" placeholder="he" />
    </div>
    <div>
      <Label htmlFor="pronounObject" className="text-xs opacity-70">object (“i like him”)</Label>
      <Input id="pronounObject" placeholder="him" />
    </div>
    <div>
      <Label htmlFor="pronounDeterminer" className="text-xs opacity-70">possessive determiner (“i want his computer”)</Label>
      <Input id="pronounDeterminer" placeholder="his" />
    </div>
    <div>
      <Label htmlFor="pronounPronoun" className="text-xs opacity-70">possessive pronoun (“that computer is his”)</Label>
      <Input id="pronounPronoun" placeholder="his" />
    </div>
  </div>
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
