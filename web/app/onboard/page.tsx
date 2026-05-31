import { redirect } from "next/navigation";

import { getCurrentProfileIdForUser } from "@/lib/current-profile";
import { getSession } from "@/lib/session";
import { OnboardForm } from "@/components/onboard-form";

export default async function Onboard() {
  const session = await getSession();
  const currentProfileId = await getCurrentProfileIdForUser(session?.user);

  if (currentProfileId) {
    redirect("/");
  }

  return (
    <div className="flex flex-col items-center w-full">
      <div className="w-full h-full flex flex-col items-center max-w-7xl py-8 md:py-12 lg:py-16 px-8">
        <OnboardForm />
      </div>
    </div>
  );
}
