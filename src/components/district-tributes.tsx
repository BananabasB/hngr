import { Avatar, AvatarFallback, AvatarImage } from "@radix-ui/react-avatar";
import { Gupter } from "next/font/google";
import React from "react";

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

export default function DistrictTributes({ tributes }: Props) {
  return (
    <div className="flex flex-col gap-6">
      {Object.entries(tributes).map(([district, people]) => (
        <div key={district} className="rounded p-4">
          <h2 className={`text-3xl font-bold mb-2 ${gupter.className}`}>district {district}</h2>
          <ul className="grid md:grid-cols-2 grid-rows-2 md:grid-rows-1 items-center gap-2">
            {people.map((t) => (
              <li key={t.id} className="flex flex-col content-center justify-center gap-2">
                <Avatar>
                  <AvatarImage src={t.image} />
                  <AvatarFallback>No Image</AvatarFallback>
                </Avatar>
                <span>{t.name}</span>
                <span className="text-gray-500">({t.pronouns.join("/")})</span>
                <a
                  href={`/edit/${t.id}`}
                  className="=text-blue-500 underline"
                >
                  edit
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}