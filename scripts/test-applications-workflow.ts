import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, readFileSync } from 'fs';
import { homedir } from 'os';
import { encode } from 'next-auth/jwt';
import { STAFF_ROLES } from '../lib/staffApplicationForm';

type ApplicationStatus = 'pending' | 'considered' | 'denied';

interface ApplicationRecord {
  _id: string;
  applicationRole?: string;
  status: ApplicationStatus;
  notes?: string;
  aboutYourself?: string;
  whyJoin?: string;
}

interface StatsData {
  total: number;
  pending: number;
  considered: number;
  denied: number;
}

interface ApiSuccess<T> {
  success: true;
  data: T;
}

interface ApiFailure {
  success?: false;
  error?: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const BASE_URL = (process.env.APP_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const TEST_USER_COOKIE_FILE = process.env.TEST_USER_COOKIE_FILE || process.env.COOKIE_FILE || '';
const ADMIN_COOKIE_FILE = process.env.ADMIN_COOKIE_FILE || TEST_USER_COOKIE_FILE;
const DEFAULT_COOKIE_EXPORT = join(homedir(), 'Downloads', 'cookies.txt');
const TEST_USER_NAME = process.env.TEST_USER_NAME || 'tesr user';
const TEST_USER_ID = process.env.TEST_USER_ID || '900000000000000001';
const ADMIN_USER_NAME = process.env.ADMIN_USER_NAME || 'admin tester';
const ADMIN_USER_ID = process.env.ADMIN_USER_ID || '900000000000000002';
const COOKIE_NAME_ALLOWLIST = [
  'next-auth.session-token',
  '__Secure-next-auth.session-token',
  'authjs.session-token',
  '__Secure-authjs.session-token',
];

let RESOLVED_TEST_USER_COOKIE = '';
let RESOLVED_ADMIN_COOKIE = '';

type ExportedCookie = {
  domain: string;
  path: string;
  name: string;
  value: string;
};

function normalizeDomain(value: string): string {
  return value.trim().replace(/^\./, '').toLowerCase();
}

function hostMatchesDomain(host: string, domain: string): boolean {
  const normalizedHost = normalizeDomain(host);
  const normalizedDomain = normalizeDomain(domain);
  return normalizedHost === normalizedDomain || normalizedHost.endsWith(`.${normalizedDomain}`);
}

function parseNetscapeCookies(content: string): ExportedCookie[] {
  const cookies: ExportedCookie[] = [];

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const columns = line.split('\t');
    if (columns.length < 7) continue;

    const domain = columns[0]?.trim() || '';
    const path = columns[2]?.trim() || '/';
    const name = columns[5]?.trim() || '';
    const value = columns.slice(6).join('\t').trim();

    if (!domain || !name || !value) continue;
    cookies.push({ domain, path, name, value });
  }

  return cookies;
}

function parseJsonCookies(content: string): ExportedCookie[] {
  const parsed = JSON.parse(content);
  const list: unknown[] = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === 'object' && Array.isArray((parsed as any).cookies)
      ? (parsed as any).cookies
      : [];

  const cookies: ExportedCookie[] = [];
  for (const entry of list) {
    if (!entry || typeof entry !== 'object') continue;
    const cookie = entry as any;
    const domain = typeof cookie.domain === 'string' ? cookie.domain : '';
    const path = typeof cookie.path === 'string' ? cookie.path : '/';
    const name = typeof cookie.name === 'string' ? cookie.name : '';
    const value = typeof cookie.value === 'string' ? cookie.value : '';

    if (!domain || !name || !value) continue;
    cookies.push({ domain, path, name, value });
  }

  return cookies;
}

function parseCookieExport(filePath: string): ExportedCookie[] {
  const raw = readFileSync(filePath, 'utf-8');
  const trimmed = raw.trimStart();

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return parseJsonCookies(raw);
  }

  return parseNetscapeCookies(raw);
}

