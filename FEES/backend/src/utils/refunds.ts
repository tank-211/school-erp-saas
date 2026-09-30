/**
 * utils/refunds.ts
 *
 * Refunds are stored in the refund_request table. The table is created by
 * FEES/backend/prisma/sql/2026-09-30_add_refund_request.sql, which must be run
 * once on the database (it only adds a new table; nothing existing changes).
 *
 * Until that table exists, refund features answer "not set up" instead of
 * crashing. The check looks at the database itself, so refunds switch on by
 * themselves within a minute of the table being created, with no redeploy.
 */
import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';

export const REFUNDS_NOT_SET_UP =
  'Refunds are not set up yet: the refunds table has not been created in the database.';

const RECHECK_MS = 60 * 1000;
let tableExists = false;
let checkedAt = 0;

// The Prisma model, or null when the client has no refund_request model
export const refundTable = (): any => (prisma as any).refund_request || null;

/** The refund_request model once the table exists in the database, else null. */
export const readyRefundTable = async (): Promise<any> => {
  const model = refundTable();
  if (!model) return null;
  if (!tableExists && Date.now() - checkedAt > RECHECK_MS) {
    checkedAt = Date.now();
    try {
      const rows: Array<{ found: string | null }> = await prisma.$queryRaw`
        SELECT to_regclass('public.refund_request')::text AS found`;
      tableExists = Boolean(rows?.[0]?.found);
    } catch {
      tableExists = false;
    }
  }
  return tableExists ? model : null;
};

export class RefundsNotSetUpError extends Error {
  status = 501;
  code = 'REFUNDS_NOT_SET_UP';
  constructor() {
    super(REFUNDS_NOT_SET_UP);
    this.name = 'RefundsNotSetUpError';
  }
}

export const requireRefunds = async (req: Request, res: Response, next: NextFunction) => {
  if (await readyRefundTable()) return next();
  res.status(501).json({ success: false, code: 'REFUNDS_NOT_SET_UP', message: REFUNDS_NOT_SET_UP });
};

/** For tests: forget the cached answer. */
export const resetRefundCheck = () => {
  tableExists = false;
  checkedAt = 0;
};
