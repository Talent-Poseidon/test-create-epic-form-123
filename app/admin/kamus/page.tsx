import { KamusManager } from "@/components/admin/kamus-manager";

export const dynamic = "force-dynamic";

export default function KamusPage() {
  return (
    <div data-testid="kamus-page-container">
      <div className="mb-6">
        <h1
          data-testid="kamus-page-nav"
          className="text-2xl font-bold text-foreground"
        >
          Kamus Potensi &amp; Kompetensi
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload, kelola, dan perbarui kamus potensi &amp; kompetensi melalui template.
        </p>
      </div>
      <KamusManager />
    </div>
  );
}
