import { NextRequest, NextResponse } from "next/server";
import VenueLead from "@/models/VenueLead";
import VenueFile from "@/models/VenueFile";
import { connectDB } from "@/lib/db";
import { requireVenueAccess } from "@/lib/venues/requireVenueAccess";
import { writeVenueAudit } from "@/lib/venues/audit";
import { createVenueAlert } from "@/lib/venues/alerts";
import {
  deleteVenueFileFromCloudinary,
  uploadVenueFileToCloudinary,
  VenueStorageError,
} from "@/lib/venues/storage";

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
  publicId?: string;
  storageRecordId?: string;
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

function isRealFile(value: FormDataEntryValue | null): value is File {
  return value instanceof File && value.size > 0;
}

export async function GET(req: NextRequest, { params }: Props) {
  try {
    await connectDB();
    const { hallId } = await params;
    const { ctx, error } = await requireVenueAccess(req, hallId, "files.view");
    if (error || !ctx) return error!;

    const [leads, venueFiles] = await Promise.all([
      VenueLead.find({
        hallId: ctx.venueId,
        ownerId: ctx.ownerId,
      }).lean(),
      VenueFile.find({
        venueId: ctx.venueId,
        ownerId: ctx.ownerId,
      })
        .sort({ createdAt: -1 })
        .lean(),
    ]);

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
          publicId: proposal.publicId || "",
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
          publicId: contract.publicId || "",
        });
      }
    }

    for (const vf of venueFiles as any[]) {
      pushFile(files, seen, {
        id: `venuefile-${String(vf._id)}`,
        name: vf.originalName || "קובץ",
        url: vf.url,
        type: vf.mimeType || "file",
        category: vf.kind || "document",
        sourceId: String(vf._id),
        sourceName: vf.kind === "hall_image" ? "תמונת אולם" : "מסמך אולם",
        uploadedAt: vf.createdAt ? new Date(vf.createdAt).toISOString() : null,
        size: Number(vf.size || 0),
        publicId: vf.publicId || "",
        storageRecordId: String(vf._id),
      });
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

export async function POST(req: NextRequest, { params }: Props) {
  try {
    await connectDB();
    const { hallId } = await params;
    const { ctx, error } = await requireVenueAccess(req, hallId, "files.upload");
    if (error || !ctx) return error!;

    const formData = await req.formData();
    const file = isRealFile(formData.get("file"))
      ? (formData.get("file") as File)
      : null;
    const kindRaw = String(formData.get("kind") || "document").trim();
    const kind =
      kindRaw === "contract" ||
      kindRaw === "proposal" ||
      kindRaw === "hall_image" ||
      kindRaw === "document"
        ? kindRaw
        : "other";
    const relatedLeadId = String(formData.get("relatedLeadId") || "").trim();
    const relatedEventId = String(formData.get("relatedEventId") || "").trim();

    if (!file) {
      return NextResponse.json(
        { success: false, message: "חובה להעלות קובץ" },
        { status: 400 }
      );
    }

    const uploaded = await uploadVenueFileToCloudinary({
      venueId: ctx.venueId,
      file,
      kind,
      folderSuffix: kind,
    });

    const venueFile = await VenueFile.create({
      venueId: ctx.venueId,
      ownerId: ctx.ownerId,
      kind,
      url: uploaded.url,
      publicId: uploaded.publicId,
      originalName: uploaded.originalName,
      mimeType: uploaded.mimeType,
      size: uploaded.size,
      relatedLeadId,
      relatedEventId,
      uploadedBy: ctx.auth.userId,
    });

    await writeVenueAudit({
      venueId: ctx.venueId,
      ownerId: ctx.ownerId,
      actorUserId: ctx.auth.userId,
      action: "files.upload",
      targetType: "VenueFile",
      targetId: String(venueFile._id),
      meta: {
        kind,
        originalName: uploaded.originalName,
        mimeType: uploaded.mimeType,
        size: uploaded.size,
      },
    });

    await createVenueAlert({
      ownerId: String(ctx.ownerId),
      hallId: ctx.venueId,
      title: `קובץ חדש: ${uploaded.originalName || "מסמך"}`,
      description: kind || "upload",
      tone: "emerald",
      type: "files",
      linkHref: `/venues/dashboard/halls/${encodeURIComponent(ctx.venueId)}/files`,
      dedupeKey: `file-upload:${String(venueFile._id)}`,
    });

    return NextResponse.json({
      success: true,
      message: "הקובץ הועלה בהצלחה",
      file: {
        id: String(venueFile._id),
        url: uploaded.url,
        publicId: uploaded.publicId,
        originalName: uploaded.originalName,
        mimeType: uploaded.mimeType,
        size: uploaded.size,
        kind,
        uploadedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof VenueStorageError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: error.status }
      );
    }
    console.error("POST files failed:", error);
    return NextResponse.json(
      { success: false, message: "העלאת קובץ נכשלה" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: Props) {
  try {
    await connectDB();
    const { hallId } = await params;
    const { ctx, error } = await requireVenueAccess(req, hallId, "files.delete");
    if (error || !ctx) return error!;

    const url = new URL(req.url);
    const fileId = String(url.searchParams.get("fileId") || "").trim();
    const sourceId = String(url.searchParams.get("sourceId") || "").trim();
    const category = String(url.searchParams.get("category") || "").trim();
    const storageRecordId = String(
      url.searchParams.get("storageRecordId") || ""
    ).trim();

    // VenueFile record delete (documents / hall_image)
    if (
      storageRecordId ||
      category === "document" ||
      category === "hall_image" ||
      category === "other" ||
      fileId.startsWith("venuefile-")
    ) {
      const id =
        storageRecordId ||
        (fileId.startsWith("venuefile-")
          ? fileId.replace("venuefile-", "")
          : sourceId);

      const venueFile = await VenueFile.findOne({
        _id: id,
        venueId: ctx.venueId,
        ownerId: ctx.ownerId,
      });

      if (!venueFile) {
        return NextResponse.json(
          { success: false, message: "הקובץ לא נמצא" },
          { status: 404 }
        );
      }

      try {
        await deleteVenueFileFromCloudinary(
          venueFile.publicId,
          venueFile.mimeType
        );
      } catch (storageErr) {
        console.error("Cloudinary delete failed (continuing):", storageErr);
      }

      await VenueFile.deleteOne({ _id: venueFile._id });

      await writeVenueAudit({
        venueId: ctx.venueId,
        ownerId: ctx.ownerId,
        actorUserId: ctx.auth.userId,
        action: "files.delete",
        targetType: "VenueFile",
        targetId: String(venueFile._id),
        meta: {
          kind: venueFile.kind,
          originalName: venueFile.originalName,
          publicId: venueFile.publicId,
        },
      });

      return NextResponse.json({
        success: true,
        message: "הקובץ נמחק מהמערכת ומהאחסון",
        deletedFileId: fileId || String(venueFile._id),
      });
    }

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

    let publicId = "";
    let mimeType = "";
    let originalName = "";

    if (category === "proposal") {
      publicId = String((lead as any).proposalFile?.publicId || "");
      mimeType = String((lead as any).proposalFile?.mimeType || "");
      originalName = String(
        (lead as any).proposalFile?.originalName ||
          (lead as any).proposalFileName ||
          ""
      );
      (lead as any).proposalFile = null;
      (lead as any).proposalFileName = "";
    } else if (category === "contract") {
      publicId = String((lead as any).contractFile?.publicId || "");
      mimeType = String((lead as any).contractFile?.mimeType || "");
      originalName = String(
        (lead as any).contractFile?.originalName ||
          (lead as any).contractFileName ||
          ""
      );
      (lead as any).contractFile = null;
      (lead as any).contractFileName = "";
    } else {
      return NextResponse.json(
        { success: false, message: "סוג קובץ לא נתמך" },
        { status: 400 }
      );
    }

    if (publicId) {
      try {
        await deleteVenueFileFromCloudinary(publicId, mimeType);
      } catch (storageErr) {
        console.error("Cloudinary delete failed (continuing):", storageErr);
      }

      // Also remove matching VenueFile rows if present
      await VenueFile.deleteMany({
        venueId: ctx.venueId,
        ownerId: ctx.ownerId,
        publicId,
      });
    }

    await lead.save();

    await writeVenueAudit({
      venueId: ctx.venueId,
      ownerId: ctx.ownerId,
      actorUserId: ctx.auth.userId,
      action: "files.delete",
      targetType: "VenueLead",
      targetId: sourceId,
      meta: { category, originalName, publicId: publicId || undefined },
    });

    return NextResponse.json({
      success: true,
      message: "הקובץ הוסר מהליד ומהאחסון",
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
