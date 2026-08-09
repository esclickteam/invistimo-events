import { NextRequest, NextResponse } from "next/server";
import VenueLead from "@/models/VenueLead";
import { connectDB } from "@/lib/db";
import { requireVenueAccess } from "@/lib/venues/requireVenueAccess";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Props = {
  params: Promise<{ hallId: string }>;
};

type FileRow = {
  id: string;
  name: string;
  url: string;
  type: string;
  category: string;
  sourceId: string;
  sourceName: string;
  uploadedAt: string | null;
  size: number;
};

function pushFile(
  files: FileRow[],
  seen: Set<string>,
  row: Omit<FileRow, "id"> & { id?: string }
) {
  const url = row.url?.trim();
  if (!url) return;
  const id = row.id || `${row.category}-${row.sourceId}-${url}`;
  if (seen.has(id)) return;
  seen.add(id);
  files.push({ ...row, id, url });
}

export async function GET(req: NextRequest, { params }: Props) {
  try {
    await connectDB();
    const { hallId } = await params;
    const { ctx, error } = await requireVenueAccess(req, hallId, "files.view");
    if (error || !ctx) return error!;

    const leads = await VenueLead.find({
      hallId: ctx.venueId,
      ownerId: ctx.ownerId,
    }).lean();

    const files: FileRow[] = [];
    const seen = new Set<string>();

    for (const lead of leads) {
      const leadId = String((lead as any)._id);
      const leadName = String((lead as any).name || "ליד");

      const proposal = (lead as any).proposalFile;
      if (proposal?.url) {
        pushFile(files, seen, {
          name:
            proposal.originalName ||
            (lead as any).proposalFileName ||
            "הצעת מחיר",
          url: proposal.url,
          type: proposal.mimeType || "file",
          category: "proposal",
          sourceId: leadId,
          sourceName: leadName,
          uploadedAt: proposal.uploadedAt
            ? new Date(proposal.uploadedAt).toISOString()
            : null,
          size: Number(proposal.size || 0),
        });
      }

      const contract = (lead as any).contractFile;
      if (contract?.url) {
        pushFile(files, seen, {
          name:
            contract.originalName ||
            (lead as any).contractFileName ||
            "חוזה",
          url: contract.url,
          type: contract.mimeType || "file",
          category: "contract",
          sourceId: leadId,
          sourceName: leadName,
          uploadedAt: contract.uploadedAt
            ? new Date(contract.uploadedAt).toISOString()
            : null,
          size: Number(contract.size || 0),
        });
      }
    }

    files.sort((a, b) => {
      const aTime = a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0;
      const bTime = b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0;
      return bTime - aTime;
    });

    return NextResponse.json({
      success: true,
      files,
      count: files.length,
    });
  } catch (err) {
    console.error("GET files failed:", err);
    return NextResponse.json(
      { success: false, message: "טעינת קבצים נכשלה" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: Props) {
  try {
    await connectDB();
    const { hallId } = await params;
    const { ctx, error } = await requireVenueAccess(req, hallId, "files.view");
    if (error || !ctx) return error!;

    const url = new URL(req.url);
    const fileId = String(url.searchParams.get("fileId") || "").trim();
    const sourceId = String(url.searchParams.get("sourceId") || "").trim();
    const category = String(url.searchParams.get("category") || "").trim();

    if (!sourceId || !category) {
      return NextResponse.json(
        { success: false, message: "חסרים פרטי קובץ למחיקה" },
        { status: 400 }
      );
    }

    const lead = await VenueLead.findOne({
      _id: sourceId,
      hallId: ctx.venueId,
      ownerId: ctx.ownerId,
    });

    if (!lead) {
      return NextResponse.json(
        { success: false, message: "הליד לא נמצא" },
        { status: 404 }
      );
    }

    if (category === "proposal") {
      (lead as any).proposalFile = null;
      (lead as any).proposalFileName = "";
    } else if (category === "contract") {
      (lead as any).contractFile = null;
      (lead as any).contractFileName = "";
    } else {
      return NextResponse.json(
        { success: false, message: "סוג קובץ לא נתמך" },
        { status: 400 }
      );
    }

    await lead.save();

    return NextResponse.json({
      success: true,
      message: "הקובץ הוסר מהליד",
      deletedFileId: fileId,
    });
  } catch (err) {
    console.error("DELETE files failed:", err);
    return NextResponse.json(
      { success: false, message: "מחיקת קובץ נכשלה" },
      { status: 500 }
    );
  }
}
