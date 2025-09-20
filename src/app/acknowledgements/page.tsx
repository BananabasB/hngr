import { BowArrow } from "lucide-react";
import { Gupter } from "next/font/google";

const gupter = Gupter({ weight: "400", subsets: ["latin"] });

export default function About() {
  return (
    <div className="items-center gap-3 content-center flex flex-col justify-center text-center h-full">
      <div className="md:max-w-2/3 gap-3 flex flex-col text-center justify-center">
        <h1 className={`${gupter.className} text-7xl font-stretch-75%`}>
          acknowledgements
        </h1>
        <p>
          at hngr, we love open source. not only that but we admit that we
          couldn't've brought you such a great project without relying on some
          incredible other ones.
        </p>
        <p>
          thank you to <b>vercel</b> - this project is probably using that
          online and your webhosting service is amazing!
        </p>
        <p>
          <b>tailwindcss</b> is basically the foundation of the modern web, but
          tbh we still take it for granted. we love you guys :)
        </p>
        <p>
          also, we wouldn't have this beautiful sidebar without <b>shadcn/ui</b>
          ! you have helped us so much with making our website look nice too.
        </p>
        <p>and yes, we <i>suck</i> at logic coding - so we'd like to thank our friend <b>chatGPT</b> for being good at coding.</p>
      </div>
    </div>
  );
}
