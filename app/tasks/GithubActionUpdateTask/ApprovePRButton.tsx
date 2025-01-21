"use client";
import Router from "next/router";
import { useActionState, useEffect } from "react";
import { approveGithubActionUpdateTaskAction } from "./actions";

export function ApprovePRButton(e: { repo: string; branchVersionHash?: string }) {
  const [state, formAction, pending] = useActionState(approveGithubActionUpdateTaskAction, { ok: false });
  useEffect(() => {
    if (state.ok) Router.reload();
  }, [state.ok]);
  return (
    <form action={formAction} className="contents">
      <input type="hidden" name="repo" value={e.repo} />
      <input type="hidden" name="branchVersionHash" value={e.branchVersionHash} />

      <button disabled={pending || !!state.ok} tabIndex={1} className="btn" title="will perform on next run">
        {!state.ok ? (
          "Approve PR"
        ) : (
          <>
            APPROVED
            <br /> <span className="text-sm">(Reload page to update the list)</span>
          </>
        )}
      </button>
    </form>
  );
}
