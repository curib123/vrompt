export interface ApiHealthResponse {
  status: 'ok' | 'degraded';
  service: 'api';
  version: 'v1';
  timestamp: string;
  dependencies: {
    postgres: 'up' | 'down';
    redis: 'up' | 'down';
  };
}

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  role: 'USER' | 'MODERATOR' | 'ADMIN';
  accountType: 'REAL' | 'STARTER' | 'OFFICIAL';
  plan: 'FREE' | 'PRO';
  onboardingCompleted: boolean;
}

export interface BillingPlan {
  id: string;
  name: string;
  description: string;
  originalPrice: number;
  priceCentavos: number;
  currency: string;
  billingPeriod: string;
  billingInterval: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR' | 'ONE_TIME';
  intervalCount: number;
  features: Array<{
    key: string;
    name: string;
    unitLabel: string;
    resetPeriod: 'DAILY' | 'MONTHLY';
    limit: number | null;
  }>;
  promotion: {
    name: string;
    description: string | null;
    discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
    discountValue: number;
    discountAmount: number;
    startsAt: string;
    endsAt: string;
    timezone: string;
  } | null;
}

export interface BillingPlansResponse {
  currency: string;
  plans: BillingPlan[];
}

export interface BillingSummaryResponse {
  plan: 'FREE' | 'PRO';
  subscription: {
    id: string;
    status:
      | 'PENDING'
      | 'ACTIVE'
      | 'PAST_DUE'
      | 'UNPAID'
      | 'CANCELLED'
      | 'EXPIRED'
      | 'REFUNDED';
    currentPeriodStart: string;
    currentPeriodEnd: string;
  } | null;
  latestPayment: {
    id: string;
    status:
      | 'PENDING'
      | 'PAID'
      | 'FAILED'
      | 'CANCELLED'
      | 'EXPIRED'
      | 'REFUNDED'
      | 'REQUIRES_ACTION';
    amount: number;
    currency: string;
    createdAt: string;
  } | null;
}

export interface CheckoutResponse {
  paymentId: string;
  status:
    | 'PENDING'
    | 'PAID'
    | 'FAILED'
    | 'CANCELLED'
    | 'EXPIRED'
    | 'REFUNDED'
    | 'REQUIRES_ACTION';
  checkoutUrl?: string;
}

export interface PaymentStatusResponse {
  id: string;
  status: CheckoutResponse['status'];
  subscriptionStatus:
    NonNullable<BillingSummaryResponse['subscription']>['status'] | null;
  failureCode: string | null;
}

export interface AiUsageResponse {
  plan: 'GUEST' | 'FREE' | 'PRO';
  used: number;
  limit: number | null;
  remaining: number | null;
  resetAt: string;
  advancedTools: boolean;
  generationEnabled: boolean;
}

export interface FeatureUsageResponse {
  plan: string;
  usage: Array<{
    featureKey: string;
    featureName: string;
    unitLabel: string;
    resetPeriod: 'DAILY' | 'MONTHLY';
    used: number;
    limit: number | null;
    remaining: number | null;
    warning: boolean;
    reached: boolean;
    resetAt: string;
  }>;
}

export interface AdminBillingOverview {
  users: { free: number; pro: number };
  activeSubscriptions: number;
  aiUsageToday: number;
  usageByPlan: { GUEST: number; FREE: number; PRO: number };
  failedWebhooks: number;
  payments: Record<string, number>;
  analytics: {
    proSharePercent: number;
    checkoutConversionPercent: number;
    retainedRevenueCentavos: number;
    retainedRevenue30DaysCentavos: number;
    currency: string;
  };
}

export interface AdminBillingPayment {
  id: string;
  plan: 'FREE' | 'PRO';
  status: CheckoutResponse['status'];
  amount: number;
  currency: string;
  createdAt: string;
  paidAt: string | null;
  user: { username: string; email: string; plan: 'FREE' | 'PRO' };
}

export interface AdminBillingWebhookFailure {
  externalEventId: string;
  eventType: string;
  status: string;
  errorCode: string | null;
  receivedAt: string;
}

export interface AudienceOption {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
}

export interface MyAudiencesResponse {
  onboardingCompleted: boolean;
  selected: AudienceOption[];
  options: AudienceOption[];
}

