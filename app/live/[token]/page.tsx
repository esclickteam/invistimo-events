import LiveScratchExperience from "./LiveScratchExperience";

export const dynamic = "force-dynamic";

export default async function LiveWeddingChallengesPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <LiveScratchExperience token={token} />;
}
