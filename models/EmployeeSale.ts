import mongoose, { Schema, model, models } from "mongoose";

export type EmployeeSaleStatus =
  | "pending"
  | "paid"
  | "cancelled"
  | "refunded";

export type EmployeeSaleSource =
  | "employee_sales_page"
  | "employee_client_create"
  | "admin"
  | "manual";

const EmployeeSaleSchema = new Schema(
  {
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    employeeName: {
      type: String,
      default: "",
      trim: true,
    },

    employeeEmail: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
    },

    clientUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    clientName: {
      type: String,
      required: true,
      trim: true,
    },

    clientEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    clientPhone: {
      type: String,
      default: "",
      trim: true,
    },

    eventName: {
      type: String,
      default: "",
      trim: true,
    },

    eventDate: {
      type: Date,
      default: null,
    },

    packageName: {
      type: String,
      default: "",
      trim: true,
    },

    plan: {
      type: String,
      default: "premium",
      trim: true,
    },

    guests: {
      type: Number,
      default: 0,
    },

    grossAmount: {
      type: Number,
      required: true,
      default: 0,
    },

    vatRate: {
      type: Number,
      default: 0.18,
    },

    netAmount: {
      type: Number,
      required: true,
      default: 0,
    },

    commissionRate: {
      type: Number,
      default: 0.05,
    },

    commissionAmount: {
      type: Number,
      required: true,
      default: 0,
    },

    status: {
      type: String,
      enum: ["pending", "paid", "cancelled", "refunded"],
      default: "paid",
      index: true,
    },

    source: {
      type: String,
      enum: ["employee_sales_page", "employee_client_create", "admin", "manual"],
      default: "employee_sales_page",
      index: true,
    },

    notes: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

EmployeeSaleSchema.index({ employeeId: 1, createdAt: -1 });
EmployeeSaleSchema.index({ clientEmail: 1 });
EmployeeSaleSchema.index({ employeeId: 1, status: 1 });

export default models.EmployeeSale ||
  model("EmployeeSale", EmployeeSaleSchema);