export interface AdminAudience extends AudienceOption {
  _count: { promptAudiences: number; userAudiences: number };
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

export interface AdminDashboardResponse {
  users: number;
  prompts: number;
  openReports: number;
  comments: number;
  collections: number;
  staff: number;
}

export interface AdminUser {
  id: string;
  email: string;
  username: string;
  role: 'USER' | 'MODERATOR' | 'ADMIN';
  status: 'ACTIVE' | 'SUSPENDED' | 'DELETED';
  accountType: 'REAL' | 'STARTER' | 'OFFICIAL';
  createdAt: string;
  staffCredential: { lastLoginAt: string | null } | null;
}

export interface AdminUsersResponse {
  items: AdminUser[];
  page: number;
  pageSize: number;
  total: number;
  hasNextPage: boolean;
}

export interface AnalyticsSummaryResponse {
  generatedAt: string;
  accountTypesIncluded: string[];
  period: { preset: string; from: string; to: string; granularity: string };
  overview: {
    totalEvents: number;
    sessions: number;
    landingViews: number;
    organicVisits: number;
    returningUsers: number;
    signupStarts: number;
    completedSignups: number;
    signupConversionRate: number;
    dau: number;
    wau: number;
    mau: number;
    activatedUsers: number;
    activationRate: number;
    retention7DayRate: number;
    promptReuses: number;
    limitReached: number;
  };
  events: Array<{ name: string; count: number }>;
  evidenceFunnel: Array<{ name: string; count: number }>;
  acquisition: Array<{ source: string; count: number }>;
  trends: Array<{ bucket: string; name: string; count: number }>;
  publicPrompts: Array<{ promptId: string; views: number; uses: number; useRate: number }>;
  monetization: {
    subscriptionsStarted: number;
    subscriptionsCanceled: number;
    revenue: number;
  };
}

export interface AdminSetting {
  key: string;
  value: string | number | boolean;
  defaultValue: string | number | boolean;
  group: string;
  isPublic: boolean;
  label: string;
  description: string;
  type: 'string' | 'boolean' | 'number';
  maxLength?: number;
  updatedAt: string | null;
}

export interface AdminSystemResponse {
  checkedAt: string;
  environment: string;
  runtime: string;
  uptimeSeconds: number;
  dependencies: {
    database: { status: 'up' | 'down'; latencyMs: number };
    redis: { status: 'up' | 'down' };
  };
  integrations: {
    googleOAuth: boolean;
    githubOAuth: boolean;
    cloudStorage: boolean;
  };
  metrics: {
    requests: {
      total: number;
      responses2xx: number;
      responses4xx: number;
      responses5xx: number;
      averageLatencyMs: number;
      failedLogins: number;
    };
    evidence: {
      uploads: number;
      uploadFailures: number;
      averageUploadLatencyMs: number;
      rejectedOversizedFiles: number;
      rejectedFileTypes: number;
      storageErrors: number;
    };
  };
}

export interface ProfileRepository {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  updatedAt: string;
  promptAudiences: { audience: Pick<AudienceOption, 'id' | 'name' | 'slug'> }[];
}

export interface ProfileCollection {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  updatedAt: string;
  _count: { items: number };
}

export interface ProfileResponse {
  id: string;
  username: string;
  accountType: 'REAL' | 'STARTER' | 'OFFICIAL';
  displayName: string | null;
  bio: string | null;
  avatar: string | null;
  website: string | null;
  createdAt: string;
  stats: {
    repositories: number;
    followers: number;
    following: number;
  };
  isFollowing: boolean;
  repositories: ProfileRepository[];
  collections: ProfileCollection[];
}

export interface FollowListResponse {
  items: Array<{
    createdAt: string;
    follower?: ProfileSummary;
    following?: ProfileSummary;
  }>;
  page: number;
  pageSize: number;
  total: number;
  hasNextPage: boolean;
}

export interface CollectionItem {
  promptRepositoryId: string;
  sortOrder: number;
  promptRepository: {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    visibility: 'PUBLIC' | 'UNLISTED' | 'PRIVATE';
    owner: { username: string };
    promptAudiences: {
      audience: Pick<AudienceOption, 'id' | 'name' | 'slug'>;
    }[];
  };
}

export interface CollectionDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  visibility: 'PUBLIC' | 'PRIVATE';
  createdAt: string;
  updatedAt: string;
  owner: { id: string; username: string };
  items: CollectionItem[];
}

