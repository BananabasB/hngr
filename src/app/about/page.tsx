import { BowArrow } from "lucide-react";
import { Gupter } from "next/font/google";
import { OnboardingDemo } from "@/components/onboarding-demo";

const gupter = Gupter({ weight: "400", subsets: ["latin"] });

export default function About() {
  return (
    <div className="container mx-auto min-h-screen flex p-6 max-w-4xl">
      <div className="items-center gap-3 content-center flex flex-col justify-center text-center mb-8">
        <div className="md:max-w-1/2 gap-3 flex flex-col text-center justify-center">
          <BowArrow className="flex mx-auto"></BowArrow>
          <h1 className={`${gupter.className} text-7xl font-stretch-75%`}>hngr</h1>
          <p className="opacity-30">{`commit ${process.env.NEXT_PUBLIC_COMMIT_HASH}`} • <a href="/acknowledgements">acknowledgements</a></p>
          <p>have fun simulating survival games using your favourite characters!</p>
          <p><b>disclaimer:</b> this website was made for entertainment purposes only and any results produced are purely fiction.</p>
        </div>
      </div>
    </div>
  );
}
