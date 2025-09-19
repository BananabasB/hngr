import { Gupter } from "next/font/google";

const gupter = Gupter({ weight: "400", subsets: ["latin"] });

export default function About() {
  return (
    <div className="items-center content-center text-center h-full"><h1 className={`${gupter.className} text-7xl font-stretch-75%`}>hngr</h1></div>
    
  );
}