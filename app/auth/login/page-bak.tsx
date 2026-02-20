"use server";

import { signIn } from "@/app/api/auth/[...nextauth]/auth";
import { FcGoogle } from "react-icons/fc";

/**
 *
 * @author: snomiao <snomiao@gmail.com>
 */
export default async function LoginPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="login-container bg-white p-8 rounded-lg shadow-md w-96">
        <h1 className="text-2xl font-bold mb-6 text-center">Login</h1>
        <div className="space-y-4">
          <button
            onClick={async () => {
              "use server";
              await signIn("google");
            }}
            className="google-login-button flex items-center justify-center w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white hover:bg-gray-50 transition-colors"
          >
            <FcGoogle className="w-5 h-5 mr-2" />
            <span>Login with Google</span>
          </button>
        </div>
      </div>
    </div>
  );
}
