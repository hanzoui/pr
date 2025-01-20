import { CNRepos } from "@/src/CNRepos";
import sflow from "sflow";
export const runtime='node' 
if (import.meta.main) {
  // await repoFlow().log().run();
}
function repoFlow() {
  return sflow(
    CNRepos.find({}).sort({ _id: 1 }).project({
      repository: 1,
      "crPulls.state": 1,
      "crPulls.data.type": 1,
      "crPulls.data.pull.html_url": 1,
      "crPulls.data.pull.user.login": 1,
      "crPulls.error": 1,
      "cr._id": 1,
      "cm._id": 1,
    }),
  );
}

export const GET = async (req: Request) => {
  return new Response(
    await repoFlow()
      .map((e) => JSON.stringify(e))
      .join("\n")
      .by(new TextEncoderStream())
      .text()
      ,
  );
};
