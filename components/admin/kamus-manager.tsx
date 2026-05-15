"use client";

import React, { useEffect, useState, useRef } from "react";

interface KamusItem {
  id: string;
  code: string;
  name: string;
  type: string;
  description: string;
  behavioralIndicators: string;
}

interface RowError {
  row: number;
  errors: string[];
}

interface PreviewSummary {
  added: Array<{ code: string; name: string; type: string }>;
  changed: Array<{
    code: string;
    before: { name: string; type: string };
    after: { name: string; type: string };
  }>;
  removed: Array<{ code: string; name: string }>;
  summary: {
    addedCount: number;
    changedCount: number;
    removedCount: number;
  };
}

type AlertState =
  | { kind: "success"; message: string }
  | { kind: "error"; message: string; rowErrors?: RowError[] }
  | { kind: "info"; message: string }
  | null;

export function KamusManager() {
  const [items, setItems] = useState<KamusItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [alert, setAlert] = useState<AlertState>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploading, setUploading] = useState<boolean>(false);
  const [preview, setPreview] = useState<PreviewSummary | null>(null);
  const [pendingContent, setPendingContent] = useState<string>("");
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const updateInputRef = useRef<HTMLInputElement | null>(null);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter !== "all") params.set("type", typeFilter);
      if (search.trim()) params.set("q", search.trim());
      const res = await fetch(`/api/kamus?${params.toString()}`);
      const data: KamusItem[] = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchItems();
    }, 200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, typeFilter]);

  const readFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  };

  const handleUpload = async (file: File) => {
    setAlert(null);
    setUploading(true);
    setUploadProgress(10);
    try {
      const content = await readFile(file);
      setUploadProgress(50);
      const res = await fetch("/api/kamus/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      setUploadProgress(90);
      const data = await res.json();
      if (!res.ok) {
        setAlert({
          kind: "error",
          message: data.error || "Upload failed",
          rowErrors: data.rowErrors,
        });
      } else {
        setAlert({
          kind: "success",
          message: `${data.message} (${data.count} items). Event: ${data.event}`,
        });
        await fetchItems();
      }
    } catch (e) {
      setAlert({
        kind: "error",
        message: e instanceof Error ? e.message : "Upload failed",
      });
    } finally {
      setUploadProgress(100);
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 500);
      if (uploadInputRef.current) uploadInputRef.current.value = "";
    }
  };

  const handlePreviewUpdate = async (file: File) => {
    setAlert(null);
    try {
      const content = await readFile(file);
      setPendingContent(content);
      const res = await fetch("/api/kamus/preview-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAlert({
          kind: "error",
          message: data.error || "Preview failed",
          rowErrors: data.rowErrors,
        });
        setPreview(null);
      } else {
        setPreview(data);
      }
    } catch (e) {
      setAlert({
        kind: "error",
        message: e instanceof Error ? e.message : "Preview failed",
      });
    } finally {
      if (updateInputRef.current) updateInputRef.current.value = "";
    }
  };

  const handleConfirmUpdate = async () => {
    if (!pendingContent) return;
    try {
      const res = await fetch("/api/kamus/confirm-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: pendingContent }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAlert({ kind: "error", message: data.error || "Update failed" });
      } else {
        setAlert({
          kind: "success",
          message: `${data.message}. Event: ${data.event}`,
        });
        setPreview(null);
        setPendingContent("");
        await fetchItems();
      }
    } catch (e) {
      setAlert({
        kind: "error",
        message: e instanceof Error ? e.message : "Update failed",
      });
    }
  };

  const handleDelete = async (item: KamusItem) => {
    setAlert(null);
    try {
      const res = await fetch(`/api/kamus/${item.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setAlert({ kind: "error", message: data.error || "Delete failed" });
      } else {
        setAlert({
          kind: "success",
          message: `Deleted ${item.name}`,
        });
        await fetchItems();
      }
    } catch (e) {
      setAlert({
        kind: "error",
        message: e instanceof Error ? e.message : "Delete failed",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground">
          Upload Template
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Download the template, fill in your kamus rows, then upload the CSV.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <a
            data-testid="kamus-template-download-btn"
            href="/api/kamus/template"
            className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted"
          >
            Download Template
          </a>
          <input
            ref={uploadInputRef}
            data-testid="kamus-upload-input"
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUpload(file);
            }}
            className="text-sm"
          />
        </div>
        {uploading || uploadProgress > 0 ? (
          <div
            data-testid="kamus-upload-progress"
            className="mt-4 h-2 w-full rounded bg-muted"
          >
            <div
              className="h-2 rounded bg-primary transition-all"
              style={{ width: `${uploadProgress}%` }}
              data-testid="kamus-upload-progress-bar"
              data-progress={uploadProgress}
            />
          </div>
        ) : null}
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground">Update Kamus</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Re-upload the template to update existing kamus. Changes will be
          previewed before confirmation.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input
            ref={updateInputRef}
            data-testid="kamus-update-input"
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handlePreviewUpdate(file);
            }}
            className="text-sm"
          />
        </div>

        {preview && (
          <div
            data-testid="kamus-update-preview"
            className="mt-4 rounded-md border border-border bg-muted/30 p-4"
          >
            <h3 className="font-medium text-foreground">Preview Changes</h3>
            <ul className="mt-2 text-sm">
              <li data-testid="kamus-preview-added">
                Added: {preview.summary.addedCount}
              </li>
              <li data-testid="kamus-preview-changed">
                Changed: {preview.summary.changedCount}
              </li>
              <li data-testid="kamus-preview-removed">
                Removed: {preview.summary.removedCount}
              </li>
            </ul>
            <button
              type="button"
              data-testid="kamus-confirm-update-btn"
              onClick={handleConfirmUpdate}
              className="mt-3 inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Confirm Update
            </button>
          </div>
        )}
      </div>

      {alert && alert.kind === "success" && (
        <div
          data-testid="kamus-created-alert"
          className="rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-800"
        >
          {alert.message}
        </div>
      )}
      {alert && alert.kind === "error" && (
        <div
          data-testid="kamus-error-alert"
          className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800"
        >
          <p className="font-medium">{alert.message}</p>
          {alert.rowErrors && alert.rowErrors.length > 0 && (
            <ul
              data-testid="kamus-row-errors"
              className="mt-2 list-disc space-y-1 pl-5"
            >
              {alert.rowErrors.map((re, idx) => (
                <li
                  key={`${re.row}-${idx}`}
                  data-testid={`kamus-row-error-${re.row}`}
                >
                  Row {re.row}: {re.errors.join("; ")}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-foreground">
            Kamus Items
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <input
              data-testid="kamus-search-input"
              type="text"
              placeholder="Search by name or code"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
            />
            <select
              data-testid="kamus-type-filter"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
            >
              <option value="all">All</option>
              <option value="potensi">Potensi</option>
              <option value="kompetensi">Kompetensi</option>
            </select>
          </div>
        </div>

        <div data-testid="kamus-list-container" className="mt-4">
          {loading ? (
            <p data-testid="kamus-list-loading" className="text-sm">
              Loading...
            </p>
          ) : items.length === 0 ? (
            <p data-testid="kamus-list-empty" className="text-sm">
              No kamus items found
            </p>
          ) : (
            <ul data-testid="kamus-list" className="divide-y divide-border">
              {items.map((item) => (
                <li
                  key={item.id}
                  data-testid={`kamus-item-${item.code}`}
                  className="flex flex-wrap items-start justify-between gap-3 py-3"
                >
                  <div>
                    <p className="font-medium text-foreground">
                      <span className="font-mono text-xs text-muted-foreground">
                        {item.code}
                      </span>{" "}
                      {item.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Type:{" "}
                      <span data-testid={`kamus-item-type-${item.code}`}>
                        {item.type}
                      </span>
                    </p>
                  </div>
                  <button
                    type="button"
                    data-testid={`kamus-delete-btn-${item.code}`}
                    onClick={() => handleDelete(item)}
                    className="rounded-md border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
