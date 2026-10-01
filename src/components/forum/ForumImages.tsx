import { useEffect, useRef, useState, type ClipboardEvent, type DragEvent } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { uploadForumImage } from "@/lib/account/api";
import { prepareForumImage } from "@/lib/account/imageTools";
import { accountErrorKey, FORUM_IMAGES_PER_POST, forumImageUrl } from "@/lib/account/shared";
import { useT } from "@/lib/prefs";

type Attached = { id: string; preview: string };

const TYPES = /^image\/(png|jpeg|webp|gif)$/;

/**
 * Pictures for a forum post: pick, paste or drop them; each one is shrunk in
 * the browser and uploaded right away, and the post sends the ids.
 */
export function useForumImages() {
  const t = useT();
  const [images, setImages] = useState<Attached[]>([]);
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const room = FORUM_IMAGES_PER_POST - images.length - busy;

  // Free the previews when the form goes away.
  const live = useRef(images);
  live.current = images;
  useEffect(() => () => live.current.forEach((i) => URL.revokeObjectURL(i.preview)), []);

  async function addOne(file: File) {
    const data = await prepareForumImage(file).catch(() => null);
    if (!data) {
      setError(t(file.type === "image/gif" ? "fo.img.gifTooBig" : "img.notImage"));
      return;
    }
    const r = await uploadForumImage({ data: { data } }).catch(() => null);
    if (!r?.ok) {
      setError(t(accountErrorKey(r ? r.error : "server_error")));
      return;
    }
    setImages((list) => [...list, { id: r.id, preview: URL.createObjectURL(file) }]);
  }

  async function addFiles(files: Iterable<File>) {
    setError(null);
    const picked = [...files].filter((f) => TYPES.test(f.type));
    if (picked.length === 0) return false;
    if (picked.length > room) setError(t("fo.img.max", { n: FORUM_IMAGES_PER_POST }));
    const take = picked.slice(0, Math.max(0, room));
    if (take.some((f) => f.size > 25 * 1024 * 1024)) {
      setError(t("img.tooLarge"));
      return true;
    }
    setBusy((b) => b + take.length);
    for (const f of take) {
      await addOne(f);
      setBusy((b) => b - 1);
    }
    return true;
  }

  function remove(id: string) {
    setImages((list) => {
      const gone = list.find((i) => i.id === id);
      if (gone) URL.revokeObjectURL(gone.preview);
      return list.filter((i) => i.id !== id);
    });
  }

  function clear() {
    images.forEach((i) => URL.revokeObjectURL(i.preview));
    setImages([]);
    setError(null);
  }

  /** Lets the form take pasted and dropped pictures. */
  const formProps = {
    onPaste(e: ClipboardEvent) {
      const files = [...e.clipboardData.files];
      if (files.some((f) => TYPES.test(f.type))) {
        e.preventDefault();
        void addFiles(files);
      }
    },
    onDragOver(e: DragEvent) {
      if ([...e.dataTransfer.items].some((i) => i.kind === "file")) e.preventDefault();
    },
    onDrop(e: DragEvent) {
      if (e.dataTransfer.files.length === 0) return;
      e.preventDefault();
      void addFiles(e.dataTransfer.files);
    },
  };

  const picker = (
    <div className="space-y-2">
      {(images.length > 0 || busy > 0) && (
        <ul className="flex flex-wrap gap-2">
          {images.map((img) => (
            <li key={img.id} className="relative">
              <img
                src={img.preview}
                alt=""
                className="h-20 w-20 rounded-lg border border-line object-cover"
              />
              <button
                type="button"
                onClick={() => remove(img.id)}
                className="absolute -top-2 -right-2 inline-flex h-6 w-6 items-center justify-center rounded-full border border-line bg-surface text-ink-2 shadow hover:text-red-400"
                aria-label={t("fo.img.remove")}
                title={t("fo.img.remove")}
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </li>
          ))}
          {Array.from({ length: busy }, (_, i) => (
            <li
              key={`busy${i}`}
              className="inline-flex h-20 w-20 items-center justify-center rounded-lg border border-dashed border-line text-ink-3"
            >
              <Loader2 className="h-5 w-5 animate-spin" aria-label={t("img.uploading")} />
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={input}
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          data-testid="forum-image-input"
          onChange={(e) => {
            if (e.target.files) void addFiles([...e.target.files]);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          disabled={room <= 0}
          onClick={() => input.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[12px] font-medium text-ink-2 transition-colors hover:border-brand-line hover:text-ink disabled:opacity-50"
        >
          <ImagePlus className="h-4 w-4" aria-hidden="true" />
          {t("fo.img.add")}
        </button>
        <span className="text-[12px] text-ink-3">
          {t("fo.img.hint", { n: FORUM_IMAGES_PER_POST })}
        </span>
      </div>
      {error && <p className="text-[12px] text-red-400">{error}</p>}
    </div>
  );

  return {
    ids: images.map((i) => i.id),
    uploading: busy > 0,
    clear,
    formProps,
    picker,
  };
}

/** A post's pictures; clicking one opens it full size. */
export function PostImages({ ids }: { ids: string[] }) {
  const t = useT();
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (ids.length === 0) return null;
  return (
    <>
      <ul className={`grid gap-2 ${ids.length === 1 ? "max-w-md grid-cols-1" : "grid-cols-2"}`}>
        {ids.map((id) => (
          <li key={id}>
            <button
              type="button"
              onClick={() => setOpen(id)}
              className="block w-full overflow-hidden rounded-lg border border-line bg-surface-2"
              aria-label={t("fo.img.open")}
            >
              <img
                src={forumImageUrl(id)}
                alt=""
                loading="lazy"
                decoding="async"
                className={`w-full object-cover ${ids.length === 1 ? "max-h-96" : "h-40 sm:h-48"}`}
              />
            </button>
          </li>
        ))}
      </ul>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t("fo.img.open")}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4"
          onClick={() => setOpen(null)}
        >
          <img
            src={forumImageUrl(open)}
            alt=""
            className="max-h-full max-w-full rounded-lg object-contain"
          />
          <button
            type="button"
            onClick={() => setOpen(null)}
            className="absolute top-4 right-4 rounded-full bg-black/60 p-2 text-white hover:bg-black/80"
            aria-label={t("img.cancel")}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      )}
    </>
  );
}
