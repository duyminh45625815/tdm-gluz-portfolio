"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { locales, type Locale } from "@/locales";
import { adminApiFetch } from "@/lib/admin-api/client";
import {
  diffJsonValue,
  isJsonRecord,
  removeEmptyObjects,
} from "@/lib/admin-api/patch";

type PageContent = Record<string, unknown>;
type PageDocument = {
  slug: "home" | "about";
  draft?: Partial<Record<Locale, PageContent>>;
  published?: Partial<Record<Locale, PageContent>>;
};

type PageEditorProps = {
  slug: PageDocument["slug"];
  title: string;
  sections: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parsePageDocument(
  value: unknown,
  slug: PageDocument["slug"],
): PageDocument | null {
  if (!isRecord(value) || value.slug !== slug) {
    return null;
  }

  function parseLocaleMap(
    map: unknown,
  ): Partial<Record<Locale, PageContent>> | undefined | null {
    if (map === undefined) {
      return undefined;
    }
    if (!isRecord(map)) {
      return null;
    }
    const result: Partial<Record<Locale, PageContent>> = {};
    for (const locale of locales) {
      const content = map[locale];
      if (content !== undefined) {
        if (!isRecord(content)) {
          return null;
        }
        result[locale] = content;
      }
    }
    return result;
  }

  const draft = parseLocaleMap(value.draft);
  const published = parseLocaleMap(value.published);
  if (draft === null || published === null) {
    return null;
  }
  return { slug, draft, published };
}

function responseMessage(value: unknown): string {
  return isRecord(value) && typeof value.message === "string"
    ? value.message
    : "The request could not be completed.";
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export default function PageEditor({
  slug,
  title,
  sections,
}: PageEditorProps) {
  const [page, setPage] = useState<PageDocument | null>(null);
  const [locale, setLocale] = useState<Locale>(locales[0]);
  const [draftText, setDraftText] = useState("{}");
  const [originalDraft, setOriginalDraft] = useState<PageContent>({});
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function loadPage() {
      try {
        const response = await adminApiFetch(`/api/admin/pages/${slug}`, {
          signal: controller.signal,
        });
        if (response.status === 404) {
          setInitialized(false);
          setPage(null);
          return;
        }
        const body = await readJson(response);
        if (!response.ok) {
          throw new Error(responseMessage(body));
        }
        const parsed = parsePageDocument(body, slug);
        if (!parsed) {
          throw new Error(`The ${title} response was invalid.`);
        }
        setPage(parsed);
        setInitialized(true);
        const draft = parsed.draft?.[locales[0]] ?? {};
        setOriginalDraft(draft);
        setDraftText(JSON.stringify(draft, null, 2));
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : `Unable to load the ${title}.`,
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadPage();
    return () => controller.abort();
  }, [slug, title]);

  async function initializePage() {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await adminApiFetch(`/api/admin/pages/${slug}`, {
        method: "POST",
      });
      const body = await readJson(response);
      if (!response.ok) {
        throw new Error(responseMessage(body));
      }
      const parsed = parsePageDocument(body, slug);
      if (!parsed) {
        throw new Error(`The initialized ${title} response was invalid.`);
      }
      setPage(parsed);
      setInitialized(true);
      setOriginalDraft({});
      setDraftText("{}");
      setNotice(`${title} initialized.`);
    } catch (initializeError) {
      setError(
        initializeError instanceof Error
          ? initializeError.message
          : `Unable to initialize the ${title}.`,
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    let content: unknown;
    try {
      content = JSON.parse(draftText);
    } catch {
      setError("Draft must be valid JSON.");
      return;
    }
    if (!isJsonRecord(content)) {
      setError("Draft content must be a JSON object.");
      return;
    }
    const cleaned = removeEmptyObjects(
      diffJsonValue(content, originalDraft),
    );
    if (!isJsonRecord(cleaned) || Object.keys(cleaned).length === 0) {
      setError("There are no draft changes to save.");
      return;
    }

    setSaving(true);
    try {
      const response = await adminApiFetch(
        `/api/admin/pages/${slug}/draft/${locale}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cleaned),
        },
      );
      const body = await readJson(response);
      if (!response.ok) {
        throw new Error(responseMessage(body));
      }
      const parsed = parsePageDocument(body, slug);
      if (!parsed) {
        throw new Error(`The saved ${title} response was invalid.`);
      }
      setPage(parsed);
      const savedDraft = parsed.draft?.[locale] ?? {};
      setOriginalDraft(savedDraft);
      setDraftText(JSON.stringify(savedDraft, null, 2));
      setNotice(`${title} draft saved. It has not been published.`);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : `Unable to save the ${title} draft.`,
      );
    } finally {
      setSaving(false);
    }
  }

  async function publishDraft() {
    setError("");
    setNotice("");
    setSaving(true);
    try {
      const response = await adminApiFetch(
        `/api/admin/pages/${slug}/publish/${locale}`,
        { method: "POST" },
      );
      const body = await readJson(response);
      if (!response.ok) {
        throw new Error(responseMessage(body));
      }
      const parsed = parsePageDocument(body, slug);
      if (!parsed) {
        throw new Error(`The published ${title} response was invalid.`);
      }
      setPage(parsed);
      setNotice(`Published the ${locale.toUpperCase()} ${title}.`);
    } catch (publishError) {
      setError(
        publishError instanceof Error
          ? publishError.message
          : `Unable to publish the ${title}.`,
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="admin-status-page">Loading {title}…</p>;
  }

  return (
    <>
      <section className="admin-page-heading">
        <p className="admin-eyebrow">Content</p>
        <h2>{title}</h2>
        <p>
          Edit localized draft JSON using the existing Page schema. Saving never
          publishes content.
        </p>
      </section>
      {error && <p className="settings-feedback is-error" role="alert">{error}</p>}
      {notice && <p className="settings-feedback is-success" role="status">{notice}</p>}

      {!initialized ? (
        <section className="settings-panel">
          <p>The {title} document has not been initialized.</p>
          <button
            className="admin-primary-button"
            type="button"
            onClick={initializePage}
            disabled={saving}
          >
            {saving ? "Initializing…" : `Initialize ${title}`}
          </button>
        </section>
      ) : (
        <>
          <label className="settings-control page-locale-select">
            <span>Editing locale</span>
            <select
              value={locale}
              onChange={(event) => {
                const nextLocale = event.target.value;
                if (locales.includes(nextLocale as Locale)) {
                  const selectedLocale = nextLocale as Locale;
                  const nextDraft = page?.draft?.[selectedLocale] ?? {};
                  setLocale(selectedLocale);
                  setOriginalDraft(nextDraft);
                  setDraftText(JSON.stringify(nextDraft, null, 2));
                  setError("");
                  setNotice("");
                }
              }}
            >
              {locales.map((supportedLocale) => (
                <option key={supportedLocale} value={supportedLocale}>
                  {supportedLocale.toUpperCase()}
                </option>
              ))}
            </select>
          </label>

          <form className="settings-form" onSubmit={saveDraft}>
            <section className="settings-panel">
              <h3>{locale.toUpperCase()} draft</h3>
              <p>
                Supported sections: {sections}. Unknown fields and sections are
                rejected by the backend.
              </p>
              <textarea
                className="settings-json-editor"
                aria-label={`${locale.toUpperCase()} ${title} draft JSON`}
                spellCheck={false}
                value={draftText}
                onChange={(event) => setDraftText(event.target.value)}
              />
              <small>
                Draft updates are locale-specific and do not publish. The API
                supports partial updates but does not support deleting fields.
              </small>
              <div className="settings-action-row">
                <button
                  className="admin-primary-button"
                  type="submit"
                  disabled={saving}
                >
                  {saving ? "Saving…" : "Save draft"}
                </button>
                <button
                  className="admin-secondary-button"
                  type="button"
                  onClick={publishDraft}
                  disabled={saving}
                >
                  {saving ? "Working…" : "Publish locale"}
                </button>
              </div>
            </section>
          </form>

          <section className="settings-panel page-published-panel">
            <h3>{locale.toUpperCase()} published content</h3>
            {page?.published?.[locale] ? (
              <pre>{JSON.stringify(page.published[locale], null, 2)}</pre>
            ) : (
              <p>No published content for this locale.</p>
            )}
          </section>
        </>
      )}
    </>
  );
}
