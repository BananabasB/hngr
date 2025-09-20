import React from "react";

type Tribute = {
  id: number;
  name: string;
  pronouns: string[];
};

type Props = {
  tributes: Record<number, Tribute[]>; // { 1: [...], 2: [...], ... }
};

export default function DistrictTributes({ tributes }: Props) {
  return (
    <div className="flex flex-col gap-6">
      {Object.entries(tributes).map(([district, people]) => (
        <div key={district} className="border rounded p-4">
          <h2 className="text-xl font-bold mb-2">District {district}</h2>
          <ul className="flex flex-col gap-2">
            {people.map((t) => (
              <li key={t.id} className="flex items-center gap-2">
                <span>{t.name}</span>
                <span className="text-gray-500">({t.pronouns.join("/")})</span>
                <a
                  href={`/edit/${t.id}`}
                  className="ml-auto text-blue-500 underline"
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