export interface SearchResult {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  origin: 'COMMUNITY' | 'AI_GENERATED' | 'IMPORTED';
  aiCompatibility: string | null;
  visibility: 'PUBLIC' | 'UNLISTED' | 'PRIVATE';
  copyCount: number;
  saveCount: number;
  likeCount: number;
  variantCount: number;
  updatedAt: string;
  owner: { username: string; accountType: 'REAL' | 'STARTER' | 'OFFICIAL' };
  category: { name: string; slug: string } | null;
  promptTags: { tag: { name: string; slug: string } }[];
  promptAudiences: { audience: Pick<AudienceOption, 'id' | 'name' | 'slug'> }[];
}

export interface SearchResponse {
  items: SearchResult[];
  page: number;
  pageSize: number;
  total: number;
  hasNextPage: boolean;
}

export interface AiPromptDraft {
  title: string;
  description: string;
  content: string;
  variables: Array<{
    name: string;
    description?: string;
    defaultValue?: string;
    required?: boolean;
  }>;
  tags: string[];
  categorySlug?: string;
  audienceSlug?: string;
}

export interface AiGenerationResponse {
  id: string;
  status: 'SUCCEEDED' | 'FAILED' | 'REJECTED' | 'REQUESTED';
  output: AiPromptDraft | null;
  createdAt: string;
  saveToken?: string;
}

export interface AdminAiGeneration {
  id: string;
  goal: string;
  operation: string;
  status: string;
  output: AiPromptDraft | null;
  providerModel: string | null;
  repositoryId: string | null;
  createdAt: string;
  completedAt: string | null;
  requester: { username: string } | null;
  repository: {
    slug: string;
    title: string;
    visibility: string;
    currentVersion: { status: string } | null;
  } | null;
}

export interface AdminAiUsage {
  period: string;
  total: number;
  public: number;
  internal: number;
  succeeded: number;
  failed: number;
  rejected: number;
}

export interface AdminAiGaps {
  threshold: number;
  categories: Array<{ name: string; slug: string; promptCount: number }>;
  audiences: Array<{ name: string; slug: string; promptCount: number }>;
}

export interface SitemapResponse {
  prompts: Array<{
    id: string;
    slug: string;
    updatedAt: string;
    owner: { username: string };
  }>;
  profiles: Array<{ username: string; updatedAt: string }>;
  collections: Array<{
    slug: string;
    updatedAt: string;
    owner: { username: string };
  }>;
  landingPages?: SeoLandingPageIndex;
}

export interface SeoLandingPageIndex {
  minimumPromptCount: number;
  categories: Array<{
    id: string;
    name: string;
    slug: string;
    promptCount: number;
  }>;
  audiences: Array<{
    id: string;
    name: string;
    slug: string;
    description: string | null;
    promptCount: number;
  }>;
}

export interface ExploreRepository {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  origin: 'COMMUNITY' | 'AI_GENERATED' | 'IMPORTED';
  copyCount: number;
  saveCount: number;
  likeCount: number;
  variantCount: number;
  updatedAt: string;
  owner: { username: string; accountType: 'REAL' | 'STARTER' | 'OFFICIAL' };
  category: { name: string; slug: string } | null;
  promptAudiences: { audience: Pick<AudienceOption, 'id' | 'name' | 'slug'> }[];
}

export interface ExploreResponse {
  recommendedForYou: ExploreRepository[];
  featured: ExploreRepository[];
  popular: ExploreRepository[];
  recentlyUpdated: ExploreRepository[];
  mostCopied: ExploreRepository[];
  mostSaved: ExploreRepository[];
  mostVariants: ExploreRepository[];
  categories: CategoryOption[];
  audiences: AudienceOption[];
  starterCollections: Array<{
    id: string;
    name: string;
    slug: string;
    description: string | null;
    owner: { username: string; accountType: 'REAL' | 'STARTER' | 'OFFICIAL' };
    _count: { items: number };
  }>;
}

