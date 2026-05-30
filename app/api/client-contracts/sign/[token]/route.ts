import { NextRequest, NextResponse } from "next/server";
import ClientContract from "@/models/ClientContract";
import connectDB from "@/lib/mongodb";

export const runtime = "nodejs";

function normalizeFieldType(value: unknown) {
  const type = String(value || "text");

  const allowedTypes = [
    "signature",
    "date",
    "text",
    "fullName",
    "phone",
    "email",
    "idNumber",
    "checkbox",
    "venueNote",
  ];

  return allowedTypes.includes(type) ? type : "text";
}

function normalizeFields(rawFields: any[]) {
  const rows = Array.isArray(rawFields) ? rawFields : [];

  return rows.map((field, index) => ({
    id: String(field?.id || `field-${index + 1}`),
    type: normalizeFieldType(field?.type),
    label: String(field?.label || ""),
    required: Boolean(field?.required),

    pageNumber: Math.max(1, Number(field?.pageNumber || 1)),

    x: Number(field?.x || 0),
    y: Number(field?.y || 0),
    width: Number(field?.width || 20),
    height: Number(field?.height || 6),

    value: String(field?.value || ""),
    signatureDataUrl: String(field?.signatureDataUrl || ""),
    signedAt: field?.signedAt || null,
  }));
}

function normalizePages(contract: any) {
  const rawPages = Array.isArray(contract?.pages) ? contract.pages : [];

  if (rawPages.length > 0) {
    return rawPages.map((page: any, index: number) => ({
      pageNumber: Math.max(1, Number(page?.pageNumber || index + 1)),
      url: String(page?.url || page?.imageUrl || contract?.originalFileUrl || ""),
      name: String(page?.name || page?.fileName || `עמוד ${index + 1}`),
      type: String(page?.type || contract?.originalFileType || "pdf").includes("image")
        ? "image"
        : "pdf",
    }));
  }

  const pageCount = Math.max(1, Number(contract?.pageCount || 1));

  return Array.from({ length: pageCount }).map((_, index) => ({
    pageNumber: index + 1,
    url: String(contract?.originalFileUrl || ""),
    name: `${contract?.originalFileName || "הסכם"} - עמוד ${index + 1}`,
    type: String(contract?.originalFileType || "pdf").includes("image")
      ? "image"
      : "pdf",
  }));
}

function serializePublicContract(contract: any) {
  const object =
    typeof contract?.toObject === "function" ? contract.toObject() : contract;

  return {
    id: String(object?._id || object?.id || ""),

    eventId: String(object?.eventId || ""),
    hallId: String(object?.hallId || ""),
    hallName: String(object?.hallName || ""),
    eventTitle: String(object?.eventTitle || ""),
    title: String(object?.title || "הסכם לקוח"),

    clientName: String(object?.clientName || ""),
    clientPhone: String(object?.clientPhone || ""),
    clientEmail: String(object?.clientEmail || ""),

    originalFileUrl: String(object?.originalFileUrl || ""),
    originalFileName: String(object?.originalFileName || ""),
    originalFileType: String(object?.originalFileType || "pdf").includes("image")
      ? "image"
      : "pdf",

    pageCount: Math.max(1, Number(object?.pageCount || 1)),
    pages: normalizePages(object),

    fields: normalizeFields(Array.isArray(object?.fields) ? object.fields : []),

    status: String(object?.status || "draft"),
    locked: Boolean(object?.locked),

    signedAt: object?.signedAt || null,
    digitalSignatureText: String(object?.digitalSignatureText || ""),
  };
}

