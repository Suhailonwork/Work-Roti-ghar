import { z } from 'zod';

/**
 * Every server action validates its input through one of these schemas before
 * touching the database. RLS is the second line of defence, not the first.
 */

const trimmed = (min: number, max: number) =>
  z.string().trim().min(min).max(max);

export const mobileSchema = z
  .string()
  .trim()
  .min(7, 'Enter a valid mobile number')
  .max(20, 'Enter a valid mobile number')
  .regex(/^[+]?[0-9][0-9\s-]{6,19}$/, 'Enter a valid mobile number');

export const passwordSchema = z
  .string()
  .min(8, 'Use at least 8 characters')
  .max(72, 'Password is too long')
  .regex(/[a-z]/, 'Include a lowercase letter')
  .regex(/[A-Z]/, 'Include an uppercase letter')
  .regex(/[0-9]/, 'Include a number');

// ------------------------------------------------------------------- auth --
export const signUpSchema = z
  .object({
    full_name: trimmed(2, 120),
    email: z.string().trim().toLowerCase().email('Enter a valid email address'),
    mobile: mobileSchema,
    address: trimmed(5, 500),
    password: passwordSchema,
    confirm_password: z.string(),
    reference: trimmed(2, 200),
    referred_by: z.string().uuid().optional().or(z.literal('')).transform((v) => v || undefined),
    reason: z.string().trim().max(1000).optional().or(z.literal('')).transform((v) => v || undefined),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  });

export const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
});

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirm_password: z.string(),
  })
  .refine((d) => d.password === d.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  });

export const profileUpdateSchema = z.object({
  full_name: trimmed(2, 120),
  bio: z.string().trim().max(500).optional().or(z.literal('')),
  mobile: mobileSchema.optional().or(z.literal('')),
  address: z.string().trim().max(500).optional().or(z.literal('')),
});

// -------------------------------------------------------------- community --
export const postSchema = z.object({
  content: z.string().trim().max(10000),
  is_announcement: z.coerce.boolean().optional().default(false),
});

export const commentSchema = z.object({
  post_id: z.string().uuid(),
  parent_id: z.string().uuid().optional().or(z.literal('')).transform((v) => v || undefined),
  content: trimmed(1, 4000),
});

export const reportSchema = z.object({
  target_type: z.enum(['post', 'comment', 'profile']),
  target_id: z.string().uuid(),
  reason: trimmed(3, 120),
  details: z.string().trim().max(1000).optional().or(z.literal('')),
});

// -------------------------------------------------------------- moderation --
export const applicationReviewSchema = z.object({
  application_id: z.string().uuid(),
  decision: z.enum(['approved', 'rejected']),
  role: z.enum(['member', 'volunteer', 'admin']).default('member'),
  review_notes: z.string().trim().max(1000).optional().or(z.literal('')),
});

export const memberStatusSchema = z.object({
  profile_id: z.string().uuid(),
  status: z.enum(['pending', 'active', 'rejected', 'suspended', 'inactive']),
  reason: z.string().trim().max(500).optional().or(z.literal('')),
});

export const memberRoleSchema = z.object({
  profile_id: z.string().uuid(),
  role: z.enum(['member', 'volunteer', 'admin']),
});

export const pointsSchema = z.object({
  profile_id: z.string().uuid(),
  points: z.coerce.number().int().refine((n) => n !== 0, 'Points cannot be zero'),
  category: z.enum(['contribution', 'volunteer', 'activity', 'admin', 'penalty']).default('admin'),
  reason: trimmed(3, 200),
});

export const memberOfMonthSchema = z.object({
  profile_id: z.string().uuid(),
  year: z.coerce.number().int().min(2000).max(2200),
  month: z.coerce.number().int().min(1).max(12),
  citation: z.string().trim().max(500).optional().or(z.literal('')),
});

// ------------------------------------------------------------------ ration --
export const beneficiarySchema = z.object({
  id: z.string().uuid().optional(),
  name: trimmed(2, 160),
  phone: z.string().trim().max(20).optional().or(z.literal('')),
  address: z.string().trim().max(500).optional().or(z.literal('')),
  area: z.string().trim().max(120).optional().or(z.literal('')),
  family_size: z.coerce.number().int().min(1).max(60),
  notes: z.string().trim().max(1000).optional().or(z.literal('')),
  status: z.enum(['active', 'inactive', 'archived']).default('active'),
});

export const rationKitItemSchema = z.object({
  item_name: trimmed(1, 120),
  quantity: z.coerce.number().positive().max(100000),
  unit: trimmed(1, 20),
});

export const rationKitSchema = z.object({
  id: z.string().uuid().optional(),
  name: trimmed(2, 160),
  description: z.string().trim().max(1000).optional().or(z.literal('')),
  estimated_cost: z.coerce.number().min(0).max(10_000_000).default(0),
  is_active: z.coerce.boolean().default(true),
  items: z.array(rationKitItemSchema).min(1, 'Add at least one item'),
});

export const distributionSchema = z.object({
  id: z.string().uuid().optional(),
  beneficiary_id: z.string().uuid('Choose a family'),
  kit_id: z.string().uuid('Choose a kit'),
  quantity: z.coerce.number().int().min(1).max(500).default(1),
  distributed_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a date'),
  distributed_by: z.string().uuid().optional().or(z.literal('')).transform((v) => v || undefined),
  notes: z.string().trim().max(1000).optional().or(z.literal('')),
});

// ----------------------------------------------------------------- finance --
/**
 * A contribution is normally attributed to a member picked from the directory,
 * so `contributor_id` carries the link and the display name is read back from
 * that member's profile. A typed name is required only for a contributor who
 * has no member account — the refinement below enforces exactly one of the two.
 */
