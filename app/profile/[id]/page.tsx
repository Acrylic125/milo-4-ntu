import { ProfileDetail } from "@/components/profile-detail";

type ProfilePageProps = {
  params: Promise<{ id: string }>;
};

//export default async function ProfilePage({ params }: ProfilePageProps) {
  //const { id } = await params;
  //return <ProfileDetail profileId={id} />;
//}
export default async function ProfilePage({ params }: ProfilePageProps) {
  const { id } = await params;
  return <ProfileDetail profileId={id} />;}