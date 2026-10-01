import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { ArrowLeft, Send } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Field, FormError, TextArea } from "@/components/account/fields";
import { RequireAccount } from "@/components/account/RequireAccount";
import { useForumImages } from "@/components/forum/ForumImages";
import { createThread } from "@/lib/account/api";
import { useAccount } from "@/lib/account/client";
import { useSiteSettings } from "@/lib/account/site";
import {
  accountErrorKey,
  FORUM_BODY_MAX,
  FORUM_CATEGORIES,
  FORUM_TITLE_MAX,
  FORUM_TITLE_MIN,
  type ForumCategory,
} from "@/lib/account/shared";
import { useLang, useT } from "@/lib/prefs";

type NewSearch = { c?: ForumCategory };

export const Route = createFileRoute("/forum/new")({
  validateSearch: (s: Record<string, unknown>): NewSearch => ({
    c: FORUM_CATEGORIES.find((x) => x.id === s.c)?.id,
  }),
  head: () => ({ meta: [{ title: "New thread — Vyce LuaUtility" }] }),
  component: () => (
    <RequireAccount next="/forum/new">
      <NewThreadPage />
    </RequireAccount>
  ),
});

function NewThreadPage() {
  const t = useT();
  const lang = useLang();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [category, setCategory] = useState<ForumCategory>(search.c ?? "help");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const images = useForumImages();
  const site = useSiteSettings();
  const acc = useAccount();
  const closed = Boolean(site?.forumReadOnly && !acc.user?.role);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const r = await createThread({ data: { title, category, body, images: images.ids } }).catch(
      () => null,
    );
    setBusy(false);
    if (r?.ok) void navigate({ to: "/forum/$id", params: { id: String(r.id) } });
    else setError(t(accountErrorKey(r ? r.error : "server_error")));
  }

  return (
    <PageShell width="max-w-3xl">
      <div className="relative z-10 space-y-5 pt-10 md:pt-14">
        <Link
          to="/forum"
          search={{}}
          className="inline-flex items-center gap-1.5 text-[13px] text-ink-3 hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {t("fo.back")}
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-ink">{t("fo.newTitle")}</h1>
        {closed && (
          <p className="ep-card border-amber-400/40 p-4 text-sm text-[var(--warn-ink)]">
            {t("acc.err.forum_closed")}
          </p>
        )}
        <form onSubmit={submit} {...images.formProps} className="ep-card space-y-4 p-5 sm:p-6">
          <fieldset className="space-y-1.5">
            <legend className="text-[13px] font-medium text-ink">{t("fo.category")}</legend>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {FORUM_CATEGORIES.map((c) => (
                <label
                  key={c.id}
                  className={`cursor-pointer rounded-full border px-3 py-1 text-[13px] transition-colors ${
                    category === c.id
                      ? "border-brand-line bg-brand-soft text-brand"
                      : "border-line text-ink-2 hover:bg-surface-2 hover:text-ink"
                  }`}
                >
                  <input
                    type="radio"
                    name="category"
                    value={c.id}
                    checked={category === c.id}
                    onChange={() => setCategory(c.id)}
                    className="sr-only"
                  />
                  {lang === "tr" ? c.tr : c.en}
                </label>
              ))}
            </div>
          </fieldset>
          <Field
            label={t("fo.titleLabel")}
            hint={t("fo.titleHint")}
            value={title}
            onValue={(v) => {
              setTitle(v);
              setError(null);
            }}
            minLength={FORUM_TITLE_MIN}
            maxLength={FORUM_TITLE_MAX}
            required
          />
          <TextArea
            label={t("fo.body")}
            hint={t("fo.bodyHint")}
            value={body}
            onValue={(v) => {
              setBody(v);
              setError(null);
            }}
            rows={10}
            maxLength={FORUM_BODY_MAX}
            required={images.ids.length === 0}
          />
          {images.picker}
          <FormError>{error}</FormError>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[12px] text-ink-3">{t("fo.rules")}</p>
            <button
              type="submit"
              disabled={busy || images.uploading || closed}
              className="ep-cta inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              {busy ? t("fo.sending") : t("fo.post")}
            </button>
          </div>
        </form>
      </div>
    </PageShell>
  );
}
