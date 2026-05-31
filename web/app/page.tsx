import { GetStarted } from "@/components/get-started";
import { HomePage } from "@/components/home-page";
import { getCurrentProfileIdForUser } from "@/lib/current-profile";
import { getSession } from "@/lib/session";
import Image from "next/image";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await getSession();
  const currentProfileId = await getCurrentProfileIdForUser(session?.user);

  if (session?.user && !currentProfileId) {
    redirect("/onboard");
  }

  if (currentProfileId) {
    return <HomePage />;
  }

  return (
    <div className="flex flex-col items-center w-full">
      <div className="flex flex-col lg:flex-row w-full max-w-ui lg:h-[calc(100svh-3.5rem)] py-8 gap-8">
        <div className="flex-2 flex flex-col gap-4 md:gap-6 justify-center px-8">
          <h1 className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl 2xl:text-9xl font-bold text-center lg:text-left">
            MILO <br />
            FOR NTU
          </h1>
          <div className="flex justify-center lg:justify-start">
            <GetStarted
              className="w-fit h-fit md:h-fit py-2 px-4 lg:py-4 lg:px-6 text-xl"
              size="lg"
            />
          </div>
        </div>
        <div className="flex-3 h-full flex flex-col justify-center px-8 relative min-h-72">
          <Image
            src="/hero-dark.png"
            alt="Milo for NTU"
            fill
            className="object-contain hidden dark:block"
          />
          <Image
            src="/hero-light.png"
            alt="Milo for NTU"
            fill
            className="object-contain dark:hidden"
          />
        </div>
      </div>
    </div>
  );
}
