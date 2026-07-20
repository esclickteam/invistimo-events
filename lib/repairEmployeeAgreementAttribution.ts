import mongoose from "mongoose";

import EmployeeAgreement from "@/models/EmployeeAgreement";
import User from "@/models/User";

function cleanStr(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Some terminations were signed while the client sent businessId as employeeId
 * (same ObjectId for both). That created an orphaned signed row under the
 * business account instead of updating the employee's pending assignment.
 *
 * When loading an employee file, merge those orphans back onto the employee's
 * pending/rejected assignment for the same template type + business.
 */
export async function repairMisattributedSignedAgreements(employeeId: string) {
  if (!mongoose.Types.ObjectId.isValid(employeeId)) {
    return { repaired: 0 };
  }

  const employeeObjectId = new mongoose.Types.ObjectId(employeeId);

  const [employee, employeeAssignments] = await Promise.all([
    User.findById(employeeObjectId)
      .select("businessId employerId companyId createdByAdmin")
      .lean(),
    EmployeeAgreement.find({
      employeeId: employeeObjectId,
    })
      .select("_id businessId templateType status signedFileUrl sentAt")
      .lean(),
  ]);

  const businessIds = Array.from(
    new Set(
      [
        ...employeeAssignments.map((item: any) => cleanStr(item.businessId)),
        cleanStr((employee as any)?.businessId),
        cleanStr((employee as any)?.employerId),
        cleanStr((employee as any)?.companyId),
        cleanStr((employee as any)?.createdByAdmin),
      ].filter((id) => mongoose.Types.ObjectId.isValid(id)),
    ),
  );

  if (businessIds.length === 0) {
    return { repaired: 0 };
  }

  let repaired = 0;

  for (const businessId of businessIds) {
    // Skip if this employee id really is the business account.
    if (businessId === employeeId) continue;

    const businessObjectId = new mongoose.Types.ObjectId(businessId);

    const orphans = await EmployeeAgreement.find({
      employeeId: businessObjectId,
      businessId: businessObjectId,
      status: { $in: ["signed", "approved"] },
      signedFileUrl: { $nin: [null, ""] },
    }).lean();

    for (const orphan of orphans) {
      const templateType = cleanStr((orphan as any).templateType);
      if (!templateType) continue;

      const target = await EmployeeAgreement.findOne({
        employeeId: employeeObjectId,
        businessId: businessObjectId,
        templateType,
        $or: [
          { status: { $in: ["pending", "rejected"] } },
          { signedFileUrl: { $in: [null, ""] } },
        ],
      })
        .sort({ sentAt: -1, updatedAt: -1, createdAt: -1 })
        .lean();

      if (!target?._id) continue;

      await EmployeeAgreement.findByIdAndUpdate(target._id, {
        $set: {
          status: cleanStr((orphan as any).status) || "signed",
          signedFileUrl: cleanStr((orphan as any).signedFileUrl),
          signedAt: (orphan as any).signedAt || new Date(),
          values: (orphan as any).values || {},
          fullName:
            cleanStr((orphan as any).fullName) ||
            cleanStr((target as any).fullName),
          idNumber:
            cleanStr((orphan as any).idNumber) ||
            cleanStr((target as any).idNumber),
          phone:
            cleanStr((orphan as any).phone) || cleanStr((target as any).phone),
          email:
            cleanStr((orphan as any).email) || cleanStr((target as any).email),
          approvedAt: (orphan as any).approvedAt || null,
          rejectedAt: null,
          rejectionReason: "",
        },
      });

      await EmployeeAgreement.findByIdAndDelete((orphan as any)._id);
      repaired += 1;
    }
  }

  return { repaired };
}