function getRequestMeta(req: NextRequest) {
  return {
    ip: req.headers.get("x-forwarded-for") || "",
    userAgent: req.headers.get("user-agent") || "",
  };
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    await connectDB();

    const { token } = await context.params;

    if (!token) {
      return NextResponse.json(
        { success: false, message: "חסר קישור חתימה" },
        { status: 400 }
      );
    }

    const contract = await ClientContract.findOne({ signingToken: token });

    if (!contract) {
      return NextResponse.json(
        { success: false, message: "הקישור לא נמצא או אינו תקין" },
        { status: 404 }
      );
    }

    if (
      contract.signingTokenExpiresAt &&
      new Date(contract.signingTokenExpiresAt).getTime() < Date.now() &&
      !contract.locked
    ) {
      contract.status = "expired";

      contract.auditLog.push({
        action: "contract_expired",
        at: new Date(),
        ...getRequestMeta(req),
      });

      await contract.save();

      return NextResponse.json(
        { success: false, message: "קישור החתימה פג תוקף" },
        { status: 410 }
      );
    }

    if (!contract.viewedAt) {
      contract.viewedAt = new Date();

      if (contract.status === "sent") {
        contract.status = "viewed";
      }

      contract.auditLog.push({
        action: "contract_viewed",
        at: new Date(),
        ...getRequestMeta(req),
      });

      await contract.save();
    }

    return NextResponse.json({
      success: true,
      contract: serializePublicContract(contract),
    });
  } catch (error) {
    console.error("GET public contract failed:", error);

    return NextResponse.json(
      { success: false, message: "טעינת ההסכם נכשלה" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    await connectDB();

    const { token } = await context.params;
    const body = await req.json().catch(() => ({}));

    if (!token) {
      return NextResponse.json(
        { success: false, message: "חסר קישור חתימה" },
        { status: 400 }
      );
    }

    const contract = await ClientContract.findOne({ signingToken: token });

    if (!contract) {
      return NextResponse.json(
        { success: false, message: "הקישור לא נמצא או אינו תקין" },
        { status: 404 }
      );
    }

    if (contract.locked || contract.status === "signed" || contract.status === "locked") {
      return NextResponse.json(
        { success: false, message: "ההסכם כבר נחתם וננעל לצפייה בלבד" },
        { status: 423 }
      );
    }

    if (
      contract.signingTokenExpiresAt &&
      new Date(contract.signingTokenExpiresAt).getTime() < Date.now()
    ) {
      contract.status = "expired";

      contract.auditLog.push({
        action: "contract_expired_before_sign",
        at: new Date(),
        ...getRequestMeta(req),
      });

      await contract.save();

      return NextResponse.json(
        { success: false, message: "קישור החתימה פג תוקף" },
        { status: 410 }
      );
    }

    const submittedFields = Array.isArray(body.fields) ? body.fields : [];
    const now = new Date();

    const nextFields = contract.fields.map((field: any) => {
      const fieldObject = field.toObject?.() || field;

      // הערת אולם היא טקסט קבוע של האולם.
      // הלקוח לא משנה אותה בחתימה.
      if (fieldObject.type === "venueNote") {
        return fieldObject;
      }

      const submitted = submittedFields.find(
        (item: any) => String(item?.id) === String(fieldObject.id)
      );

      if (!submitted) return fieldObject;

      return {
        ...fieldObject,
        value: String(submitted.value || ""),
        signatureDataUrl: String(submitted.signatureDataUrl || ""),
        signedAt: now,
      };
    });

    const missingRequiredField = nextFields.find((field: any) => {
      if (field.type === "venueNote") return false;

      if (!field.required) return false;

      if (field.type === "signature") {
        return !String(field.signatureDataUrl || "").trim();
      }

      if (field.type === "checkbox") {
        return String(field.value || "") !== "true";
      }

      return !String(field.value || "").trim();
    });

    if (missingRequiredField) {
      return NextResponse.json(
        {
          success: false,
          message: `חובה למלא את השדה: ${
            missingRequiredField.label || "שדה חובה"
          }`,
        },
        { status: 400 }
      );
    }

    const digitalSignatureText = `נחתם דיגיטלית בתאריך ${now.toLocaleString(
      "he-IL"
    )}`;

    contract.fields = nextFields;
    contract.status = "signed";
    contract.locked = true;
    contract.signedAt = now;
    contract.digitalSignatureText = digitalSignatureText;

    contract.auditLog.push({
      action: "contract_signed",
      at: now,
      ...getRequestMeta(req),
    });

    await contract.save();

    return NextResponse.json({
      success: true,
      message: "ההסכם נחתם וננעל לצפייה בלבד",
      contract: {
        ...serializePublicContract(contract),
        status: "signed",
        locked: true,
        signedAt: contract.signedAt,
        digitalSignatureText,
      },
    });
  } catch (error) {
    console.error("POST public contract sign failed:", error);

    return NextResponse.json(
      { success: false, message: "חתימת ההסכם נכשלה" },
      { status: 500 }
    );
  }
}