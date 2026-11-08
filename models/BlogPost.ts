import mongoose, { Schema, type InferSchemaType, type Types } from "mongoose";

const FaqSchema = new Schema(
  {
    q: { type: String, required: true, trim: true },
    a: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const BlogPostSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 180 },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    excerpt: { type: String, required: true, trim: true, maxlength: 400 },
    body: { type: String, required: true },
    categoryId: { type: String, required: true, index: true },
    subcategoryId: { type: String, required: true },
    coverImage: { type: String, default: "" },
    coverAlt: { type: String, default: "", maxlength: 300 },
    seoTitle: { type: String, default: "", maxlength: 180 },
    seoDescription: { type: String, default: "", maxlength: 320 },
    featured: { type: Boolean, default: false },
    popular: { type: Boolean, default: false },
    status: { type: String, enum: ["draft", "published"], default: "draft", index: true },
    faqs: { type: [FaqSchema], default: [] },
    publishedAt: { type: Date },
  },
  { timestamps: true }
);

export type BlogPostStatus = "draft" | "published";

export type BlogPostDoc = InferSchemaType<typeof BlogPostSchema> & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export default mongoose.models.BlogPost || mongoose.model("BlogPost", BlogPostSchema);
