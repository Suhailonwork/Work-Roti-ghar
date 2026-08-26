/**
 * Database types for the Roti Ghar Supabase schema.
 *
 * Kept in sync by hand with `supabase/migrations/*.sql`. If you change the
 * schema, change this file in the same commit.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

// ------------------------------------------------------------------- enums --
export type UserRole = 'admin' | 'volunteer' | 'member';
export type UserStatus = 'pending' | 'active' | 'rejected' | 'suspended' | 'inactive';
export type ApplicationStatus = 'pending' | 'approved' | 'rejected';
export type ContentStatus = 'published' | 'hidden' | 'removed';
export type MediaType = 'image' | 'video';
export type ReportTarget = 'post' | 'comment' | 'profile';
export type ReportStatus = 'open' | 'reviewing' | 'resolved' | 'dismissed';
export type PointCategory = 'contribution' | 'volunteer' | 'activity' | 'admin' | 'penalty';
export type BeneficiaryStatus = 'active' | 'inactive' | 'archived';
export type VerificationStatus = 'pending' | 'verified' | 'rejected';
export type ExpenseCategory = 'ration' | 'transport' | 'packaging' | 'storage' | 'utilities' | 'other';
export type ReminderAudience = 'all' | 'members' | 'volunteers' | 'admins' | 'selected';
export type ReminderStatus = 'draft' | 'scheduled' | 'sent' | 'archived';
export type PriorityLevel = 'low' | 'normal' | 'high' | 'urgent';
export type PageStatus = 'draft' | 'published' | 'scheduled' | 'archived';
export type NotificationType =
  | 'like' | 'comment' | 'reply' | 'comment_like' | 'mention' | 'share'
  | 'announcement' | 'approval' | 'rejection' | 'reminder' | 'points'
  | 'report_update' | 'system';

/** Reduces the Row/Insert/Update boilerplate the Supabase client generic wants. */
type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

// -------------------------------------------------------------------- rows --
export type Profile = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  role: UserRole;
  status: UserStatus;
  referred_by: string | null;
  points: number;
  posts_count: number;
  joined_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
  suspended_until: string | null;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ProfileContact = {
  profile_id: string;
  email: string;
  mobile: string | null;
  address: string | null;
  reference: string | null;
  referred_by_name: string | null;
  reason: string | null;
  created_at: string;
  updated_at: string;
};