export interface ActivityFeedResponse {
  items: Array<{
    id: string;
    type:
      | 'REPOSITORY_CREATED'
      | 'VERSION_PUBLISHED'
      | 'VARIANT_CREATED'
      | 'COLLECTION_CREATED';
    metadata: Record<string, unknown> | null;
    createdAt: string;
    actor: { username: string };
    promptRepository: { title: string; slug: string } | null;
    collection: {
      name: string;
      slug: string;
      owner: { username: string };
    } | null;
  }>;
  page: number;
  pageSize: number;
  total: number;
  hasNextPage: boolean;
}

export interface RepositoryActivityResponse {
  id: string;
  type:
    | 'REPOSITORY_CREATED'
    | 'VERSION_PUBLISHED'
    | 'VARIANT_CREATED'
    | 'COLLECTION_CREATED';
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actor: { username: string };
}

export interface NotificationsResponse {
  items: Array<{
    id: string;
    type:
      | 'NEW_FOLLOWER'
      | 'PROMPT_LIKED'
      | 'PROMPT_COMMENTED'
      | 'COMMENT_REPLIED'
      | 'VARIANT_CREATED';
    readAt: string | null;
    createdAt: string;
    actor: { username: string } | null;
    promptRepository: { title: string; slug: string } | null;
    comment: { id: string; content: string; promptRepositoryId: string } | null;
  }>;
  page: number;
  pageSize: number;
  total: number;
  unreadCount: number;
  hasNextPage: boolean;
}

export interface ReportResponse {
  submitted: boolean;
  report: {
    id: string;
    status: 'OPEN' | 'DISMISSED' | 'RESOLVED';
    createdAt: string;
  };
}

export interface ModerationReport {
  id: string;
  targetType: 'REPOSITORY' | 'COMMENT' | 'USER';
  targetId: string;
  reason: string;
  description: string | null;
  status: 'OPEN' | 'DISMISSED' | 'RESOLVED';
  createdAt: string;
  reporter: { username: string };
}

export interface ModerationSummary {
  openReports: number;
  reportsToday: number;
  actionsToday: number;
  hiddenPrompts: number;
  hiddenComments: number;
}

export interface AuditResponse {
  items: Array<{
    id: string;
    action: string;
    targetType: string;
    targetId: string | null;
    metadata: Record<string, unknown> | null;
    createdAt: string;
    actor: { username: string } | null;
  }>;
  page: number;
  pageSize: number;
  total: number;
  hasNextPage: boolean;
}

interface ProfileSummary {
  id: string;
  username: string;
  profile: { displayName: string | null; avatar: string | null } | null;
}

export interface CategoryOption {
  id: string;
  name: string;
  slug: string;
}

export interface TagOption {
  id: string;
  name: string;
  slug: string;
}

export interface PromptCreateResponse {
  id: string;
  slug: string;
  promptVersionId: string;
}

export interface OwnedPromptRepository {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  visibility: 'PUBLIC' | 'UNLISTED' | 'PRIVATE';
  status: 'ACTIVE' | 'HIDDEN' | 'ARCHIVED';
  createdAt: string;
  updatedAt: string;
  category: { name: string; slug: string } | null;
  currentVersion: {
    versionNumber: number;
    status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
    updatedAt: string;
  } | null;
  _count: { bookmarks: number; variants: number };
}

export interface PromptEvidenceImage {
  id: string;
  secureUrl: string;
  originalFilename: string;
  mimeType: string;
  altText: string | null;
  caption: string | null;
  sortOrder: number;
}

export interface PromptVersionSummary {
  id: string;
  versionNumber: number;
  changelog: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  author: { username: string };
}

export interface PromptVersionContent {
  id: string;
  versionNumber: number;
  content: string;
  changelog: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  variables: Array<{
    id: string;
    name: string;
    description: string | null;
    defaultValue: string | null;
    required: boolean;
  }>;
  examples: Array<{
    id: string;
    title: string | null;
    input: string;
    output: string;
    sortOrder: number;
  }>;
  evidenceImages: PromptEvidenceImage[];
}

export interface PromptVersionDetail extends PromptVersionContent {
  author: { username: string };
}

export interface PromptLineageNode {
  id: string;
  title: string;
  slug: string;
  ownerUsername: string;
  variantCount: number;
  children: PromptLineageNode[];
}

