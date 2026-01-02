"use client"
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ImgurOsaAccessWarning() {
  const router = useRouter();
  
  return (
    <div className="flex flex-col gap-4 p-3 items-start">
        <Button variant="ghost" onClick={() => router.back()}><ArrowLeftIcon />back</Button>
      <h1 className="text-4xl font-bold">about Imgur access in the UK</h1>
      <p className="text-md">
        Imgur has withdrawn its service from the United Kingdom due to the
        Online Safety Act 2023.
      </p>
      <p>
        as a result, hngr may not be able to access certain imported data from
        BrantSteele that contains images hosted on Imgur.
      </p>
      <p className="text-md">
        if you have any tributes with images from Imgur, you will need to
        replace them with images from another source.
      </p>
      <p className="text-md">
        as a service there is nothing we can do to resolve this issue. we're sorry for any inconvenience this may cause.
      </p>
    </div>
  );
}
