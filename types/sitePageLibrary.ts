export type LibrarySidebarTab =
  | "elements"
  | "sections"
  | "pages"
  | "plugins"
  | "icons"
  | "animations"
  | "media";

export type PageScope = "public" | "postLogin";

export type PublicPageCategoryId =
  | "services"
  | "gallery"
  | "contact"
  | "products"
  | "pricing"
  | "blog"
  | "events"
  | "reviews"
  | "team"
  | "faq"
  | "landing"
  | "resume";

export type PostLoginPageTypeId =
  | "login"
  | "register"
  | "account"
  | "orders"
  | "dashboard"
  | "profile"
  | "settings"
  | "messages"
  | "rsvp-status";

export type BuilderThemeId =
  | "eternal-gold"
  | "midnight-velvet"
  | "garden-bloom"
  | "coastal-breeze"
  | "desert-rose"
  | "minimal-noir"
  | "royal-ivory"
  | "forest-enchanted"
  | "modern-glass"
  | "champagne-classic";

export type BuilderTheme = {
  id: BuilderThemeId;
  name: string;
  bg: string;
  bgAlt: string;
  surface: string;
  text: string;
  textMuted: string;
  accent: string;
  accentSoft: string;
  border: string;
  headerBg: string;
};

export type PageTemplateDefinition = {
  id: string;
  scope: PageScope;
  categoryId: PublicPageCategoryId | PostLoginPageTypeId;
  variantIndex: number;
  themeId: BuilderThemeId;
  title: string;
  subtitle: string;
  sectionCount: number;
  route: string;
  requiresAuth: boolean;
  formType?: "login" | "register" | null;
  layout: "hero-form" | "split-form" | "card-form" | "minimal-form" | "dashboard";
};

export type SectionTemplateDefinition = {
  id: string;
  label: string;
  category: string;
  description: string;
  sectionCount: number;
  themeId: BuilderThemeId;
};

export type SitePageSelection = {
  templateId: string;
  scope: PageScope;
  route: string;
  title: string;
  addedAt: string;
};