export interface PromptLineageResponse {
  root: PromptLineageNode | null;
  currentRepositoryId: string;
  directSource: {
    id: string;
    title: string;
    slug: string;
    ownerUsername: string;
  } | null;
  variantCount: number;
}

export interface PromptRepositoryDetail {
  id: string;
  ownerId: string;
  title: string;
  slug: string;
  description: string | null;
  origin: 'COMMUNITY' | 'AI_GENERATED' | 'IMPORTED';
  aiCompatibility: string | null;
  visibility: 'PUBLIC' | 'UNLISTED' | 'PRIVATE';
  status: 'ACTIVE' | 'HIDDEN' | 'ARCHIVED';
  license: string | null;
  createdAt: string;
  updatedAt: string;
  copyCount: number;
  saveCount: number;
  likeCount: number;
  isSaved: boolean;
  isLiked: boolean;
  isFavorite?: boolean;
  isPinned?: boolean;
  useCount?: number;
  lastUsedAt?: string | null;
  variantCount: number;
  sourcePromptId: string | null;
  rootPromptId: string | null;
  owner: {
    username: string;
    status: 'ACTIVE' | 'SUSPENDED' | 'DELETED';
    profile: { displayName: string | null; avatar: string | null } | null;
  };
  category: { name: string; slug: string } | null;
  sourcePrompt: {
    title: string;
    slug: string;
    owner: { username: string };
  } | null;
  promptTags: { tag: TagOption }[];
  promptAudiences: { audience: Pick<AudienceOption, 'id' | 'name' | 'slug'> }[];
  currentVersion: PromptVersionContent | null;
}

export interface SavedRepositoryItem {
  createdAt: string;
  lastUsedAt: string | null;
  useCount: number;
  isFavorite: boolean;
  isPinned: boolean;
  promptRepository: {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    visibility: 'PUBLIC' | 'UNLISTED' | 'PRIVATE';
    updatedAt: string;
    owner: { username: string };
    category: { name: string; slug: string } | null;
    promptAudiences: {
      audience: Pick<AudienceOption, 'id' | 'name' | 'slug'>;
    }[];
  };
}

export interface SavedRepositoriesResponse {
  items: SavedRepositoryItem[];
  page: number;
  pageSize: number;
  total: number;
  hasNextPage: boolean;
}

export interface CommentItem {
  id: string;
  userId: string;
  content: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  user: { username: string };
  replies: CommentItem[];
}

export interface CommentsResponse {
  items: CommentItem[];
  page: number;
  pageSize: number;
  total: number;
  hasNextPage: boolean;
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function getApiBaseUrl() {
  return (
    process.env.INTERNAL_API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    'http://localhost:4000/api/v1'
  );
}

export function getMediaUrl(url: string | null) {
  if (!url) {
    return null;
  }

  return new URL(url, getApiBaseUrl()).toString();
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit & { accessToken?: string } = {},
): Promise<T> {
  const { accessToken, ...requestOptions } = options;
  const headers = new Headers(requestOptions.headers);

  if (
    requestOptions.body &&
    !(requestOptions.body instanceof FormData) &&
    !headers.has('content-type')
  ) {
    headers.set('content-type', 'application/json');
  }

  if (accessToken) {
    headers.set('authorization', `Bearer ${accessToken}`);
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...requestOptions,
    credentials: 'include',
    headers,
  });
  const body = (await response.json().catch(() => null)) as
    { message?: string | string[] } | T | null;

  if (!response.ok) {
    const message =
      body && typeof body === 'object' && 'message' in body
        ? body.message
        : undefined;
    throw new ApiError(
      Array.isArray(message) ? message.join(', ') : message || 'Request failed',
      response.status,
    );
  }

  return body as T;
}

export async function fetchApiHealth(): Promise<ApiHealthResponse | null> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/health`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as ApiHealthResponse;
  } catch {
    return null;
  }
}

export async function fetchExploreData(): Promise<ExploreResponse | null> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/search/explore`, {
      headers: { accept: 'application/json' },
      next: { revalidate: 300 },
    });

    if (!response.ok) return null;
    return (await response.json()) as ExploreResponse;
  } catch {
    return null;
  }
}

