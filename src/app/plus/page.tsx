import { Gupter } from "next/font/google";

const gupter = Gupter({ weight: "400", subsets: ["latin"] });

export default function HngrPlusPage() {
    return (
        <div>
            <div className="bg-gradient-to-b from-base-100 via-base-100 text-center justify-center content-center items-center to-sidebar-accent border-b-2 border-border min-h-40 w-full">
        <h1 className={`${gupter.className} text-3xl`}>take your experience further</h1>
        <p>with hngr+, you can easily remove hngr branding from your exports, as well as </p>
      </div>
        </div>
    )
}