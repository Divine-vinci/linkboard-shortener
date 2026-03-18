"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type LinkOption = {
  id: string;
  slug: string;
  targetUrl: string;
  title: string | null;
  tags: string[];
  expiresAt: string | null;
};

type BoardLinkItem = {
  id: string;
  boardId: string;
  linkId: string;
  position: number;
  addedAt: string;
  link: LinkOption;
};

type LinkListResponse = {
  data?: LinkOption[];
  error?: {
    message?: string;
  };
};

type MutationResponse = {
  data?:
    | {
        id: string;
        boardId: string;
        linkId: string;
        position: number;
        addedAt: string;
      }
    | Array<{
        id: string;
        boardId: string;
        linkId: string;
        position: number;
        addedAt?: string;
      }>;
  error?: {
    code?: string;
    message?: string;
    details?: {
      fields?: {
        linkId?: string;
        linkIds?: string;
      };
    };
  };
};

function truncateUrl(value: string) {
  return value.length > 48 ? `${value.slice(0, 45)}...` : value;
}

function normalizeBoardLinks(items: BoardLinkItem[]) {
  return [...items]
    .sort((left, right) => left.position - right.position)
    .map((item, index) => ({
      ...item,
      position: index,
    }));
}

function reorderItems(items: BoardLinkItem[], fromIndex: number, toIndex: number) {
  const nextItems = [...items];
  const [movedItem] = nextItems.splice(fromIndex, 1);

  if (!movedItem) {
    return items;
  }

  nextItems.splice(toIndex, 0, movedItem);
  return nextItems.map((item, index) => ({
    ...item,
    position: index,
  }));
}

function getExpirationStatus(expiresAt: string | null): {
  label: string;
  variant: 'active' | 'expired' | 'expiring-soon' | 'none';
} {
  if (!expiresAt) {
    return { label: '', variant: 'none' };
  }

  const expiry = new Date(expiresAt);
  const daysUntil = (expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24);

  if (daysUntil < 0) {
    return { label: 'Expired', variant: 'expired' };
  }

  if (daysUntil <= 7) {
    return { label: 'Expiring soon', variant: 'expiring-soon' };
  }

  return { label: 'Active', variant: 'active' };
}

const EXPIRATION_BADGE_STYLES = {
  active: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  expired: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
  'expiring-soon': 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  none: '',
} as const;

