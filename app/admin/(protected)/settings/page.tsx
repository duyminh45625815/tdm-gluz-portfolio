"use client";

import { useEffect, useState } from "react";
import { locales, type Locale } from "@/locales";
import {
  diffJsonValue,
  isJsonRecord,
  removeEmptyObjects,
} from "@/lib/admin-api/patch";
import { adminApiFetch } from "@/lib/admin-api/client";

type LocalizedText = Partial<Record<Locale, string>>;
type SiteSettings = {
  identity?: {
    name?: LocalizedText;
    title?: LocalizedText;
    tagline?: LocalizedText;
  };
  contact?: {
    email?: string;
    phone?: string;
    location?: LocalizedText;
    socialLinks?: Record<string, string>;
  };
  localization: {
    defaultLocale: Locale | "";
    supportedLocales: Locale[];
  };
  translations?: {
    navigation?: Record<string, LocalizedText>;
    footer?: Record<string, LocalizedText>;
    shared?: Record<string, LocalizedText>;
  };
};

type TranslationGroup = "navigation" | "footer" | "shared";
type LocalizedIdentityField = "name" | "title" | "tagline";

const translationGroups: { key: TranslationGroup; title: string }[] = [
  { key: "navigation", title: "Navigation" },
  { key: "footer", title: "Footer" },
  { key: "shared", title: "Shared labels" },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isLocale(value: unknown): value is Locale {
  return (
    typeof value === "string" &&
    (locales as readonly string[]).includes(value)
  );
}

function isLocalizedText(value: unknown): value is LocalizedText {
  return (
    isRecord(value) &&
    Object.entries(value).every(
      ([locale, text]) =>
        isLocale(locale) && typeof text === "string" && text.length <= 2000,
    )
  );
}

function isLocalizedTextMap(
  value: unknown,
): value is Record<string, LocalizedText> {
  return (
    isRecord(value) &&
    Object.entries(value).length <= 50 &&
    Object.entries(value).every(
      ([key, localized]) =>
        /^[A-Za-z0-9_-]{1,64}$/.test(key) &&
        !["__proto__", "constructor", "prototype"].includes(key) &&
        isLocalizedText(localized),
    )
  );
}

function isStringMap(value: unknown): value is Record<string, string> {
  return (
    isRecord(value) &&
    Object.entries(value).length <= 50 &&
    Object.entries(value).every(
      ([key, text]) =>
        /^[A-Za-z0-9_-]{1,64}$/.test(key) &&
        !["__proto__", "constructor", "prototype"].includes(key) &&
        typeof text === "string" &&
        text.length <= 2048,
    )
  );
}

function parseSettings(value: unknown): SiteSettings | null {
  if (
    !isRecord(value) ||
    !isRecord(value.localization) ||
    !isLocale(value.localization.defaultLocale) ||
    !Array.isArray(value.localization.supportedLocales) ||
    !value.localization.supportedLocales.every(isLocale) ||
    value.localization.supportedLocales.length !== locales.length
  ) {
    return null;
  }

  const parsed: SiteSettings = {
    localization: {
      defaultLocale: value.localization.defaultLocale,
      supportedLocales: value.localization.supportedLocales,
    },
  };

  if (value.identity !== undefined) {
    if (!isRecord(value.identity)) {
      return null;
    }
    const identity: NonNullable<SiteSettings["identity"]> = {};
    for (const field of ["name", "title", "tagline"] as const) {
      const localized = value.identity[field];
      if (localized !== undefined) {
        if (!isLocalizedText(localized)) {
          return null;
        }
        identity[field] = localized;
      }
    }
    parsed.identity = identity;
  }

  if (value.contact !== undefined) {
    if (!isRecord(value.contact)) {
      return null;
    }
    const contact: NonNullable<SiteSettings["contact"]> = {};
    if (value.contact.email !== undefined) {
      if (typeof value.contact.email !== "string") {
        return null;
      }
      contact.email = value.contact.email;
    }
    if (value.contact.phone !== undefined) {
      if (typeof value.contact.phone !== "string") {
        return null;
      }
      contact.phone = value.contact.phone;
    }
    if (value.contact.location !== undefined) {
      if (!isLocalizedText(value.contact.location)) {
        return null;
      }
      contact.location = value.contact.location;
    }
    if (value.contact.socialLinks !== undefined) {
      if (!isStringMap(value.contact.socialLinks)) {
        return null;
      }
      contact.socialLinks = value.contact.socialLinks;
    }
    parsed.contact = contact;
  }

  if (value.translations !== undefined) {
    if (!isRecord(value.translations)) {
      return null;
    }
    const translations: NonNullable<SiteSettings["translations"]> = {};
    for (const group of ["navigation", "footer", "shared"] as const) {
      const localizedMap = value.translations[group];
      if (localizedMap !== undefined) {
        if (!isLocalizedTextMap(localizedMap)) {
          return null;
        }
        translations[group] = localizedMap;
      }
    }
    parsed.translations = translations;
  }

  return parsed;
}

function blankSettings(): SiteSettings {
  return {
    localization: {
      defaultLocale: "",
      supportedLocales: [...locales],
    },
  };
}

function responseMessage(value: unknown): string {
  return isRecord(value) && typeof value.message === "string"
    ? value.message
    : "The request could not be completed.";
}

function LocalizedFields({
  title,
  value,
  onChange,
}: {
  title: string;
  value: LocalizedText | undefined;
  onChange: (locale: Locale, text: string) => void;
}) {
  return (
    <fieldset className="settings-localized-field">
      <legend>{title}</legend>
      <div className="settings-locale-grid">
        {locales.map((locale) => (
          <label key={locale}>
            <span>{locale.toUpperCase()}</span>
            <input
              maxLength={2000}
              value={value?.[locale] ?? ""}
              onChange={(event) => onChange(locale, event.target.value)}
            />
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function MapEditor({
  title,
  values,
  onChange,
}: {
  title: string;
  values: Record<string, string> | undefined;
  onChange: (key: string, value: string) => void;
}) {
  const [newKey, setNewKey] = useState("");
  const entries = Object.entries(values ?? {});

  function addKey() {
    const key = newKey.trim();
    if (
      !/^[A-Za-z0-9_-]{1,64}$/.test(key) ||
      ["__proto__", "constructor", "prototype"].includes(key) ||
      Object.hasOwn(values ?? {}, key) ||
      entries.length >= 50
    ) {
      return;
    }
    onChange(key, "");
    setNewKey("");
  }

  return (
    <fieldset className="settings-map-field">
      <legend>{title}</legend>
      {entries.map(([key, value]) => (
        <label className="settings-map-row" key={key}>
          <span>{key}</span>
          <input
            maxLength={2048}
            value={value}
            onChange={(event) => onChange(key, event.target.value)}
          />
        </label>
      ))}
      <div className="settings-add-row">
        <input
          aria-label={`New ${title} key`}
          maxLength={64}
          placeholder="New key"
          value={newKey}
          onChange={(event) => setNewKey(event.target.value)}
        />
        <button
          className="admin-secondary-button"
          type="button"
          onClick={addKey}
          disabled={entries.length >= 50}
        >
          Add key
        </button>
      </div>
      <small>Keys may contain letters, numbers, underscores, and hyphens.</small>
    </fieldset>
  );
}

function TranslationEditor({
  title,
  values,
  onChange,
  onAddKey,
  canAdd,
}: {
  title: string;
  values: Record<string, LocalizedText> | undefined;
  onChange: (key: string, locale: Locale, text: string) => void;
  onAddKey: (key: string) => void;
  canAdd: boolean;
}) {
  const [newKey, setNewKey] = useState("");

  function addKey() {
    const key = newKey.trim();
    if (
      !/^[A-Za-z0-9_-]{1,64}$/.test(key) ||
      ["__proto__", "constructor", "prototype"].includes(key) ||
      Object.hasOwn(values ?? {}, key) ||
      Object.keys(values ?? {}).length >= 50
    ) {
      return;
    }
    onAddKey(key);
    setNewKey("");
  }

  return (
    <section className="settings-translation-group">
      <h3>{title}</h3>
      {Object.entries(values ?? {}).map(([key, localized]) => (
        <LocalizedFields
          key={key}
          title={key}
          value={localized}
          onChange={(locale, text) => onChange(key, locale, text)}
        />
      ))}
      <div className="settings-add-row">
        <input
          aria-label={`New ${title} translation key`}
          maxLength={64}
          placeholder="New key"
          value={newKey}
          onChange={(event) => setNewKey(event.target.value)}
        />
        <button
          className="admin-secondary-button"
          type="button"
          onClick={addKey}
          disabled={!canAdd}
        >
          Add key
        </button>
      </div>
      <small>Keys may contain letters, numbers, underscores, and hyphens.</small>
    </section>
  );
}

export default function SiteSettingsPage() {
  const [settings, setSettings] = useState<SiteSettings>(blankSettings);
  const [initialSettings, setInitialSettings] = useState<SiteSettings | null>(
    null,
  );
  const [exists, setExists] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function loadSettings() {
      try {
        const response = await adminApiFetch("/api/admin/site-settings", {
          signal: controller.signal,
        });
        if (response.status === 404) {
          setExists(false);
          setSettings(blankSettings());
          setInitialSettings(null);
          return;
        }
        const body: unknown = await response.json();
        if (!response.ok) {
          throw new Error(responseMessage(body));
        }
        const parsed = parseSettings(body);
        if (!parsed) {
          throw new Error("The site settings response was invalid.");
        }
        setSettings(parsed);
        setInitialSettings(parsed);
        setExists(true);
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load site settings.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadSettings();
    return () => controller.abort();
  }, []);

  function setIdentity(
    field: LocalizedIdentityField,
    locale: Locale,
    text: string,
  ) {
    setSettings((current) => ({
      ...current,
      identity: {
        ...current.identity,
        [field]: { ...current.identity?.[field], [locale]: text },
      },
    }));
  }

  function setContactLocation(locale: Locale, text: string) {
    setSettings((current) => ({
      ...current,
      contact: {
        ...current.contact,
        location: { ...current.contact?.location, [locale]: text },
      },
    }));
  }

  function setSocialLink(key: string, value: string) {
    setSettings((current) => ({
      ...current,
      contact: {
        ...current.contact,
        socialLinks: { ...current.contact?.socialLinks, [key]: value },
      },
    }));
  }

  function setTranslation(
    group: TranslationGroup,
    key: string,
    locale: Locale,
    text: string,
  ) {
    setSettings((current) => ({
      ...current,
      translations: {
        ...current.translations,
        [group]: {
          ...current.translations?.[group],
          [key]: {
            ...current.translations?.[group]?.[key],
            [locale]: text,
          },
        },
      },
    }));
  }

  function addTranslationKey(group: TranslationGroup, key: string) {
    setSettings((current) => ({
      ...current,
      translations: {
        ...current.translations,
        [group]: { ...current.translations?.[group], [key]: {} },
      },
    }));
  }

  async function saveSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!isLocale(settings.localization.defaultLocale)) {
      setError("Choose a supported default locale before saving.");
      return;
    }

    if (
      settings.contact?.email !== initialSettings?.contact?.email &&
      !settings.contact?.email?.trim()
    ) {
      setError("Enter a valid email address; the API does not support clearing this field.");
      return;
    }

    const cleanedChanges = removeEmptyObjects(
      diffJsonValue(settings, initialSettings),
    );
    if (!isJsonRecord(cleanedChanges) || Object.keys(cleanedChanges).length === 0) {
      setError(exists ? "There are no changes to save." : "Add settings to initialize the site.");
      return;
    }
    const changed = cleanedChanges;

    setSaving(true);
    try {
      const response = await adminApiFetch("/api/admin/site-settings", {
        method: exists ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changed),
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        throw new Error(responseMessage(body));
      }
      const parsed = parseSettings(body);
      if (!parsed) {
        throw new Error("The saved site settings response was invalid.");
      }
      setSettings(parsed);
      setInitialSettings(parsed);
      setExists(true);
      setNotice("Site settings saved.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save site settings.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="admin-status-page">Loading site settings…</p>;
  }

  return (
    <>
      <section className="admin-page-heading">
        <p className="admin-eyebrow">Configuration</p>
        <h2>Site Settings</h2>
        <p>Update site identity, contact details, locale, and shared text.</p>
      </section>
      {error && <p className="settings-feedback is-error" role="alert">{error}</p>}
      {notice && <p className="settings-feedback is-success" role="status">{notice}</p>}
      <form className="settings-form" onSubmit={saveSettings}>
        <section className="settings-panel">
          <h3>Localization</h3>
          <label className="settings-control">
            <span>Default locale</span>
            <select
              value={settings.localization.defaultLocale}
              onChange={(event) => {
                const locale = event.target.value;
                if (isLocale(locale)) {
                  setSettings((current) => ({
                    ...current,
                    localization: {
                      ...current.localization,
                      defaultLocale: locale,
                    },
                  }));
                }
              }}
            >
              <option value="">Select a locale</option>
              {locales.map((locale) => (
                <option key={locale} value={locale}>
                  {locale.toUpperCase()}
                </option>
              ))}
            </select>
          </label>
          <p>Supported locales: {locales.map((locale) => locale.toUpperCase()).join(", ")}</p>
        </section>

        <section className="settings-panel">
          <h3>Site identity</h3>
          <LocalizedFields
            title="Name"
            value={settings.identity?.name}
            onChange={(locale, text) => setIdentity("name", locale, text)}
          />
          <LocalizedFields
            title="Title"
            value={settings.identity?.title}
            onChange={(locale, text) => setIdentity("title", locale, text)}
          />
          <LocalizedFields
            title="Tagline"
            value={settings.identity?.tagline}
            onChange={(locale, text) => setIdentity("tagline", locale, text)}
          />
        </section>

        <section className="settings-panel">
          <h3>Contact</h3>
          <label className="settings-control">
            <span>Email</span>
            <input
              type="email"
              maxLength={254}
              value={settings.contact?.email ?? ""}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  contact: { ...current.contact, email: event.target.value },
                }))
              }
            />
          </label>
          <label className="settings-control">
            <span>Phone</span>
            <input
              maxLength={64}
              value={settings.contact?.phone ?? ""}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  contact: { ...current.contact, phone: event.target.value },
                }))
              }
            />
          </label>
          <LocalizedFields
            title="Location"
            value={settings.contact?.location}
            onChange={setContactLocation}
          />
          <MapEditor
            title="Social links"
            values={settings.contact?.socialLinks}
            onChange={setSocialLink}
          />
        </section>

        <section className="settings-panel">
          <h3>Translations</h3>
          {translationGroups.map(({ key, title }) => (
            <TranslationEditor
              key={key}
              title={title}
              values={settings.translations?.[key]}
              onChange={(translationKey, locale, text) =>
                setTranslation(key, translationKey, locale, text)
              }
              onAddKey={(translationKey) =>
                addTranslationKey(key, translationKey)
              }
              canAdd={Object.keys(settings.translations?.[key] ?? {}).length < 50}
            />
          ))}
        </section>

        <button className="admin-primary-button" type="submit" disabled={saving}>
          {saving ? "Saving…" : exists ? "Save changes" : "Initialize settings"}
        </button>
      </form>
    </>
  );
}
