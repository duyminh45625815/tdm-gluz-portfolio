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

const educationTypes = [
  "university",
  "certificate",
  "course",
  "achievement",
] as const;
type EducationType = (typeof educationTypes)[number];
type EducationContent = Record<string, unknown>;
type EducationRecord = {
  id: string;
  type: EducationType;
  startDate?: string;
  endDate?: string;
  displayOrder: number;
  presentations?: { home?: boolean; about?: boolean };
  draft?: Partial<Record<Locale, EducationContent>>;
  published?: Partial<Record<Locale, EducationContent>>;
};
type EducationForm = {
  type: EducationType;
  startDate: string;
  endDate: string;
  displayOrder: string;
  presentations: { home: boolean; about: boolean };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function dateInputValue(value: unknown): string | undefined {
  if (typeof value !== "string" && !(value instanceof Date)) {
    return undefined;
  }
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toISOString().slice(0, 10)
    : undefined;
}

function parseEducation(value: unknown): EducationRecord | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    !/^[\da-f]{24}$/i.test(value.id) ||
    typeof value.type !== "string" ||
    !educationTypes.includes(value.type as EducationType) ||
    typeof value.displayOrder !== "number" ||
    !Number.isInteger(value.displayOrder) ||
    value.displayOrder < 0
  ) {
    return null;
  }

  function parseContentMap(
    map: unknown,
  ): Partial<Record<Locale, EducationContent>> | undefined | null {
    if (map === undefined) {
      return undefined;
    }
    if (!isRecord(map)) {
      return null;
    }
    const result: Partial<Record<Locale, EducationContent>> = {};
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

  let presentations: EducationRecord["presentations"];
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
  const startDate = dateInputValue(value.startDate);
  const endDate = dateInputValue(value.endDate);
  if (
    draft === null ||
    published === null ||
    (value.startDate !== undefined && startDate === undefined) ||
    (value.endDate !== undefined && endDate === undefined)
  ) {
    return null;
  }

  return {
    id: value.id,
    type: value.type as EducationType,
    startDate,
    endDate,
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

function formFor(record: EducationRecord): EducationForm {
  return {
    type: record.type,
    startDate: record.startDate ?? "",
    endDate: record.endDate ?? "",
    displayOrder: String(record.displayOrder),
    presentations: {
      home: record.presentations?.home ?? false,
      about: record.presentations?.about ?? false,
    },
  };
}

function validDateRange(startDate: string, endDate: string): boolean {
  return (
    !startDate ||
    !endDate ||
    new Date(`${endDate}T00:00:00.000Z`) >=
      new Date(`${startDate}T00:00:00.000Z`)
  );
}

export default function EducationAdminPage() {
  const [records, setRecords] = useState<EducationRecord[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [locale, setLocale] = useState<Locale>(locales[0]);
  const [form, setForm] = useState<EducationForm | null>(null);
  const [initialForm, setInitialForm] = useState<EducationForm | null>(null);
  const [draftText, setDraftText] = useState("{}");
  const [originalDraft, setOriginalDraft] = useState<EducationContent>({});
  const [newType, setNewType] = useState<EducationType>("university");
  const [newStartDate, setNewStartDate] = useState("");
  const [newEndDate, setNewEndDate] = useState("");
  const [newOrder, setNewOrder] = useState("0");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const selectedRecord = records.find((record) => record.id === selectedId);

  function selectRecord(record: EducationRecord | undefined) {
    setSelectedId(record?.id ?? "");
    setDeletePending(false);
    if (!record) {
      setForm(null);
      setInitialForm(null);
      setOriginalDraft({});
      setDraftText("{}");
      return;
    }
    const nextForm = formFor(record);
    const draft = record.draft?.[locale] ?? {};
    setForm(nextForm);
    setInitialForm(nextForm);
    setOriginalDraft(draft);
    setDraftText(JSON.stringify(draft, null, 2));
  }

  useEffect(() => {
    const controller = new AbortController();
    async function loadRecords() {
      try {
        const response = await adminApiFetch("/api/admin/education", {
          signal: controller.signal,
        });
        const body = await readJson(response);
        if (!response.ok) {
          throw new Error(responseMessage(body));
        }
        if (!Array.isArray(body)) {
          throw new Error("The education response was invalid.");
        }
        const parsed = body.map(parseEducation);
        if (parsed.some((record) => record === null)) {
          throw new Error("The education response was invalid.");
        }
        const valid = parsed.filter(
          (record): record is EducationRecord => record !== null,
        );
        setRecords(valid);
        const firstRecord = valid[0];
        setSelectedId(firstRecord?.id ?? "");
        if (firstRecord) {
          const firstForm = formFor(firstRecord);
          const firstDraft = firstRecord.draft?.[locales[0]] ?? {};
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
              : "Unable to load education records.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }
    void loadRecords();
    return () => controller.abort();
  }, []);

  function updateRecord(record: EducationRecord) {
    setRecords((current) =>
      current.map((item) => (item.id === record.id ? record : item)),
    );
  }

  async function createRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    const displayOrder = Number(newOrder);
    if (!Number.isInteger(displayOrder) || displayOrder < 0) {
      setError("Display order must be a non-negative integer.");
      return;
    }
    if (!validDateRange(newStartDate, newEndDate)) {
      setError("End date cannot be earlier than start date.");
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        type: newType,
        displayOrder,
        presentations: { home: false, about: false },
      };
      if (newStartDate) {
        payload.startDate = newStartDate;
      }
      if (newEndDate) {
        payload.endDate = newEndDate;
      }
      const response = await adminApiFetch("/api/admin/education", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await readJson(response);
      if (!response.ok) {
        throw new Error(responseMessage(body));
      }
      const record = parseEducation(body);
      if (!record) {
        throw new Error("The created education response was invalid.");
      }
      setRecords((current) => [...current, record]);
      selectRecord(record);
      setNewStartDate("");
      setNewEndDate("");
      setNewOrder("0");
      setNotice("Education record created.");
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Unable to create the education record.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedRecord || !form || !initialForm) {
      return;
    }
    setError("");
    setNotice("");
    const displayOrder = Number(form.displayOrder);
    if (!Number.isInteger(displayOrder) || displayOrder < 0) {
      setError("Display order must be a non-negative integer.");
      return;
    }
    if (!validDateRange(form.startDate, form.endDate)) {
      setError("End date cannot be earlier than start date.");
      return;
    }
    if (
      (initialForm.startDate && !form.startDate) ||
      (initialForm.endDate && !form.endDate)
    ) {
      setError("The API does not support clearing an existing date.");
      return;
    }
    const changes = removeEmptyObjects(diffJsonValue(form, initialForm));
    if (!isJsonRecord(changes) || Object.keys(changes).length === 0) {
      setError("There are no education settings changes to save.");
      return;
    }
    if (Object.hasOwn(changes, "displayOrder")) {
      changes.displayOrder = displayOrder;
    }
    setSaving(true);
    try {
      const response = await adminApiFetch(
        `/api/admin/education/${selectedRecord.id}`,
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
      const record = parseEducation(body);
      if (!record) {
        throw new Error("The updated education response was invalid.");
      }
      updateRecord(record);
      const savedForm = formFor(record);
      setForm(savedForm);
      setInitialForm(savedForm);
      setNotice("Education settings saved.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save education settings.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteRecord() {
    if (!selectedRecord) {
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await adminApiFetch(
        `/api/admin/education/${selectedRecord.id}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        throw new Error(responseMessage(await readJson(response)));
      }
      const remaining = records.filter((record) => record.id !== selectedRecord.id);
      setRecords(remaining);
      selectRecord(remaining[0]);
      setDeletePending(false);
      setNotice("Education record deleted.");
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete the education record.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedRecord) {
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
        `/api/admin/education/${selectedRecord.id}/draft/${locale}`,
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
      const record = parseEducation(body);
      if (!record) {
        throw new Error("The saved education draft response was invalid.");
      }
      updateRecord(record);
      const savedDraft = record.draft?.[locale] ?? {};
      setOriginalDraft(savedDraft);
      setDraftText(JSON.stringify(savedDraft, null, 2));
      setNotice("Draft saved. It has not been published.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save the education draft.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function publishDraft() {
    if (!selectedRecord) {
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await adminApiFetch(
        `/api/admin/education/${selectedRecord.id}/publish/${locale}`,
        { method: "POST" },
      );
      const body = await readJson(response);
      if (!response.ok) {
        throw new Error(responseMessage(body));
      }
      const record = parseEducation(body);
      if (!record) {
        throw new Error("The published education response was invalid.");
      }
      updateRecord(record);
      setNotice(`Published ${locale.toUpperCase()} education content.`);
    } catch (publishError) {
      setError(
        publishError instanceof Error
          ? publishError.message
          : "Unable to publish the education record.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="admin-status-page">Loading education records…</p>;
  }

  return (
    <>
      <section className="admin-page-heading">
        <p className="admin-eyebrow">Content</p>
        <h2>Education</h2>
        <p>Manage education records, date ranges, localized content, and visibility.</p>
      </section>
      {error && <p className="settings-feedback is-error" role="alert">{error}</p>}
      {notice && <p className="settings-feedback is-success" role="status">{notice}</p>}

      <details className="settings-panel project-create-panel">
        <summary>Create education record</summary>
        <form className="settings-form" onSubmit={createRecord}>
          <label className="settings-control">
            <span>Type</span>
            <select
              value={newType}
              onChange={(event) => {
                if (educationTypes.includes(event.target.value as EducationType)) {
                  setNewType(event.target.value as EducationType);
                }
              }}
            >
              {educationTypes.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </label>
          <label className="settings-control">
            <span>Start date</span>
            <input
              type="date"
              value={newStartDate}
              onChange={(event) => setNewStartDate(event.target.value)}
            />
          </label>
          <label className="settings-control">
            <span>End date</span>
            <input
              type="date"
              value={newEndDate}
              onChange={(event) => setNewEndDate(event.target.value)}
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
            {saving ? "Creating…" : "Create record"}
          </button>
        </form>
      </details>

      {records.length === 0 ? (
        <section className="settings-panel"><p>No education records have been created.</p></section>
      ) : (
        <>
          <label className="settings-control project-select">
            <span>Education record</span>
            <select
              value={selectedId}
              onChange={(event) => {
                selectRecord(
                  records.find((record) => record.id === event.target.value),
                );
                setError("");
                setNotice("");
              }}
            >
              {records.map((record) => (
                <option key={record.id} value={record.id}>
                  {record.type} · {record.startDate ?? "undated"} · {record.id.slice(-6)}
                </option>
              ))}
            </select>
          </label>
          {selectedRecord && form && (
            <>
              <form className="settings-form" onSubmit={saveRecord}>
                <section className="settings-panel">
                  <div className="project-panel-heading">
                    <h3>{selectedRecord.type} · {selectedRecord.id}</h3>
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
                          onClick={deleteRecord}
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
                    <span>Type</span>
                    <select
                      value={form.type}
                      onChange={(event) => {
                        if (educationTypes.includes(event.target.value as EducationType)) {
                          setForm((current) => current && {
                            ...current,
                            type: event.target.value as EducationType,
                          });
                        }
                      }}
                    >
                      {educationTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                    </select>
                  </label>
                  <label className="settings-control">
                    <span>Start date</span>
                    <input
                      type="date"
                      value={form.startDate}
                      onChange={(event) =>
                        setForm((current) => current && {
                          ...current,
                          startDate: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label className="settings-control">
                    <span>End date</span>
                    <input
                      type="date"
                      value={form.endDate}
                      onChange={(event) =>
                        setForm((current) => current && {
                          ...current,
                          endDate: event.target.value,
                        })
                      }
                    />
                  </label>
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
                  <small>The API does not support clearing an existing date.</small>
                  <button className="admin-primary-button" disabled={saving}>
                    {saving ? "Saving…" : "Save education settings"}
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
                        selectedRecord?.draft?.[nextLocale] ?? {};
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
                  <p>Content fields: institution, title, degree, major, status, and description.</p>
                  <textarea
                    className="settings-json-editor"
                    aria-label={`${locale.toUpperCase()} education draft JSON`}
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
                {selectedRecord.published?.[locale] ? (
                  <pre>{JSON.stringify(selectedRecord.published[locale], null, 2)}</pre>
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
