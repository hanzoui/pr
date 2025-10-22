import { auth } from "@/lib/auth";
import { mongo } from "@/src/db";
import { headers as getHeaders } from "next/headers";

const Users = mongo.collection("users");

export async function getAuthUser() {
  const session = await auth.api.getSession({
    headers: await getHeaders(),
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
