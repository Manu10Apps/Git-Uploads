import { unstable_noStore as noStore } from 'next/cache';
import { prisma } from '@/lib/prisma';

const MAINTENANCE_SETTINGS_KEY = 'site.maintenance';

export const DEFAULT_MAINTENANCE_MESSAGE = 'Turimo gukora ivugurura rito. Turagaruka vuba.';

export type MaintenanceSettings = {
  enabled: boolean;
  message: string;
  updatedAt: string | null;
};

type SiteSettingRow = {
  value: string | null;
  updatedAt: Date | string | null;
};

let siteSettingsTableReady: Promise<void> | null = null;
let maintenanceFallbackSettings: MaintenanceSettings | null = null;

function normalizeMessage(message?: string | null) {
  return String(message || '').trim() || DEFAULT_MAINTENANCE_MESSAGE;
}

function normalizeUpdatedAt(updatedAt: Date | string | null) {
  if (!updatedAt) {
    return null;
  }

  if (updatedAt instanceof Date) {
    return updatedAt.toISOString();
  }

  const parsedDate = new Date(updatedAt);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate.toISOString();
}

function parseMaintenanceSettings(value: string | null, updatedAt: Date | string | null): MaintenanceSettings {
  if (!value) {
    return {
      enabled: false,
      message: DEFAULT_MAINTENANCE_MESSAGE,
      updatedAt: normalizeUpdatedAt(updatedAt),
    };
  }

  try {
    const parsed = JSON.parse(value) as Partial<Pick<MaintenanceSettings, 'enabled' | 'message'>>;

    return {
      enabled: Boolean(parsed.enabled),
      message: normalizeMessage(parsed.message),
      updatedAt: normalizeUpdatedAt(updatedAt),
    };
  } catch {
    return {
      enabled: false,
      message: DEFAULT_MAINTENANCE_MESSAGE,
      updatedAt: normalizeUpdatedAt(updatedAt),
    };
  }
}

async function ensureSiteSettingsTable() {
  if (!siteSettingsTableReady) {
    siteSettingsTableReady = (async () => {
      try {
        // Add a 3-second timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Database connection timeout')), 3000)
        );

        await Promise.race([
          prisma.$executeRaw`
            CREATE TABLE IF NOT EXISTS site_settings (
              "key" TEXT PRIMARY KEY,
              "value" TEXT NOT NULL,
              "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
              "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
          `,
          timeoutPromise
        ]);
      } catch (error) {
        siteSettingsTableReady = null;
        throw error;
      }
    })();
  }

  await siteSettingsTableReady;
}

export async function getMaintenanceSettings(): Promise<MaintenanceSettings> {
  noStore();

  try {
    // Add a 5-second timeout for the entire operation
    const timeoutPromise = new Promise<MaintenanceSettings>((_, reject) =>
      setTimeout(() => reject(new Error('Database query timeout')), 5000)
    );

    const queryPromise = (async () => {
      await ensureSiteSettingsTable();

      const rows = await prisma.$queryRaw<SiteSettingRow[]>`
        SELECT "value", "updatedAt"
        FROM site_settings
        WHERE "key" = ${MAINTENANCE_SETTINGS_KEY}
        LIMIT 1
      `;

      if (!rows.length) {
        return {
          enabled: false,
          message: DEFAULT_MAINTENANCE_MESSAGE,
          updatedAt: null,
        };
      }

      const parsedSettings = parseMaintenanceSettings(rows[0].value, rows[0].updatedAt);
      maintenanceFallbackSettings = parsedSettings;
      return parsedSettings;
    })();

    return await Promise.race([queryPromise, timeoutPromise]);
  } catch (error) {
    console.error('Failed to read maintenance settings:', error);

    if (maintenanceFallbackSettings) {
      return maintenanceFallbackSettings;
    }

    return {
      enabled: false,
      message: DEFAULT_MAINTENANCE_MESSAGE,
      updatedAt: null,
    };
  }
}

export async function saveMaintenanceSettings(input: Pick<MaintenanceSettings, 'enabled' | 'message'>) {
  noStore();
  const message = normalizeMessage(input.message);
  const value = JSON.stringify({
    enabled: Boolean(input.enabled),
    message,
  });

  try {
    await ensureSiteSettingsTable();

    await prisma.$executeRaw`
      INSERT INTO site_settings ("key", "value", "createdAt", "updatedAt")
      VALUES (${MAINTENANCE_SETTINGS_KEY}, ${value}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT("key") DO UPDATE SET
        "value" = excluded."value",
        "updatedAt" = CURRENT_TIMESTAMP
    `;

    const rows = await prisma.$queryRaw<SiteSettingRow[]>`
      SELECT "value", "updatedAt"
      FROM site_settings
      WHERE "key" = ${MAINTENANCE_SETTINGS_KEY}
      LIMIT 1
    `;

    const persistedSettings = parseMaintenanceSettings(rows[0]?.value || value, rows[0]?.updatedAt || new Date());
    maintenanceFallbackSettings = persistedSettings;
    return persistedSettings;
  } catch (error) {
    console.error('Failed to save maintenance settings to database; using fallback:', error);

    const fallbackSettings = parseMaintenanceSettings(value, new Date());
    maintenanceFallbackSettings = fallbackSettings;
    return fallbackSettings;
  }
}

export function shouldBypassMaintenance(pathname: string) {
  return (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/uploads') ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml'
  );
}