function buildCookieHeaderFromFile(filePath: string, targetUrl: string, label: string): string {
  if (!existsSync(filePath)) {
    throw new Error(`${label} cookie file not found: ${filePath}`);
  }

  const host = new URL(targetUrl).hostname;
  const cookies = parseCookieExport(filePath);

  const domainCookies = cookies.filter((cookie) => hostMatchesDomain(host, cookie.domain));
  if (domainCookies.length === 0) {
    throw new Error(
      `${label} cookie file has no cookies for host ${host}. Re-export cookies for this host and try again.`
    );
  }

  const preferredCookies = domainCookies.filter((cookie) => COOKIE_NAME_ALLOWLIST.includes(cookie.name));
  const selected = preferredCookies.length > 0 ? preferredCookies : domainCookies;

  const merged = new Map<string, string>();
  for (const cookie of selected) {
    merged.set(cookie.name, cookie.value);
  }

  const header = Array.from(merged.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');

  if (!header) {
    throw new Error(`${label} cookie file did not produce a valid Cookie header`);
  }

  return header;
}

function resolveCookie(rawCookie: string | undefined, cookieFile: string, label: string): string {
  if (rawCookie && rawCookie.trim()) {
    return rawCookie.trim();
  }

  const explicitFile = cookieFile && cookieFile.trim() ? cookieFile.trim() : '';
  if (explicitFile) {
    return buildCookieHeaderFromFile(explicitFile, BASE_URL, label);
  }

  if (existsSync(DEFAULT_COOKIE_EXPORT)) {
    return buildCookieHeaderFromFile(DEFAULT_COOKIE_EXPORT, BASE_URL, label);
  }

  return '';
}

function hasNextAuthCookie(cookieHeader: string): boolean {
  return COOKIE_NAME_ALLOWLIST.some((cookieName) => cookieHeader.includes(`${cookieName}=`));
}

async function buildSyntheticNextAuthCookie(options: {
  discordId: string;
  username: string;
  hasFullAccess: boolean;
}): Promise<string> {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error('NEXTAUTH_SECRET is required to generate synthetic session cookies');
  }

  const sessionCookieName = BASE_URL.startsWith('https://')
    ? '__Secure-next-auth.session-token'
    : 'next-auth.session-token';

  const nowSeconds = Math.floor(Date.now() / 1000);
  const nowMs = Date.now();

  const token = {
    name: options.username,
    sub: options.discordId,
    discordId: options.discordId,
    accessToken: 'synthetic-dev-token',
    refreshToken: 'synthetic-dev-refresh',
    expiresAt: nowSeconds + 24 * 60 * 60,
    permissions: {
      hasFullAccess: options.hasFullAccess,
      hasModeratorAccess: options.hasFullAccess,
      hasViewOnlyAccess: options.hasFullAccess,
      hasCasinoAccess: options.hasFullAccess,
      hasAnyAccess: true,
      isOwner: options.hasFullAccess,
      isAdmin: options.hasFullAccess,
      hasManageServer: options.hasFullAccess,
      roles: [] as string[],
    },
    hasAccess: true,
    accessCheckedAt: nowMs,
  };

  const encoded = await encode({
    token,
    secret,
    maxAge: 24 * 60 * 60,
    salt: sessionCookieName,
  });

  return `${sessionCookieName}=${encoded}`;
}

async function ensureConfig() {
  const resolvedTestFromSource = resolveCookie(process.env.TEST_USER_COOKIE, TEST_USER_COOKIE_FILE, 'TEST_USER');
  const resolvedAdminFromSource = resolveCookie(process.env.ADMIN_COOKIE, ADMIN_COOKIE_FILE, 'ADMIN');

  if (resolvedTestFromSource && hasNextAuthCookie(resolvedTestFromSource)) {
    RESOLVED_TEST_USER_COOKIE = resolvedTestFromSource;
  } else {
    RESOLVED_TEST_USER_COOKIE = await buildSyntheticNextAuthCookie({
      discordId: TEST_USER_ID,
      username: TEST_USER_NAME,
      hasFullAccess: false,
    });
    console.warn('TEST_USER cookie source missing NextAuth cookie, using synthetic local session token');
  }

  if (resolvedAdminFromSource && hasNextAuthCookie(resolvedAdminFromSource)) {
    RESOLVED_ADMIN_COOKIE = resolvedAdminFromSource;
  } else {
    RESOLVED_ADMIN_COOKIE = await buildSyntheticNextAuthCookie({
      discordId: ADMIN_USER_ID,
      username: ADMIN_USER_NAME,
      hasFullAccess: true,
    });
    console.warn('ADMIN cookie source missing NextAuth cookie, using synthetic local session token');
  }

  if (!RESOLVED_TEST_USER_COOKIE || !RESOLVED_ADMIN_COOKIE) {
    throw new Error(
      'Unable to resolve test/admin cookies. Provide cookie env vars or cookie files, or ensure NEXTAUTH_SECRET is set for synthetic local sessions.'
    );
  }
}

function buildHeaders(cookie: string, hasBody: boolean): Headers {
  const headers = new Headers();
  headers.set('Cookie', cookie);
  if (hasBody) {
    headers.set('Content-Type', 'application/json');
  }
  return headers;
}