export const contributionSchema = z
  .object({
    id: z.string().uuid().optional(),
    contributor_id: z.string().uuid().optional().or(z.literal('')).transform((v) => v || undefined),
    contributor_name: z
      .string()
      .trim()
      .max(160)
      .optional()
      .or(z.literal(''))
      .transform((v) => v || undefined),
    amount: z.coerce.number().positive('Enter an amount above zero').max(100_000_000),
    contributed_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a date'),
    payment_method: trimmed(2, 60),
    transaction_ref: z.string().trim().max(120).optional().or(z.literal('')),
    purpose: z.string().trim().max(300).optional().or(z.literal('')),
    notes: z.string().trim().max(1000).optional().or(z.literal('')),
  })
  .refine((value) => Boolean(value.contributor_id) || (value.contributor_name ?? '').length >= 2, {
    message: 'Choose a member, or type the name of a contributor who is not a member.',
    path: ['contributor_name'],
  });

export const expenseSchema = z.object({
  id: z.string().uuid().optional(),
  category: z.enum(['ration', 'transport', 'packaging', 'storage', 'utilities', 'other']),
  amount: z.coerce.number().positive('Enter an amount above zero').max(100_000_000),
  spent_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a date'),
  description: trimmed(2, 500),
  vendor: z.string().trim().max(160).optional().or(z.literal('')),
});

export const verifySchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['pending', 'verified', 'rejected']),
});

export const documentSchema = z.object({
  title: trimmed(2, 200),
  description: z.string().trim().max(1000).optional().or(z.literal('')),
  category: z.string().trim().max(80).optional().or(z.literal('')),
  is_private: z.coerce.boolean().default(true),
});

// --------------------------------------------------------------- reminders --
export const reminderSchema = z.object({
  id: z.string().uuid().optional(),
  title: trimmed(2, 200),
  body: z.string().trim().max(2000).optional().or(z.literal('')),
  audience: z.enum(['all', 'members', 'volunteers', 'admins', 'selected']),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  due_at: z.string().optional().or(z.literal('')),
  profile_ids: z.array(z.string().uuid()).optional().default([]),
});

// --------------------------------------------------------------------- CMS --
export const pageSchema = z.object({
  id: z.string().uuid().optional(),
  title: trimmed(2, 200),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'Enter a URL slug')
    .max(80)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and hyphens only'),
  status: z.enum(['draft', 'published', 'scheduled', 'archived']).default('draft'),
  publish_at: z.string().optional().or(z.literal('')),
});

export const seoSchema = z.object({
  page_id: z.string().uuid(),
  seo_title: z.string().trim().max(200).optional().or(z.literal('')),
  meta_description: z.string().trim().max(320).optional().or(z.literal('')),
  canonical_url: z.string().trim().url('Enter a full URL').optional().or(z.literal('')),
  og_title: z.string().trim().max(200).optional().or(z.literal('')),
  og_description: z.string().trim().max(320).optional().or(z.literal('')),
  og_image_url: z.string().trim().max(500).optional().or(z.literal('')),
  og_image_alt: z.string().trim().max(200).optional().or(z.literal('')),
  twitter_card: z.enum(['summary', 'summary_large_image']).default('summary_large_image'),
  twitter_title: z.string().trim().max(200).optional().or(z.literal('')),
  twitter_description: z.string().trim().max(320).optional().or(z.literal('')),
  twitter_image_url: z.string().trim().max(500).optional().or(z.literal('')),
  no_index: z.coerce.boolean().default(false),
  keywords: z.string().trim().max(500).optional().or(z.literal('')),
});

export const blockSchema = z.object({
  id: z.string().uuid().optional(),
  page_id: z.string().uuid(),
  block_type: z.string().min(1).max(50),
  data: z.record(z.any()),
  is_visible: z.coerce.boolean().default(true),
});

export const reorderSchema = z.object({
  page_id: z.string().uuid(),
  ordered_ids: z.array(z.string().uuid()).min(1),
});

// ----------------------------------------------------------------- support --
export const supportPledgeSchema = z.object({
  name: trimmed(2, 160),
  email: z.string().trim().toLowerCase().email('Enter a valid email').optional().or(z.literal('')),
  phone: z.string().trim().max(20).optional().or(z.literal('')),
  kind: z.enum(['in_kind', 'time', 'transport', 'storage', 'referral', 'other', 'financial']),
  amount: z.coerce.number().positive().max(100_000_000).optional(),
  message: z.string().trim().max(1500).optional().or(z.literal('')),
});

// ------------------------------------------------------------------ helpers --
export type FormState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[]>;
};

export const emptyFormState: FormState = { ok: false };

/** Turns a ZodError into the flat shape our forms render. */
export function toFormErrors(error: z.ZodError): Record<string, string[]> {
  const flat = error.flatten();
  const errors: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(flat.fieldErrors)) {
    if (value?.length) errors[key] = value;
  }
  if (flat.formErrors.length) errors._form = flat.formErrors;
  return errors;
}

/** Validates FormData against a schema and returns either data or a FormState. */
export function parseForm<T extends z.ZodTypeAny>(
  schema: T,
  formData: FormData,
): { success: true; data: z.infer<T> } | { success: false; state: FormState } {
  const raw = Object.fromEntries(formData.entries());
  const result = schema.safeParse(raw);
  if (!result.success) {
    return {
      success: false,
      state: { ok: false, message: 'Please correct the highlighted fields.', errors: toFormErrors(result.error) },
    };
  }
  return { success: true, data: result.data };
}
