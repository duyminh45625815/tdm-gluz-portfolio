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

const categories = ["academic", "professional", "personal", "other"] as const;
type ProjectCategory = (typeof categories)[number];
type ProjectContent = Record<string, unknown>;
type Project = {
  slug: string;
  category: ProjectCategory;
  displayOrder: number;
  links?: { github?: string; demo?: string; figma?: string };
  presentations?: { home?: boolean; about?: boolean };
  draft?: Partial<Record<Locale, ProjectContent>>;
  published?: Partial<Record<Locale, ProjectContent>>;
};
type ProjectForm = {
  category: ProjectCategory;
  displayOrder: string;
  links: { github: string; demo: string; figma: string };
  presentations: { home: boolean; about: boolean };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseProject(value: unknown): Project | null {
  if (
    !isRecord(value) ||
    typeof value.slug !== "string" ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.slug) ||
    typeof value.category !== "string" ||
    !categories.includes(value.category as ProjectCategory) ||
    typeof value.displayOrder !== "number" ||
    !Number.isInteger(value.displayOrder) ||
    value.displayOrder < 0
  ) {
    return null;
  }

  function parseContentMap(
    map: unknown,
  ): Partial<Record<Locale, ProjectContent>> | undefined | null {
    if (map === undefined) {
      return undefined;
    }
    if (!isRecord(map)) {
      return null;
    }
    const result: Partial<Record<Locale, ProjectContent>> = {};
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

  let links: Project["links"];
  if (value.links !== undefined) {
    if (!isRecord(value.links)) {
      return null;
    }
    links = {};
    for (const key of ["github", "demo", "figma"] as const) {
      if (value.links[key] !== undefined) {
        if (typeof value.links[key] !== "string") {
          return null;
        }
        links[key] = value.links[key];
      }
    }
  }

  let presentations: Project["presentations"];
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
    slug: value.slug,
    category: value.category as ProjectCategory,
    displayOrder: value.displayOrder,
    links,
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

function projectForm(project: Project): ProjectForm {
  return {
    category: project.category,
    displayOrder: String(project.displayOrder),
    links: {
      github: project.links?.github ?? "",
      demo: project.links?.demo ?? "",
      figma: project.links?.figma ?? "",
    },
    presentations: {
      home: project.presentations?.home ?? false,
      about: project.presentations?.about ?? false,
    },
  };
}

export default function ProjectsAdminPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [locale, setLocale] = useState<Locale>(locales[0]);
  const [form, setForm] = useState<ProjectForm | null>(null);
  const [initialForm, setInitialForm] = useState<ProjectForm | null>(null);
  const [draftText, setDraftText] = useState("{}");
  const [originalDraft, setOriginalDraft] = useState<ProjectContent>({});
  const [newSlug, setNewSlug] = useState("");
  const [newCategory, setNewCategory] = useState<ProjectCategory>("personal");
  const [newOrder, setNewOrder] = useState("0");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const selectedProject = projects.find(
    (project) => project.slug === selectedSlug,
  );

  function selectProject(project: Project | undefined) {
    setSelectedSlug(project?.slug ?? "");
    setDeletePending(false);
    if (!project) {
      setForm(null);
      setInitialForm(null);
      setOriginalDraft({});
      setDraftText("{}");
      return;
    }
    const nextForm = projectForm(project);
    const draft = project.draft?.[locale] ?? {};
    setForm(nextForm);
    setInitialForm(nextForm);
    setOriginalDraft(draft);
    setDraftText(JSON.stringify(draft, null, 2));
  }

  useEffect(() => {
    const controller = new AbortController();
    async function loadProjects() {
      try {
        const response = await adminApiFetch("/api/admin/projects", {
          signal: controller.signal,
        });
        const body = await readJson(response);
        if (!response.ok) {
          throw new Error(responseMessage(body));
        }
        if (!Array.isArray(body)) {
          throw new Error("The projects response was invalid.");
        }
        const parsed = body.map(parseProject);
        if (parsed.some((project) => project === null)) {
          throw new Error("The projects response was invalid.");
        }
        const validProjects = parsed.filter(
          (project): project is Project => project !== null,
        );
        setProjects(validProjects);
        const firstProject = validProjects[0];
        setSelectedSlug(firstProject?.slug ?? "");
        if (firstProject) {
          const firstForm = projectForm(firstProject);
          const firstDraft = firstProject.draft?.[locales[0]] ?? {};
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
              : "Unable to load projects.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }
    void loadProjects();
    return () => controller.abort();
  }, []);

  function updateProject(project: Project) {
    setProjects((current) =>
      current.map((item) => (item.slug === project.slug ? project : item)),
    );
  }

  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    const slug = newSlug.trim();
    const displayOrder = Number(newOrder);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      setError("Use a lowercase slug with letters, numbers, and hyphens.");
      return;
    }
    if (!Number.isInteger(displayOrder) || displayOrder < 0) {
      setError("Display order must be a non-negative integer.");
      return;
    }

    setSaving(true);
    try {
      const response = await adminApiFetch("/api/admin/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          category: newCategory,
          displayOrder,
          presentations: { home: false, about: false },
        }),
      });
      const body = await readJson(response);
      if (!response.ok) {
        throw new Error(responseMessage(body));
      }
      const project = parseProject(body);
      if (!project) {
        throw new Error("The created project response was invalid.");
      }
      setProjects((current) =>
        [...current, project].sort(
          (left, right) =>
            left.displayOrder - right.displayOrder ||
            left.slug.localeCompare(right.slug),
        ),
      );
      selectProject(project);
      setNewSlug("");
      setNotice("Project created.");
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Unable to create the project.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProject || !form || !initialForm) {
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
      setError("There are no project settings changes to save.");
      return;
    }
    if (Object.hasOwn(changes, "displayOrder")) {
      changes.displayOrder = displayOrder;
    }

    setSaving(true);
    try {
      const response = await adminApiFetch(
        `/api/admin/projects/${selectedProject.slug}`,
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
      const project = parseProject(body);
      if (!project) {
        throw new Error("The updated project response was invalid.");
      }
      updateProject(project);
      const savedForm = projectForm(project);
      setForm(savedForm);
      setInitialForm(savedForm);
      setNotice("Project settings saved.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save project settings.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteProject() {
    if (!selectedProject) {
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await adminApiFetch(
        `/api/admin/projects/${selectedProject.slug}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        throw new Error(responseMessage(await readJson(response)));
      }
      const remaining = projects.filter(
        (project) => project.slug !== selectedProject.slug,
      );
      setProjects(remaining);
      selectProject(remaining[0]);
      setDeletePending(false);
      setNotice("Project deleted.");
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete the project.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProject) {
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
        `/api/admin/projects/${selectedProject.slug}/draft/${locale}`,
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
      const project = parseProject(body);
      if (!project) {
        throw new Error("The saved project draft response was invalid.");
      }
      updateProject(project);
      const savedDraft = project.draft?.[locale] ?? {};
      setOriginalDraft(savedDraft);
      setDraftText(JSON.stringify(savedDraft, null, 2));
      setNotice("Draft saved. It has not been published.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save the project draft.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function publishDraft() {
    if (!selectedProject) {
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await adminApiFetch(
        `/api/admin/projects/${selectedProject.slug}/publish/${locale}`,
        { method: "POST" },
      );
      const body = await readJson(response);
      if (!response.ok) {
        throw new Error(responseMessage(body));
      }
      const project = parseProject(body);
      if (!project) {
        throw new Error("The published project response was invalid.");
      }
      updateProject(project);
      setNotice(`Published ${locale.toUpperCase()} project content.`);
    } catch (publishError) {
      setError(
        publishError instanceof Error
          ? publishError.message
          : "Unable to publish the project.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="admin-status-page">Loading projects…</p>;
  }

  return (
    <>
      <section className="admin-page-heading">
        <p className="admin-eyebrow">Content</p>
        <h2>Projects</h2>
        <p>Manage project records, localized drafts, and presentation order.</p>
      </section>
      {error && <p className="settings-feedback is-error" role="alert">{error}</p>}
      {notice && <p className="settings-feedback is-success" role="status">{notice}</p>}

      <details className="settings-panel project-create-panel">
        <summary>Create project</summary>
        <form className="settings-form" onSubmit={createProject}>
          <label className="settings-control">
            <span>Slug</span>
            <input
              required
              maxLength={100}
              value={newSlug}
              onChange={(event) => setNewSlug(event.target.value)}
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
            />
          </label>
          <label className="settings-control">
            <span>Category</span>
            <select
              value={newCategory}
              onChange={(event) => {
                if (categories.includes(event.target.value as ProjectCategory)) {
                  setNewCategory(event.target.value as ProjectCategory);
                }
              }}
            >
              {categories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
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
            {saving ? "Creating…" : "Create project"}
          </button>
        </form>
      </details>

      {projects.length === 0 ? (
        <section className="settings-panel">
          <p>No projects have been created.</p>
        </section>
      ) : (
        <>
          <label className="settings-control project-select">
            <span>Project</span>
            <select
              value={selectedSlug}
              onChange={(event) => {
                selectProject(
                  projects.find(
                    (project) => project.slug === event.target.value,
                  ),
                );
                setDeletePending(false);
                setError("");
                setNotice("");
              }}
            >
              {projects.map((project) => (
                <option key={project.slug} value={project.slug}>
                  {project.slug} · {project.displayOrder}
                </option>
              ))}
            </select>
          </label>

          {selectedProject && form && (
            <>
              <form className="settings-form" onSubmit={saveProject}>
                <section className="settings-panel">
                  <div className="project-panel-heading">
                    <h3>{selectedProject.slug}</h3>
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
                          onClick={deleteProject}
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
                    <span>Category</span>
                    <select
                      value={form.category}
                      onChange={(event) => {
                        if (categories.includes(event.target.value as ProjectCategory)) {
                          setForm((current) => current && {
                            ...current,
                            category: event.target.value as ProjectCategory,
                          });
                        }
                      }}
                    >
                      {categories.map((category) => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
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
                  {(["github", "demo", "figma"] as const).map((link) => (
                    <label className="settings-control" key={link}>
                      <span>{link}</span>
                      <input
                        maxLength={2048}
                        value={form.links[link]}
                        onChange={(event) =>
                          setForm((current) => current && {
                            ...current,
                            links: {
                              ...current.links,
                              [link]: event.target.value,
                            },
                          })
                        }
                      />
                    </label>
                  ))}
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
                    {saving ? "Saving…" : "Save project settings"}
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
                          selectedProject?.draft?.[nextLocale] ?? {};
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
                  <p>Project content fields: title, subtitle, description, deliverables, and role.</p>
                  <textarea
                    className="settings-json-editor"
                    aria-label={`${locale.toUpperCase()} project draft JSON`}
                    spellCheck={false}
                    value={draftText}
                    onChange={(event) => setDraftText(event.target.value)}
                  />
                  <small>Saving updates only this locale&apos;s draft. It does not publish or remove fields.</small>
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
                {selectedProject.published?.[locale] ? (
                  <pre>{JSON.stringify(selectedProject.published[locale], null, 2)}</pre>
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
