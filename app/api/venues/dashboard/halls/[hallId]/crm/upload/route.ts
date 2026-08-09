import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import VenueLead from "@/models/VenueLead";
import VenueFile, { type VenueFileKind } from "@/models/VenueFile";
import { requireVenueAccess } from "@/lib/venues/requireVenueAccess";
import { writeVenueAudit } from "@/lib/venues/audit";
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

const CRM_UPLOAD_KINDS = ["proposal", "contract"] as const;
type CrmUploadKind = (typeof CRM_UPLOAD_KINDS)[number];

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function isCrmUploadKind(value: string): value is CrmUploadKind {
  return (CRM_UPLOAD_KINDS as readonly string[]).includes(value);
}

function isRealFile(value: FormDataEntryValue | null): value is File {
  return value instanceof File && value.size > 0;
}

function serializeLeadFileMeta(lead: any, kind: CrmUploadKind) {
  if (kind === "proposal") {
    return {
      proposalFileName: lead.proposalFileName || "",
      proposalFile: lead.proposalFile || null,
    };
  }

  return {
    contractFileName: lead.contractFileName || "",
    contractFile: lead.contractFile || null,
  };
}

/* ======================================================
   POST — upload proposal/contract for CRM lead
====================================================== */
export async function POST(req: NextRequest, { params }: Props) {
  try {
    await connectDB();

    const { hallId } = await params;

    const { ctx, error } = await requireVenueAccess(req, hallId, [
      "files.upload",
      "leads.edit",
    ]);
    if (error || !ctx) return error!;

    const formData = await req.formData();

    const leadId = cleanString(formData.get("leadId"));
    const kindRaw = cleanString(formData.get("kind"));

    if (!leadId) {
      return NextResponse.json(
        { success: false, message: "חסר מזהה ליד" },
        { status: 400 }
      );
    }

    if (!isCrmUploadKind(kindRaw)) {
      return NextResponse.json(
        {
          success: false,
          message: "סוג קובץ לא תקין (proposal או contract)",
        },
        { status: 400 }
      );
    }

    const file = isRealFile(formData.get("file"))
      ? (formData.get("file") as File)
      : null;

    if (!file) {
      return NextResponse.json(
        { success: false, message: "חובה להעלות קובץ" },
        { status: 400 }
      );
    }

    const lead = await VenueLead.findOne({
      _id: leadId,
      ownerId: ctx.ownerId,
      hallId: ctx.venueId,
    });

    if (!lead) {
      return NextResponse.json(
        { success: false, message: "הליד לא נמצא" },
        { status: 404 }
      );
    }

    const kind: VenueFileKind = kindRaw;

    const previousFile =
      kind === "proposal" ? lead.proposalFile : lead.contractFile;

    const uploaded = await uploadVenueFileToCloudinary({
      venueId: ctx.venueId,
      file,
      kind,
      folderSuffix: `crm/${kind}`,
    });

    const fileMeta = {
      url: uploaded.url,
      publicId: uploaded.publicId,
      originalName: uploaded.originalName,
      mimeType: uploaded.mimeType,
      size: uploaded.size,
      uploadedAt: new Date(),
      uploadedBy: ctx.auth.userId,
    };

    if (kind === "proposal") {
      lead.proposalFile = fileMeta as any;
      lead.proposalFileName = uploaded.originalName;
    } else {
      lead.contractFile = fileMeta as any;
      lead.contractFileName = uploaded.originalName;
    }

    await lead.save();

    const venueFile = await VenueFile.create({
      venueId: ctx.venueId,
      ownerId: ctx.ownerId,
      kind,
      url: uploaded.url,
      publicId: uploaded.publicId,
      originalName: uploaded.originalName,
      mimeType: uploaded.mimeType,
      size: uploaded.size,
      relatedLeadId: leadId,
      uploadedBy: ctx.auth.userId,
    });

    if (previousFile?.publicId) {
      try {
        await deleteVenueFileFromCloudinary(
          previousFile.publicId,
          previousFile.mimeType
        );
      } catch (deleteError) {
        console.error("Old CRM file delete failed:", deleteError);
      }

      await VenueFile.deleteMany({
        venueId: ctx.venueId,
        relatedLeadId: leadId,
        kind,
        publicId: previousFile.publicId,
      });
    }

    await writeVenueAudit({
      venueId: ctx.venueId,
      ownerId: ctx.ownerId,
      actorUserId: ctx.auth.userId,
      action: `lead.${kind}.upload`,
      targetType: "VenueLead",
      targetId: leadId,
      meta: {
        fileId: String(venueFile._id),
        originalName: uploaded.originalName,
      },
    });

    return NextResponse.json({
      success: true,
      message: kind === "proposal" ? "הצעת המחיר הועלתה" : "החוזה הועלה",
      leadId,
      kind,
      file: {
        id: String(venueFile._id),
        url: uploaded.url,
        publicId: uploaded.publicId,
        originalName: uploaded.originalName,
        mimeType: uploaded.mimeType,
        size: uploaded.size,
      },
      ...serializeLeadFileMeta(lead, kind),
    });
  } catch (error) {
    if (error instanceof VenueStorageError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: error.status }
      );
    }

    console.error("POST CRM upload failed:", error);

    return NextResponse.json(
      { success: false, message: "העלאת קובץ CRM נכשלה" },
      { status: 500 }
    );
  }
}
