import { auth } from "@/lib/auth";
import { mongo } from "@/src/db";

const Users = mongo.collection("users");

export async function getAuthUser() {
  const session = await auth.api.getSession({
    headers: new Headers(),
  });

  if (!session?.user) {
    return null;
  }

  const email = session.user.email;
  if (!email) {
    return null;
  }

  const user = { ...session.user, ...(await Users.findOne({ email })) };

  // TODO: move this into .env file, it's public anyway
  user.admin ||= email.endsWith("@comfy.org");
  user.admin ||= email.endsWith("@drip.art"); // legacy domain

  return user;
}
