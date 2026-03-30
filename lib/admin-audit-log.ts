import { prisma } from '@/lib/prisma';

type AdminAuditLogInput = {
  action: string;
  actorEmail: string;
  actorRole: string;
  status: 'success' | 'error';
  details: Record<string, unknown>;
};

let auditTableReady: Promise<void> | null = null;

async function ensureAuditTable() {
  if (!auditTableReady) {
    auditTableReady = (async () => {
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS admin_audit_logs (
          id SERIAL PRIMARY KEY,
          action TEXT NOT NULL,
          actor_email TEXT NOT NULL,
          actor_role TEXT NOT NULL,
          status TEXT NOT NULL,
          details JSONB,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `;
    })().catch((error) => {
      auditTableReady = null;
      throw error;
    });
  }

  await auditTableReady;
}

export async function logAdminAuditEvent(input: AdminAuditLogInput) {
  try {
    await ensureAuditTable();

    await prisma.$executeRaw`
      INSERT INTO admin_audit_logs (action, actor_email, actor_role, status, details)
      VALUES (${input.action}, ${input.actorEmail}, ${input.actorRole}, ${input.status}, ${JSON.stringify(input.details)}::jsonb)
    `;
  } catch (error) {
    // Never block primary admin actions when logging fails.
    console.error('Failed to write admin audit log:', error);
  }
}
