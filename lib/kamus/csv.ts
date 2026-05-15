export interface KamusRow {
  code: string;
  name: string;
  type: string;
  description: string;
  behavioralIndicators: string;
}

export interface KamusRowError {
  row: number;
  errors: string[];
}

export interface KamusParseResult {
  rows: KamusRow[];
  errors: KamusRowError[];
}

const REQUIRED_HEADERS = [
  "code",
  "name",
  "type",
  "description",
  "behavioralIndicators",
];

export const KAMUS_TEMPLATE_HEADERS = REQUIRED_HEADERS.join(",");

export const KAMUS_TEMPLATE_CSV = [
  KAMUS_TEMPLATE_HEADERS,
  `K-001,Komunikasi,kompetensi,"Kemampuan menyampaikan ide secara jelas","Berbicara terstruktur; Mendengarkan aktif"`,
  `P-001,Logika,potensi,"Kemampuan berpikir logis","Memecahkan masalah; Menarik kesimpulan"`,
].join("\n");

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        result.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }
  result.push(current);
  return result.map((v) => v.trim());
}

export function parseKamusCsv(content: string): KamusParseResult {
  const errors: KamusRowError[] = [];
  const rows: KamusRow[] = [];

  const normalized = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (!normalized) {
    return {
      rows: [],
      errors: [{ row: 0, errors: ["File is empty"] }],
    };
  }

  const lines = normalized.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length === 0) {
    return {
      rows: [],
      errors: [{ row: 0, errors: ["File is empty"] }],
    };
  }

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
  const missingHeaders = REQUIRED_HEADERS.filter(
    (h) => !headers.includes(h.toLowerCase())
  );
  if (missingHeaders.length > 0) {
    return {
      rows: [],
      errors: [
        {
          row: 0,
          errors: [`Missing required columns: ${missingHeaders.join(", ")}`],
        },
      ],
    };
  }

  const headerIndex = (name: string) =>
    headers.findIndex((h) => h === name.toLowerCase());
  const idxCode = headerIndex("code");
  const idxName = headerIndex("name");
  const idxType = headerIndex("type");
  const idxDesc = headerIndex("description");
  const idxInd = headerIndex("behavioralIndicators");

  const seenCodes = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    const rowNum = i + 1;
    const cols = parseCsvLine(lines[i]);
    const rowErrors: string[] = [];

    const code = (cols[idxCode] || "").trim();
    const name = (cols[idxName] || "").trim();
    const type = (cols[idxType] || "").trim().toLowerCase();
    const description = (cols[idxDesc] || "").trim();
    const indicators = (cols[idxInd] || "").trim();

    if (!code) rowErrors.push("code is required");
    if (!name) rowErrors.push("name is required");
    if (!type) {
      rowErrors.push("type is required");
    } else if (type !== "potensi" && type !== "kompetensi") {
      rowErrors.push("type must be 'potensi' or 'kompetensi'");
    }
    if (!description) rowErrors.push("description is required");
    if (!indicators) rowErrors.push("behavioralIndicators is required");

    if (code && seenCodes.has(code)) {
      rowErrors.push(`duplicate code '${code}' in file`);
    }
    if (code) seenCodes.add(code);

    if (rowErrors.length > 0) {
      errors.push({ row: rowNum, errors: rowErrors });
    } else {
      rows.push({
        code,
        name,
        type,
        description,
        behavioralIndicators: indicators,
      });
    }
  }

  return { rows, errors };
}
