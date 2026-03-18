"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type BoardDeleteButtonProps = {
  boardId: string;
};

type DeleteBoardResponse = {
  error?: {
    message?: string;
  };
};

export function BoardDeleteButton({ boardId }: BoardDeleteButtonProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/v1/boards/${boardId}`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        const payload = (await response.json()) as DeleteBoardResponse;
        setErrorMessage(payload.error?.message ?? "Unable to delete board right now.");
        setIsDeleting(false);
        return;
      }

      router.push("/dashboard/boards?deleted=1");
      router.refresh();
    } catch {
      setErrorMessage("Unable to delete board right now. Please check your connection and try again.");
      setIsDeleting(false);
    }
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => {
          setErrorMessage(null);
          setConfirming(true);
        }}
        className="inline-flex items-center justify-center rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-200 transition hover:border-rose-400 hover:text-rose-100"
      >
        Delete board
      </button>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4">
      <p className="text-sm text-rose-100">This permanently deletes the board. Links stay in your library.</p>
      {errorMessage ? <p className="text-sm text-rose-200">{errorMessage}</p> : null}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          className="inline-flex items-center justify-center rounded-2xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isDeleting ? "Deleting…" : "Yes, delete board"}
        </button>
        <button
          type="button"
          onClick={() => {
            setConfirming(false);
            setErrorMessage(null);
          }}
          disabled={isDeleting}
          className="inline-flex items-center justify-center rounded-2xl border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-70"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