export function BoardLinkAdd({ boardId, initialLinks }: { boardId: string; initialLinks: BoardLinkItem[] }) {
  const router = useRouter();
  const [boardLinks, setBoardLinks] = useState(() => normalizeBoardLinks(initialLinks));
  const [availableLinks, setAvailableLinks] = useState<LinkOption[]>([]);
  const [selectedLinkId, setSelectedLinkId] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRemovingId, setIsRemovingId] = useState<string | null>(null);
  const [isReordering, setIsReordering] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadLinks() {
      setLoading(true);
      setFormError(null);

      try {
        const response = await fetch("/api/v1/links?limit=100", {
          headers: {
            Accept: "application/json",
          },
        });
        const payload = (await response.json()) as LinkListResponse;

        if (!response.ok) {
          if (active) {
            setFormError(payload.error?.message ?? "Unable to load links right now.");
          }
          return;
        }

        if (active) {
          setAvailableLinks(payload.data ?? []);
        }
      } catch {
        if (active) {
          setFormError("Unable to load links right now.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadLinks();

    return () => {
      active = false;
    };
  }, []);

  const availableOptions = useMemo(() => {
    const attachedIds = new Set(boardLinks.map((item) => item.linkId));
    return availableLinks.filter((link) => !attachedIds.has(link.id));
  }, [availableLinks, boardLinks]);

  async function handleAdd(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedLinkId) {
      setFormError("Select a link to add.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const response = await fetch(`/api/v1/boards/${boardId}/links`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ linkId: selectedLinkId }),
      });
      const payload = (await response.json()) as MutationResponse;

      if (!response.ok || !payload.data || Array.isArray(payload.data)) {
        setFormError(
          payload.error?.details?.fields?.linkId ?? payload.error?.message ?? "Unable to add link right now.",
        );
        setIsSubmitting(false);
        return;
      }

      const addedLink = availableLinks.find((link) => link.id === selectedLinkId);

      if (!addedLink) {
        setFormError("Unable to add link right now.");
        setIsSubmitting(false);
        return;
      }

      const addedBoardLink: BoardLinkItem = {
        id: payload.data.id,
        boardId: payload.data.boardId,
        linkId: payload.data.linkId,
        position: payload.data.position,
        addedAt: payload.data.addedAt,
        link: addedLink,
      };

      setBoardLinks((current) => normalizeBoardLinks([...current, addedBoardLink]));
      setSelectedLinkId("");
      router.refresh();
    } catch {
      setFormError("Unable to add link right now.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRemove(linkId: string) {
    setIsRemovingId(linkId);
    setFormError(null);

    try {
      const response = await fetch(`/api/v1/boards/${boardId}/links/${linkId}`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        let message = "Unable to remove link right now.";
        try {
          const payload = (await response.json()) as MutationResponse;
          message = payload.error?.message ?? message;
        } catch {
          // no-op
        }
        setFormError(message);
        setIsRemovingId(null);
        return;
      }

      setBoardLinks((current) =>
        normalizeBoardLinks(current.filter((item) => item.linkId !== linkId)),
      );
      router.refresh();
    } catch {
      setFormError("Unable to remove link right now.");
    } finally {
      setIsRemovingId(null);
    }
  }

  async function handleMove(linkId: string, direction: "up" | "down") {
    const currentIndex = boardLinks.findIndex((item) => item.linkId === linkId);

    if (currentIndex === -1) {
      return;
    }

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= boardLinks.length) {
      return;
    }

    const previousBoardLinks = boardLinks;
    const nextBoardLinks = reorderItems(boardLinks, currentIndex, targetIndex);

    setBoardLinks(nextBoardLinks);
    setIsReordering(true);
    setFormError(null);

    try {
      const response = await fetch(`/api/v1/boards/${boardId}/links/reorder`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          linkIds: nextBoardLinks.map((item) => item.linkId),
        }),
      });
      const payload = (await response.json()) as MutationResponse;

      if (!response.ok) {
        setBoardLinks(previousBoardLinks);
        setFormError(
          payload.error?.details?.fields?.linkIds ?? payload.error?.message ?? "Unable to reorder links right now.",
        );
        return;
      }

      router.refresh();
    } catch {
      setBoardLinks(previousBoardLinks);
      setFormError("Unable to reorder links right now.");
    } finally {
      setIsReordering(false);
    }
  }

  return (
    <div className="space-y-6 rounded-3xl border border-zinc-800 bg-zinc-950/50 p-6">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-zinc-100">Links</h3>
        <p className="text-sm text-zinc-400">Add existing links from your library or remove them without deleting the source link.</p>
      </div>

      <form className="space-y-3 rounded-3xl border border-zinc-800 bg-zinc-900/60 p-4" onSubmit={handleAdd}>
        <label className="text-sm font-medium text-zinc-200" htmlFor="board-link-id">
          Add link to board
        </label>
        <div className="flex flex-col gap-3 md:flex-row">
          <select
            id="board-link-id"
            value={selectedLinkId}
            onChange={(event) => setSelectedLinkId(event.target.value)}
            disabled={loading || isSubmitting || isReordering || availableOptions.length === 0}
            className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <option value="">{loading ? "Loading links..." : availableOptions.length > 0 ? "Select a link" : "No available links"}</option>
            {availableOptions.map((link) => (
              <option key={link.id} value={link.id}>
                {(link.title ?? link.slug).trim()} — {link.slug}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={loading || isSubmitting || isReordering || availableOptions.length === 0}
            className="rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Adding..." : "Add link"}
          </button>
        </div>
        <p className="text-xs text-zinc-500">Only links not already on this board are listed.</p>
      </form>

      {formError ? <p className="text-sm text-rose-400">{formError}</p> : null}

      {boardLinks.length === 0 ? (
        <p className="text-sm text-zinc-500">This board does not contain any links yet.</p>
      ) : (
        <ul role="list" aria-label="Board links" className="space-y-3">
          {boardLinks.map((item, index) => {
            const isFirst = index === 0;
            const isLast = index === boardLinks.length - 1;
            const controlsDisabled = isRemovingId !== null || isReordering;
            const expirationStatus = getExpirationStatus(item.link.expiresAt);

            return (
              <li
                key={item.id}
                className="flex flex-col gap-4 rounded-3xl border border-zinc-800 bg-zinc-900/50 p-4 md:flex-row md:items-start md:justify-between"
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-zinc-100">{item.link.title ?? item.link.slug}</p>
                    <span className="rounded-full border border-zinc-700 px-2 py-1 text-[11px] uppercase tracking-[0.2em] text-zinc-400">
                      {item.link.slug}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-400">{truncateUrl(item.link.targetUrl)}</p>
                  <div className="inline-flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                    {item.link.tags.map((tag) => (
                      <span key={tag} className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300">
                        {tag}
                      </span>
                    ))}
                    {expirationStatus.variant !== "none" ? (
                      <span
                        className={`rounded-full border px-2 py-1 ${EXPIRATION_BADGE_STYLES[expirationStatus.variant]}`}
                      >
                        {expirationStatus.label}
                      </span>
                    ) : null}
                    <span className="text-zinc-500">
                      {/* TODO(Epic 6): Replace with actual click count from ClickEvent aggregation */}
                      0 clicks
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 md:justify-end">
                  <button
                    type="button"
                    onClick={() => void handleMove(item.linkId, "up")}
                    disabled={isFirst || controlsDisabled}
                    aria-label={`Move ${item.link.title ?? item.link.slug} up`}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-700 text-sm font-semibold text-zinc-300 transition hover:border-emerald-400/60 hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleMove(item.linkId, "down")}
                    disabled={isLast || controlsDisabled}
                    aria-label={`Move ${item.link.title ?? item.link.slug} down`}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-700 text-sm font-semibold text-zinc-300 transition hover:border-emerald-400/60 hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleRemove(item.linkId)}
                    disabled={isRemovingId === item.linkId || isReordering}
                    aria-label={`Remove ${item.link.title ?? item.link.slug}`}
                    className="inline-flex items-center justify-center rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-200 transition hover:border-rose-400 hover:text-rose-100 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isRemovingId === item.linkId ? "Removing..." : "Remove"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