export async function fetchSearchData(
  params: URLSearchParams,
): Promise<SearchResponse | null> {
  try {
    const response = await fetch(
      `${getApiBaseUrl()}/search?${params.toString()}`,
      { cache: 'no-store', headers: { accept: 'application/json' } },
    );

    if (!response.ok) return null;
    return (await response.json()) as SearchResponse;
  } catch {
    return null;
  }
}

export async function fetchSeoLandingPages(): Promise<SeoLandingPageIndex | null> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/search/landing-pages`, {
      next: { revalidate: 3600 },
      headers: { accept: 'application/json' },
    });
    if (!response.ok) return null;
    return (await response.json()) as SeoLandingPageIndex;
  } catch {
    return null;
  }
}

export async function fetchCategory(
  slug: string,
): Promise<CategoryOption | null> {
  try {
    const response = await fetch(
      `${getApiBaseUrl()}/categories/${encodeURIComponent(slug)}`,
      {
        next: { revalidate: 3600 },
        headers: { accept: 'application/json' },
      },
    );
    if (!response.ok) return null;
    return (await response.json()) as CategoryOption;
  } catch {
    return null;
  }
}

export async function fetchAudience(
  slug: string,
): Promise<AudienceOption | null> {
  try {
    const response = await fetch(
      `${getApiBaseUrl()}/audiences/${encodeURIComponent(slug)}`,
      {
        next: { revalidate: 3600 },
        headers: { accept: 'application/json' },
      },
    );
    if (!response.ok) return null;
    return (await response.json()) as AudienceOption;
  } catch {
    return null;
  }
}

export function fetchBillingPlans() {
  return apiRequest<BillingPlansResponse>('/billing/plans');
}

export function fetchBillingSummary(accessToken: string) {
  return apiRequest<BillingSummaryResponse>('/billing/me', { accessToken });
}

export function fetchAiUsage(accessToken?: string) {
  return apiRequest<AiUsageResponse>('/ai/usage', { accessToken });
}

export function fetchFeatureUsage(accessToken: string) {
  return apiRequest<FeatureUsageResponse>('/billing/usage', { accessToken });
}

export function updatePromptReuse(
  slug: string,
  action: 'use' | 'favorite' | 'unfavorite' | 'pin' | 'unpin',
  accessToken: string,
) {
  const method =
    action === 'unfavorite' || action === 'unpin' ? 'DELETE' : 'POST';
  const endpoint =
    action === 'use'
      ? 'use'
      : action.replace('unfavorite', 'favorite').replace('unpin', 'pin');
  return apiRequest(
    `/prompt-repositories/${encodeURIComponent(slug)}/${endpoint}`,
    {
      accessToken,
      method,
    },
  );
}

export function startProCheckout(
  accessToken: string,
  discountCode?: string,
  planCode = 'PRO',
) {
  return apiRequest<CheckoutResponse>('/billing/checkout', {
    accessToken,
    headers: { 'idempotency-key': crypto.randomUUID() },
    method: 'POST',
    body: JSON.stringify({ planCode, discountCode: discountCode || undefined }),
  });
}

export interface AdminDiscountCode {
  id: string;
  code: string;
  name: string;
  description: string | null;
  type: 'PERCENTAGE' | 'FIXED_AMOUNT';
  value: number;
  maxDiscountAmount: number | null;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  maxRedemptions: number | null;
  maxRedemptionsPerUser: number;
  redemptionCount: number;
  createdAt: string;
}

export function fetchPaymentStatus(paymentId: string, accessToken: string) {
  return apiRequest<PaymentStatusResponse>(
    `/billing/payments/${encodeURIComponent(paymentId)}`,
    { accessToken },
  );
}

export function cancelPayment(paymentId: string, accessToken: string) {
  return apiRequest<PaymentStatusResponse>(
    `/billing/payments/${encodeURIComponent(paymentId)}/cancel`,
    { accessToken, method: 'POST' },
  );
}

export function createAdminDiscount(
  accessToken: string,
  input: Record<string, unknown>,
) {
  return apiRequest<AdminDiscountCode>('/admin/billing/discounts', {
    accessToken,
    method: 'POST',
    body: JSON.stringify(input),
  });
}