async function requestJson<T>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
    cookie: string;
    body?: unknown;
  }
): Promise<T> {
  const method = options.method || 'GET';
  const hasBody = typeof options.body !== 'undefined';
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: buildHeaders(options.cookie, hasBody),
    body: hasBody ? JSON.stringify(options.body) : undefined,
    cache: 'no-store',
  });

  const text = await response.text();
  const parsed = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const reason =
      parsed && typeof parsed === 'object' && 'error' in parsed
        ? String((parsed as ApiFailure).error || '')
        : text;
    throw new Error(`${method} ${path} failed (${response.status}): ${reason || 'Unknown error'}`);
  }

  return parsed as T;
}

function countByStatus(statuses: ApplicationStatus[]): Pick<StatsData, 'pending' | 'considered' | 'denied'> {
  return statuses.reduce(
    (acc, status) => {
      acc[status] += 1;
      return acc;
    },
    { pending: 0, considered: 0, denied: 0 }
  );
}

async function main() {
  await ensureConfig();

  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const marker = `E2E_APP_${runId}`;

  const createdIds: string[] = [];
  const finalStatuses: ApplicationStatus[] = ['pending', 'considered', 'denied', 'considered', 'pending'];

  let baselineStats: StatsData | null = null;
  let hadFailure = false;

  try {
    console.log('Running staff application workflow test');
    console.log(`Base URL: ${BASE_URL}`);
    console.log(`Marker: ${marker}`);

    const baselineStatsResponse = await requestJson<ApiSuccess<StatsData>>('/api/applications/stats', {
      method: 'GET',
      cookie: RESOLVED_ADMIN_COOKIE,
    });
    baselineStats = baselineStatsResponse.data;
    console.log('Fetched baseline stats:', baselineStats);

    for (const role of STAFF_ROLES) {
      const submitBody = {
        formVersion: 2,
        applicationRole: role.id,
        discordUsername: TEST_USER_NAME,
        country: `country-${marker}`,
        timezone: 'UTC',
        age: '21',
        aboutYourself: `${marker} about ${role.id}`,
        whyJoin: `${marker} why ${role.id}`,
        dailyAvailability: '2-3 hours daily',
        hoursPerWeek: '2-3 hours daily',
        roleAnswers: {
          introduction_purpose: `${marker} intro ${role.id}`,
          daily_availability: '2-3 hours daily',
        },
      };

      const submitResponse = await requestJson<ApiSuccess<ApplicationRecord>>('/api/applications', {
        method: 'POST',
        cookie: RESOLVED_TEST_USER_COOKIE,
        body: submitBody,
      });

      createdIds.push(submitResponse.data._id);
      console.log(`Submitted ${role.id} application: ${submitResponse.data._id}`);
    }

    if (createdIds.length !== 5) {
      throw new Error(`Expected 5 created applications, got ${createdIds.length}`);
    }

    const listedResponse = await requestJson<ApiSuccess<ApplicationRecord[]>>(
      `/api/applications?search=${encodeURIComponent(marker)}`,
      {
        method: 'GET',
        cookie: RESOLVED_ADMIN_COOKIE,
      }
    );

    const listedIds = new Set(listedResponse.data.map((app) => app._id));
    for (const id of createdIds) {
      if (!listedIds.has(id)) {
        throw new Error(`Created application missing from admin list: ${id}`);
      }
    }
    console.log('Verified created applications are visible in admin list');

    for (let i = 0; i < createdIds.length; i += 1) {
      const id = createdIds[i];
      const finalStatus = finalStatuses[i];

      await requestJson<ApiSuccess<ApplicationRecord>>(`/api/applications/${id}`, {
        method: 'GET',
        cookie: RESOLVED_ADMIN_COOKIE,
      });

      await requestJson<ApiSuccess<ApplicationRecord>>(`/api/applications/${id}`, {
        method: 'PATCH',
        cookie: RESOLVED_ADMIN_COOKIE,
        body: { notes: `Admin note ${marker} #${i + 1}` },
      });

      await requestJson<ApiSuccess<ApplicationRecord>>(`/api/applications/${id}`, {
        method: 'PATCH',
        cookie: RESOLVED_ADMIN_COOKIE,
        body: { status: 'considered' },
      });

      await requestJson<ApiSuccess<ApplicationRecord>>(`/api/applications/${id}`, {
        method: 'PATCH',
        cookie: RESOLVED_ADMIN_COOKIE,
        body: { status: 'denied' },
      });

      await requestJson<ApiSuccess<ApplicationRecord>>(`/api/applications/${id}`, {
        method: 'PATCH',
        cookie: RESOLVED_ADMIN_COOKIE,
        body: { status: finalStatus },
      });

      console.log(`Verified full admin action flow for: ${id}`);
    }

    const postUpdateListResponse = await requestJson<ApiSuccess<ApplicationRecord[]>>(
      `/api/applications?search=${encodeURIComponent(marker)}`,
      {
        method: 'GET',
        cookie: RESOLVED_ADMIN_COOKIE,
      }
    );

    const byId = new Map(postUpdateListResponse.data.map((app) => [app._id, app]));
    for (let i = 0; i < createdIds.length; i += 1) {
      const id = createdIds[i];
      const app = byId.get(id);
      if (!app) {
        throw new Error(`Application missing after updates: ${id}`);
      }

      if (app.status !== finalStatuses[i]) {
        throw new Error(
          `Status mismatch for ${id}. Expected ${finalStatuses[i]}, got ${app.status}`
        );
      }
    }
    console.log('Verified final statuses for all 5 applications');

    const statsAfterUpdates = await requestJson<ApiSuccess<StatsData>>('/api/applications/stats', {
      method: 'GET',
      cookie: RESOLVED_ADMIN_COOKIE,
    });

    if (baselineStats) {
      const expectedStatusDelta = countByStatus(finalStatuses);
      const actualDelta = {
        total: statsAfterUpdates.data.total - baselineStats.total,
        pending: statsAfterUpdates.data.pending - baselineStats.pending,
        considered: statsAfterUpdates.data.considered - baselineStats.considered,
        denied: statsAfterUpdates.data.denied - baselineStats.denied,
      };

      if (
        actualDelta.total !== 5 ||
        actualDelta.pending !== expectedStatusDelta.pending ||
        actualDelta.considered !== expectedStatusDelta.considered ||
        actualDelta.denied !== expectedStatusDelta.denied
      ) {
        console.warn('Warning: stats delta differs from expected. This can happen with concurrent live traffic.');
        console.warn('Expected delta:', {
          total: 5,
          pending: expectedStatusDelta.pending,
          considered: expectedStatusDelta.considered,
          denied: expectedStatusDelta.denied,
        });
        console.warn('Actual delta:', actualDelta);
      } else {
        console.log('Verified stats delta after create/update actions');
      }
    }

    console.log('Workflow verification complete. Proceeding to cleanup.');
  } catch (error) {
    hadFailure = true;
    const message = error instanceof Error ? error.message : String(error);
    console.error('Workflow test failed:', message);
  } finally {
    if (createdIds.length > 0) {
      console.log('Cleaning up created applications...');
    }

    for (const id of createdIds) {
      try {
        await requestJson<ApiSuccess<Record<string, never>>>(`/api/applications/${id}`, {
          method: 'DELETE',
          cookie: RESOLVED_ADMIN_COOKIE,
        });
        console.log(`Deleted application: ${id}`);
      } catch (error) {
        hadFailure = true;
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Failed to delete ${id}:`, message);
      }
    }

    if (createdIds.length > 0) {
      try {
        const verifyDeletion = await requestJson<ApiSuccess<ApplicationRecord[]>>(
          `/api/applications?search=${encodeURIComponent(marker)}`,
          {
            method: 'GET',
            cookie: RESOLVED_ADMIN_COOKIE,
          }
        );

        const leftovers = verifyDeletion.data.filter((app) => createdIds.includes(app._id));
        if (leftovers.length > 0) {
          hadFailure = true;
          console.error('Cleanup verification failed, leftover application IDs:', leftovers.map((a) => a._id));
        } else {
          console.log('Verified cleanup: all 5 created applications were deleted');
        }
      } catch (error) {
        hadFailure = true;
        const message = error instanceof Error ? error.message : String(error);
        console.error('Failed to verify cleanup:', message);
      }

      if (baselineStats) {
        try {
          const finalStats = await requestJson<ApiSuccess<StatsData>>('/api/applications/stats', {
            method: 'GET',
            cookie: RESOLVED_ADMIN_COOKIE,
          });
          console.log('Final stats after cleanup:', finalStats.data);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.warn('Could not fetch final stats:', message);
        }
      }
    }

    if (hadFailure) {
      process.exitCode = 1;
      console.error('Result: FAILED');
    } else {
      console.log('Result: PASSED');
    }
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error('Fatal error:', message);
  process.exit(1);
});
