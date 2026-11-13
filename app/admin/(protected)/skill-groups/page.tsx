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

type SkillGroupContent = Record<string, unknown>;
type SkillGroup = {
  key: string;
  displayOrder: number;
  presentations?: { home?: boolean; about?: boolean };
  draft?: Partial<Record<Locale, SkillGroupContent>>;
  published?: Partial<Record<Locale, SkillGroupContent>>;
};
type SkillGroupForm = {
  displayOrder: string;
  presentations: { home: boolean; about: boolean };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseSkillGroup(value: unknown): SkillGroup | null {
  if (
    !isRecord(value) ||
    typeof value.key !== "string" ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.key) ||
    typeof value.displayOrder !== "number" ||
    !Number.isInteger(value.displayOrder) ||
    value.displayOrder < 0
  ) {
    return null;
  }

  function parseContentMap(
    map: unknown,
  ): Partial<Record<Locale, SkillGroupContent>> | undefined | null {
    if (map === undefined) {
      return undefined;
    }
    if (!isRecord(map)) {
      return null;
    }
    const result: Partial<Record<Locale, SkillGroupContent>> = {};
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

  let presentations: SkillGroup["presentations"];
  if (value.presentations !== undefined) {
    if (!isRecord(value.presentations)) {
      return null;
    }
    presentations = {};
    for (const key of ["home", "about"] as const) {
      if (value.presentations[key] !== undefined) {
        if (typeof value.presentations[key] !== "boolean") {
          return null;
        }
        presentations[key] = value.presentations[key];
      }
    }
  }
  const draft = parseContentMap(value.draft);
  const published = parseContentMap(value.published);
  if (draft === null || published === null) {
    return null;
  }
  return {
    key: value.key,
    displayOrder: value.displayOrder,
    presentations,
    draft,
    published,
  };
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

function formFor(group: SkillGroup): SkillGroupForm {
  return {
    displayOrder: String(group.displayOrder),
    presentations: {
      home: group.presentations?.home ?? false,
      about: group.presentations?.about ?? false,
    },
  };
}

export default function SkillGroupsAdminPage() {
  const [groups, setGroups] = useState<SkillGroup[]>([]);
  const [selectedKey, setSelectedKey] = useState("");
  const [locale, setLocale] = useState<Locale>(locales[0]);
  const [form, setForm] = useState<SkillGroupForm | null>(null);
  const [initialForm, setInitialForm] = useState<SkillGroupForm | null>(null);
  const [draftText, setDraftText] = useState("{}");
  const [originalDraft, setOriginalDraft] = useState<SkillGroupContent>({});
  const [newKey, setNewKey] = useState("");
  const [newOrder, setNewOrder] = useState("0");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const selectedGroup = groups.find((group) => group.key === selectedKey);

  function selectGroup(group: SkillGroup | undefined) {
    setSelectedKey(group?.key ?? "");
    setDeletePending(false);
    if (!group) {
      setForm(null);
      setInitialForm(null);
      setOriginalDraft({});
      setDraftText("{}");
      return;
    }
    const nextForm = formFor(group);
    const draft = group.draft?.[locale] ?? {};
    setForm(nextForm);
    setInitialForm(nextForm);
    setOriginalDraft(draft);
    setDraftText(JSON.stringify(draft, null, 2));
  }

  useEffect(() => {
    const controller = new AbortController();
    async function loadGroups() {
      try {
        const response = await adminApiFetch("/api/admin/skill-groups", {
          signal: controller.signal,
        });
        const body = await readJson(response);
        if (!response.ok) {
          throw new Error(responseMessage(body));
        }
        if (!Array.isArray(body)) {
          throw new Error("The skill groups response was invalid.");
        }
        const parsed = body.map(parseSkillGroup);
        if (parsed.some((group) => group === null)) {
          throw new Error("The skill groups response was invalid.");
        }
        const valid = parsed.filter(
          (group): group is SkillGroup => group !== null,
        );
        setGroups(valid);
        const firstGroup = valid[0];
        setSelectedKey(firstGroup?.key ?? "");
        if (firstGroup) {
          const firstForm = formFor(firstGroup);
          const firstDraft = firstGroup.draft?.[locales[0]] ?? {};
          setForm(firstForm);
          setInitialForm(firstForm);
          setOriginalDraft(firstDraft);
          setDraftText(JSON.stringify(firstDraft, null, 2));
        }
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load skill groups.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }
    void loadGroups();
    return () => controller.abort();
  }, []);

  function updateGroup(group: SkillGroup) {
    setGroups((current) =>
      current.map((item) => (item.key === group.key ? group : item)),
    );
  }

  async function createGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    const key = newKey.trim();
    const displayOrder = Number(newOrder);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(key)) {
      setError("Use a lowercase key with letters, numbers, and hyphens.");
      return;
    }
    if (!Number.isInteger(displayOrder) || displayOrder < 0) {
      setError("Display order must be a non-negative integer.");
      return;
    }
    setSaving(true);
    try {
      const response = await adminApiFetch("/api/admin/skill-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key,
          displayOrder,
          presentations: { home: false, about: false },
        }),
      });
      const body = await readJson(response);
      if (!response.ok) {
        throw new Error(responseMessage(body));
      }
      const group = parseSkillGroup(body);
      if (!group) {
        throw new Error("The created skill group response was invalid.");
      }
      setGroups((current) =>
        [...current, group].sort(
          (left, right) =>
            left.displayOrder - right.displayOrder ||
            left.key.localeCompare(right.key),
        ),
      );
      selectGroup(group);
      setNewKey("");
      setNotice("Skill group created.");
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Unable to create the skill group.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedGroup || !form || !initialForm) {
      return;
    }
    setError("");
    setNotice("");
    const displayOrder = Number(form.displayOrder);
    if (!Number.isInteger(displayOrder) || displayOrder < 0) {
      setError("Display order must be a non-negative integer.");
      return;
    }
    const changes = removeEmptyObjects(diffJsonValue(form, initialForm));
    if (!isJsonRecord(changes) || Object.keys(changes).length === 0) {
      setError("There are no skill group settings changes to save.");
      return;
    }
    if (Object.hasOwn(changes, "displayOrder")) {
      changes.displayOrder = displayOrder;
    }
    setSaving(true);
    try {
      const response = await adminApiFetch(
        `/api/admin/skill-groups/${selectedGroup.key}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(changes),
        },
      );
      const body = await readJson(response);
      if (!response.ok) {
        throw new Error(responseMessage(body));
      }
      const group = parseSkillGroup(body);
      if (!group) {
        throw new Error("The updated skill group response was invalid.");
      }
      updateGroup(group);
      const savedForm = formFor(group);
      setForm(savedForm);
      setInitialForm(savedForm);
      setNotice("Skill group settings saved.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save skill group settings.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteGroup() {
    if (!selectedGroup) {
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await adminApiFetch(
        `/api/admin/skill-groups/${selectedGroup.key}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        throw new Error(responseMessage(await readJson(response)));
      }
      const remaining = groups.filter((group) => group.key !== selectedGroup.key);
      setGroups(remaining);
      selectGroup(remaining[0]);
      setDeletePending(false);
      setNotice("Skill group deleted.");
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete the skill group.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedGroup) {
      return;
    }
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
    const changes = removeEmptyObjects(
      diffJsonValue(content, originalDraft),
    );
    if (!isJsonRecord(changes) || Object.keys(changes).length === 0) {
      setError("There are no draft changes to save.");
      return;
    }
    setSaving(true);
    try {
      const response = await adminApiFetch(
        `/api/admin/skill-groups/${selectedGroup.key}/draft/${locale}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(changes),
        },
      );
      const body = await readJson(response);
      if (!response.ok) {
        throw new Error(responseMessage(body));
      }
      const group = parseSkillGroup(body);
      if (!group) {
        throw new Error("The saved skill group draft response was invalid.");
      }
      updateGroup(group);
      const savedDraft = group.draft?.[locale] ?? {};
      setOriginalDraft(savedDraft);
      setDraftText(JSON.stringify(savedDraft, null, 2));
      setNotice("Draft saved. It has not been published.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save the skill group draft.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function publishDraft() {
    if (!selectedGroup) {
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await adminApiFetch(
        `/api/admin/skill-groups/${selectedGroup.key}/publish/${locale}`,
        { method: "POST" },
      );
      const body = await readJson(response);
      if (!response.ok) {
        throw new Error(responseMessage(body));
      }
      const group = parseSkillGroup(body);
      if (!group) {
        throw new Error("The published skill group response was invalid.");
      }
      updateGroup(group);
      setNotice(`Published ${locale.toUpperCase()} skill group content.`);
    } catch (publishError) {
      setError(
        publishError instanceof Error
          ? publishError.message
          : "Unable to publish the skill group.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="admin-status-page">Loading skill groups…</p>;
  }

  return (
    <>
      <section className="admin-page-heading">
        <p className="admin-eyebrow">Content</p>
        <h2>Skill Groups</h2>
        <p>Manage localized skills, presentation flags, and display order.</p>
      </section>
      {error && <p className="settings-feedback is-error" role="alert">{error}</p>}
      {notice && <p className="settings-feedback is-success" role="status">{notice}</p>}

      <details className="settings-panel project-create-panel">
        <summary>Create skill group</summary>
        <form className="settings-form" onSubmit={createGroup}>
          <label className="settings-control">
            <span>Key</span>
            <input
              required
              maxLength={100}
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              value={newKey}
              onChange={(event) => setNewKey(event.target.value)}
            />
          </label>
          <label className="settings-control">
            <span>Display order</span>
            <input
              type="number"
              min="0"
              step="1"
              value={newOrder}
              onChange={(event) => setNewOrder(event.target.value)}
            />
          </label>
          <button className="admin-primary-button" disabled={saving}>
            {saving ? "Creating…" : "Create skill group"}
          </button>
        </form>
      </details>

      {groups.length === 0 ? (
        <section className="settings-panel"><p>No skill groups have been created.</p></section>
      ) : (
        <>
          <label className="settings-control project-select">
            <span>Skill group</span>
            <select
              value={selectedKey}
              onChange={(event) => {
                selectGroup(
                  groups.find((group) => group.key === event.target.value),
                );
                setError("");
                setNotice("");
              }}
            >
              {groups.map((group) => (
                <option key={group.key} value={group.key}>
                  {group.key} · {group.displayOrder}
                </option>
              ))}
            </select>
          </label>
          {selectedGroup && form && (
            <>
              <form className="settings-form" onSubmit={saveGroup}>
                <section className="settings-panel">
                  <div className="project-panel-heading">
                    <h3>{selectedGroup.key}</h3>
                    {!deletePending ? (
                      <button
                        className="admin-danger-button"
                        type="button"
                        onClick={() => setDeletePending(true)}
                      >
                        Delete
                      </button>
                    ) : (
                      <span className="settings-action-row">
                        <button
                          className="admin-danger-button"
                          type="button"
                          onClick={deleteGroup}
                          disabled={saving}
                        >
                          Confirm delete
                        </button>
                        <button
                          className="admin-secondary-button"
                          type="button"
                          onClick={() => setDeletePending(false)}
                        >
                          Cancel
                        </button>
                      </span>
                    )}
                  </div>
                  <label className="settings-control">
                    <span>Display order</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={form.displayOrder}
                      onChange={(event) =>
                        setForm((current) => current && {
                          ...current,
                          displayOrder: event.target.value,
                        })
                      }
                    />
                  </label>
                  {(["home", "about"] as const).map((presentation) => (
                    <label className="settings-checkbox" key={presentation}>
                      <input
                        type="checkbox"
                        checked={form.presentations[presentation]}
                        onChange={(event) =>
                          setForm((current) => current && {
                            ...current,
                            presentations: {
                              ...current.presentations,
                              [presentation]: event.target.checked,
                            },
                          })
                        }
                      />
                      <span>Show on {presentation}</span>
                    </label>
                  ))}
                  <button className="admin-primary-button" disabled={saving}>
                    {saving ? "Saving…" : "Save skill group settings"}
                  </button>
                </section>
              </form>
              <label className="settings-control project-select">
                <span>Draft locale</span>
                <select
                  value={locale}
                  onChange={(event) => {
                    if (locales.includes(event.target.value as Locale)) {
                      const nextLocale = event.target.value as Locale;
                      setLocale(nextLocale);
                      const nextDraft =
                        selectedGroup?.draft?.[nextLocale] ?? {};
                      setOriginalDraft(nextDraft);
                      setDraftText(JSON.stringify(nextDraft, null, 2));
                      setError("");
                      setNotice("");
                    }
                  }}
                >
                  {locales.map((item) => <option key={item} value={item}>{item.toUpperCase()}</option>)}
                </select>
              </label>
              <form className="settings-form" onSubmit={saveDraft}>
                <section className="settings-panel">
                  <h3>{locale.toUpperCase()} draft</h3>
                  <p>Content may include home and about groups, each with a title and item list.</p>
                  <textarea
                    className="settings-json-editor"
                    aria-label={`${locale.toUpperCase()} skill group draft JSON`}
                    spellCheck={false}
                    value={draftText}
                    onChange={(event) => setDraftText(event.target.value)}
                  />
                  <small>Saving updates only this locale&apos;s draft; publishing is a separate action.</small>
                  <div className="settings-action-row">
                    <button className="admin-primary-button" disabled={saving}>
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
                {selectedGroup.published?.[locale] ? (
                  <pre>{JSON.stringify(selectedGroup.published[locale], null, 2)}</pre>
                ) : (
                  <p>No published content for this locale.</p>
                )}
              </section>
            </>
          )}
        </>
      )}
    </>
  );
}
