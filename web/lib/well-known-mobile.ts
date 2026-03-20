/**
 * Digital Asset Links + Apple App Site Association (server-generated).
 * Configure via env on the production web container (e.g. Coolify). No files required in public/.
 */

function normalizeFingerprints(raw: string): string[] {
  return raw
    .split(/[\s,]+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

/** Full JSON body if set and valid. */
function verbatimJson(envName: 'ASSETLINKS_JSON' | 'APPLE_APP_SITE_ASSOCIATION_JSON'): string | null {
  const raw = process.env[envName]?.trim();
  if (!raw) return null;
  try {
    JSON.parse(raw);
    return raw;
  } catch {
    return null;
  }
}

/**
 * Android `/.well-known/assetlinks.json`
 * - Set `ASSETLINKS_JSON` to the full array JSON, OR
 * - Set `ANDROID_SHA256_CERT_FINGERPRINT` (one) or `ANDROID_SHA256_CERT_FINGERPRINTS` (comma/newline separated).
 */
export function getAssetLinksBody(): string | null {
  const verbatim = verbatimJson('ASSETLINKS_JSON');
  if (verbatim) return verbatim;

  const pkg = process.env.ANDROID_PACKAGE_NAME?.trim() || 'com.betrollover.app';
  const multi = process.env.ANDROID_SHA256_CERT_FINGERPRINTS?.trim();
  const single = process.env.ANDROID_SHA256_CERT_FINGERPRINT?.trim();
  const fps = normalizeFingerprints(multi || single || '');
  if (fps.length === 0) return null;

  const doc = [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: pkg,
        sha256_cert_fingerprints: fps,
      },
    },
  ];
  return JSON.stringify(doc);
}

function universalLinkPaths(): string[] {
  const raw = process.env.APPLE_UNIVERSAL_LINK_PATHS?.trim();
  if (!raw) return ['*'];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch {
    /* fall through */
  }
  return normalizeFingerprints(raw.replace(/,/g, ' '));
}

/**
 * iOS `/.well-known/apple-app-site-association`
 * - Set `APPLE_APP_SITE_ASSOCIATION_JSON` to full JSON, OR
 * - Set `APPLE_TEAM_ID` + optional `APPLE_BUNDLE_ID` (default com.betrollover.app).
 */
export function getAppleAppSiteAssociationBody(): string | null {
  const verbatim = verbatimJson('APPLE_APP_SITE_ASSOCIATION_JSON');
  if (verbatim) return verbatim;

  const team = process.env.APPLE_TEAM_ID?.trim();
  const bundle = process.env.APPLE_BUNDLE_ID?.trim() || 'com.betrollover.app';
  if (!team) return null;

  const doc = {
    applinks: {
      apps: [] as string[],
      details: [
        {
          appID: `${team}.${bundle}`,
          paths: universalLinkPaths(),
        },
      ],
    },
  };
  return JSON.stringify(doc);
}
