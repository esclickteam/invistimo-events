import { NextRequest, NextResponse } from "next/server";
import ClientContract from "@/models/ClientContract";
import connectDB from "@/lib/mongodb";

export const runtime = "nodejs";

function normalizeFields(rawFields: any[]) {
  return rawFields.map((field) => ({
    id: String(field.id || ""),
    type: String(field.type || "text"),
    label: String(field.label || ""),
    required: Boolean(field.required),
    x: Number(field.x || 0),
    y: Number(field.y || 0),
    width: Number(field.width || 20),
    height: Number(field.height || 6),
    value: String(field.value || ""),
    signatureDataUrl: String(field.signatureDataUrl || ""),
  }));
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
        ip: req.headers.get("x-forwarded-for") || "",
        userAgent: req.headers.get("user-agent") || "",
      });

      await contract.save();
    }

    return NextResponse.json({
      success: true,
      contract: {
        id: String(contract._id),
        eventId: contract.eventId,
        hallId: contract.hallId,
        hallName: contract.hallName,
        eventTitle: contract.eventTitle,
        clientName: contract.clientName,
        clientPhone: contract.clientPhone,
        clientEmail: contract.clientEmail,
        originalFileUrl: contract.originalFileUrl,
        originalFileName: contract.originalFileName,
        originalFileType: contract.originalFileType,
        fields: normalizeFields(contract.fields || []),
        status: contract.status,
        locked: contract.locked,
        signedAt: contract.signedAt,
      },
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
      await contract.save();

      return NextResponse.json(
        { success: false, message: "קישור החתימה פג תוקף" },
        { status: 410 }
      );
    }

    const submittedFields = Array.isArray(body.fields) ? body.fields : [];

    const nextFields = contract.fields.map((field: any) => {
      const submitted = submittedFields.find(
        (item: any) => String(item.id) === String(field.id)
      );

      if (!submitted) return field;

      return {
        ...field.toObject?.() || field,
        value: String(submitted.value || ""),
        signatureDataUrl: String(submitted.signatureDataUrl || ""),
        signedAt: new Date(),
      };
    });

    const missingRequiredField = nextFields.find((field: any) => {
      if (!field.required) return false;

      if (field.type === "signature") {
        return !field.signatureDataUrl;
      }

      if (field.type === "checkbox") {
        return field.value !== "true";
      }

      return !String(field.value || "").trim();
    });

    if (missingRequiredField) {
      return NextResponse.json(
        {
          success: false,
          message: `חובה למלא את השדה: ${missingRequiredField.label || "שדה חובה"}`,
        },
        { status: 400 }
      );
    }

    contract.fields = nextFields;
    contract.status = "signed";
    contract.locked = true;
    contract.signedAt = new Date();

    contract.auditLog.push({
      action: "contract_signed",
      at: new Date(),
      ip: req.headers.get("x-forwarded-for") || "",
      userAgent: req.headers.get("user-agent") || "",
    });

    await contract.save();

    return NextResponse.json({
      success: true,
      message: "ההסכם נחתם וננעל לצפייה בלבד",
      contract: {
        id: String(contract._id),
        status: contract.status,
        locked: contract.locked,
        signedAt: contract.signedAt,
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