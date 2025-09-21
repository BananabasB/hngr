import { BowArrow, CircleQuestionMark } from "lucide-react";
import { Gupter } from "next/font/google";

const gupter = Gupter({ weight: "400", subsets: ["latin"] });

export default function About() {
  return (
    <div className="items-center gap-3 content-center flex flex-col justify-center text-center h-full">
      <div className="md:max-w-1/2 gap-3 flex flex-col text-center justify-center">
      <CircleQuestionMark className="flex mx-auto"></CircleQuestionMark>
      <h1 className={`${gupter.className} text-7xl font-stretch-75%`}>404</h1>
      <p className="opacity-30">which means not found</p>
      <p>sorry, the page you clicked on isn't here.</p>
      </div>
    </div>
  );
}