export type MemberApplication = {
  id: string;
  profile_id: string;
  full_name: string;
  email: string;
  mobile: string | null;
  address: string | null;
  reference: string | null;
  referred_by_name: string | null;
  referred_by: string | null;
  reason: string | null;
  avatar_url: string | null;
  status: ApplicationStatus;
  review_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Post = {
  id: string;
  author_id: string;
  content: string;
  status: ContentStatus;
  is_announcement: boolean;
  is_pinned: boolean;
  shared_from: string | null;
  like_count: number;
  comment_count: number;
  share_count: number;
  edited_at: string | null;
  removed_reason: string | null;
  removed_by: string | null;
  created_at: string;
  updated_at: string;
};

export type PostMedia = {
  id: string;
  post_id: string;
  bucket: string;
  path: string;
  type: MediaType;
  width: number | null;
  height: number | null;
  duration_s: number | null;
  position: number;
  created_at: string;
};

export type Like = {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
};

export type Comment = {
  id: string;
  post_id: string;
  author_id: string;
  parent_id: string | null;
  content: string;
  status: ContentStatus;
  like_count: number;
  reply_count: number;
  edited_at: string | null;
  removed_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CommentLike = {
  id: string;
  comment_id: string;
  user_id: string;
  created_at: string;
};

export type Mention = {
  id: string;
  source_type: ReportTarget;
  source_id: string;
  mentioned_id: string;
  actor_id: string;
  created_at: string;
};

export type NotificationRow = {
  id: string;
  user_id: string;
  actor_id: string | null;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  entity_type: string | null;
  entity_id: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
};

export type Report = {
  id: string;
  reporter_id: string;
  target_type: ReportTarget;
  target_id: string;
  reason: string;
  details: string | null;
  status: ReportStatus;
  resolution_notes: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
};

export type PointTransaction = {
  id: string;
  profile_id: string;
  points: number;
  category: PointCategory;
  reason: string;
  activity_type: string | null;
  reference_type: string | null;
  reference_id: string | null;
  is_verified: boolean;
  awarded_by: string | null;
  occurred_at: string;
  created_at: string;
};

export type MemberOfMonth = {
  id: string;
  profile_id: string;
  year: number;
  month: number;
  citation: string | null;
  selected_by: string | null;
  created_at: string;
};

export type Beneficiary = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  area: string | null;
  family_size: number;
  notes: string | null;
  status: BeneficiaryStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type RationKit = {
  id: string;
  name: string;
  description: string | null;
  estimated_cost: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type RationKitItem = {
  id: string;
  kit_id: string;
  item_name: string;
  quantity: number;
  unit: string;
  position: number;
};

export type Distribution = {
  id: string;
  beneficiary_id: string;
  kit_id: string;
  quantity: number;
  distributed_on: string;
  distributed_by: string | null;
  notes: string | null;
  proof_bucket: string | null;
  proof_path: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Contribution = {
  id: string;
  contributor_id: string | null;
  contributor_name: string;
  amount: number;
  contributed_on: string;
  payment_method: string;
  transaction_ref: string | null;
  purpose: string | null;
  receipt_bucket: string | null;
  receipt_path: string | null;
  verification_status: VerificationStatus;
  verified_by: string | null;
  verified_at: string | null;
  notes: string | null;
  source: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Expense = {
  id: string;
  category: ExpenseCategory;
  amount: number;
  spent_on: string;
  description: string;
  vendor: string | null;
  receipt_bucket: string | null;
  receipt_path: string | null;
  verification_status: VerificationStatus;
  verified_by: string | null;
  verified_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type DocumentRow = {
  id: string;
  title: string;
  description: string | null;
  bucket: string;
  path: string;
  mime_type: string | null;
  size_bytes: number | null;
  category: string | null;
  is_private: boolean;
  uploaded_by: string | null;
  created_at: string;
};

export type Reminder = {
  id: string;
  title: string;
  body: string | null;
  audience: ReminderAudience;
  priority: PriorityLevel;
  due_at: string | null;
  status: ReminderStatus;
  sent_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ReminderRecipient = {
  id: string;
  reminder_id: string;
  profile_id: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
};

export type CmsPage = {
  id: string;
  slug: string;
  title: string;
  status: PageStatus;
  is_home: boolean;
  publish_at: string | null;
  published_at: string | null;
  version: number;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CmsPageBlock = {
  id: string;
  page_id: string;
  block_type: string;
  position: number;
  data: Record<string, Json | undefined>;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
};

export type CmsSeo = {
  id: string;
  page_id: string;
  seo_title: string | null;
  meta_description: string | null;
  canonical_url: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image_url: string | null;
  og_image_alt: string | null;
  twitter_card: string;
  twitter_title: string | null;
  twitter_description: string | null;
  twitter_image_url: string | null;
  no_index: boolean;
  keywords: string[];
  updated_at: string;
};

export type CmsRevision = {
  id: string;
  page_id: string;
  version: number;
  note: string | null;
  snapshot: Json;
  created_by: string | null;
  created_at: string;
};

export type MediaRow = {
  id: string;
  bucket: string;
  path: string;
  url: string | null;
  filename: string;
  mime_type: string | null;
  size_bytes: number | null;
  width: number | null;
  height: number | null;
  alt_text: string | null;
  folder: string;
  is_public: boolean;
  uploaded_by: string | null;
  created_at: string;
};

export type SiteSetting = {
  key: string;
  value: Json;
  description: string | null;
  is_public: boolean;
  updated_by: string | null;
  updated_at: string;
};

export type SupportPledge = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  kind: string;
  amount: number | null;
  message: string | null;
  status: string;
  payment_status: string | null;
  transaction_ref: string | null;
  receipt_bucket: string | null;
  receipt_path: string | null;
  handled_by: string | null;
  handled_at: string | null;
  created_at: string;
};

export type AuditLog = {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  summary: string | null;
  before: Json | null;
  after: Json | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
};

// ------------------------------------------------------------ RPC payloads --
export type FinanceSummaryRow = {
  total_received: number;
  total_spent: number;
  balance: number;
};

export type LeaderboardRow = {
  profile_id: string;
  full_name: string;
  avatar_url: string | null;
  role: UserRole;
  points: number;
  activities: number;
};

export type ImpactStats = {
  families_helped: number;
  kits_distributed: number;
  distributions: number;
  active_members: number;
  volunteers: number;
  areas_served: number;
};

// --------------------------------------------------------------- Database --
export type Database = {
  public: {
    Tables: {
      profiles: Table<Profile, Partial<Profile> & { id: string; full_name: string }>;
      profile_contacts: Table<ProfileContact, Partial<ProfileContact> & { profile_id: string; email: string }>;
      member_applications: Table<
        MemberApplication,
        Partial<MemberApplication> & { profile_id: string; full_name: string; email: string }
      >;
      posts: Table<Post, Partial<Post> & { author_id: string }>;
      post_media: Table<PostMedia, Partial<PostMedia> & { post_id: string; path: string }>;
      likes: Table<Like, Partial<Like> & { post_id: string; user_id: string }>;
      comments: Table<Comment, Partial<Comment> & { post_id: string; author_id: string; content: string }>;
      comment_likes: Table<CommentLike, Partial<CommentLike> & { comment_id: string; user_id: string }>;
      mentions: Table<
        Mention,
        Partial<Mention> & { source_type: ReportTarget; source_id: string; mentioned_id: string; actor_id: string }
      >;
      notifications: Table<
        NotificationRow,
        Partial<NotificationRow> & { user_id: string; type: NotificationType; title: string }
      >;
      reports: Table<
        Report,
        Partial<Report> & { reporter_id: string; target_type: ReportTarget; target_id: string; reason: string }
      >;
      point_transactions: Table<
        PointTransaction,
        Partial<PointTransaction> & { profile_id: string; points: number; reason: string }
      >;
      member_of_month: Table<MemberOfMonth, Partial<MemberOfMonth> & { profile_id: string; year: number; month: number }>;
      beneficiaries: Table<Beneficiary, Partial<Beneficiary> & { name: string }>;
      ration_kits: Table<RationKit, Partial<RationKit> & { name: string }>;
      ration_kit_items: Table<RationKitItem, Partial<RationKitItem> & { kit_id: string; item_name: string; quantity: number }>;
      distributions: Table<Distribution, Partial<Distribution> & { beneficiary_id: string; kit_id: string }>;
      contributions: Table<Contribution, Partial<Contribution> & { contributor_name: string; amount: number }>;
      expenses: Table<Expense, Partial<Expense> & { amount: number; description: string }>;
      documents: Table<DocumentRow, Partial<DocumentRow> & { title: string; path: string }>;
      reminders: Table<Reminder, Partial<Reminder> & { title: string }>;
      reminder_recipients: Table<ReminderRecipient, Partial<ReminderRecipient> & { reminder_id: string; profile_id: string }>;
      cms_pages: Table<CmsPage, Partial<CmsPage> & { slug: string; title: string }>;
      cms_page_blocks: Table<CmsPageBlock, Partial<CmsPageBlock> & { page_id: string; block_type: string }>;
      cms_seo: Table<CmsSeo, Partial<CmsSeo> & { page_id: string }>;
      cms_revisions: Table<CmsRevision, Partial<CmsRevision> & { page_id: string; version: number; snapshot: Json }>;
      media: Table<MediaRow, Partial<MediaRow> & { path: string; filename: string }>;
      site_settings: Table<SiteSetting, Partial<SiteSetting> & { key: string }>;
      support_pledges: Table<SupportPledge, Partial<SupportPledge> & { name: string }>;
      audit_logs: Table<AuditLog, Partial<AuditLog> & { action: string; entity_type: string }>;
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
      is_volunteer: { Args: Record<string, never>; Returns: boolean };
      is_active_member: { Args: Record<string, never>; Returns: boolean };
      current_role: { Args: Record<string, never>; Returns: UserRole };
      current_status: { Args: Record<string, never>; Returns: UserStatus };
      finance_summary: { Args: Record<string, never>; Returns: FinanceSummaryRow[] };
      impact_stats: { Args: Record<string, never>; Returns: ImpactStats };
      leaderboard: {
        Args: { p_category?: PointCategory | null; p_since?: string | null; p_limit?: number };
        Returns: LeaderboardRow[];
      };
      snapshot_cms_page: { Args: { p_page_id: string; p_note?: string | null }; Returns: number };
      dispatch_reminder: { Args: { p_reminder_id: string; p_profile_ids?: string[] | null }; Returns: number };
      write_audit_log: {
        Args: {
          p_action: string;
          p_entity_type: string;
          p_entity_id: string | null;
          p_summary?: string | null;
          p_before?: Json | null;
          p_after?: Json | null;
        };
        Returns: string;
      };
    };
    Enums: {
      user_role: UserRole;
      user_status: UserStatus;
      application_status: ApplicationStatus;
      content_status: ContentStatus;
      media_type: MediaType;
      report_target: ReportTarget;
      report_status: ReportStatus;
      point_category: PointCategory;
      beneficiary_status: BeneficiaryStatus;
      verification_status: VerificationStatus;
      expense_category: ExpenseCategory;
      reminder_audience: ReminderAudience;
      reminder_status: ReminderStatus;
      priority_level: PriorityLevel;
      page_status: PageStatus;
      notification_type: NotificationType;
    };
    CompositeTypes: Record<string, never>;
  };
};
