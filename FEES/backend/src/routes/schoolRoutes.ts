import { Router, Request, Response } from 'express';
import prisma from '../config/database';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

/**
 * /api/school: the caller's own school (from the token).
 *   GET /profile  name, address and contact details for invoices and receipts
 *   GET /lookups  classes with sections, and academic years, for filters
 */
const router = Router();
router.use(authenticate);

const schoolOf = (req: Request) => {
  const id = String(req.user?.schoolId ?? '');
  if (!/^\d+$/.test(id)) {
    const e: any = new Error('This requires a school user account');
    e.status = 403;
    throw e;
  }
  return BigInt(id);
};

router.get('/profile', asyncHandler(async (req: Request, res: Response) => {
  const school = await prisma.school.findUnique({
    where: { id: schoolOf(req) },
    select: { name: true, address: true, city: true, state: true, postal_code: true, country: true, phone: true, email: true, principal_name: true },
  });
  if (!school) return res.status(404).json({ success: false, message: 'School not found' });
  res.json({
    success: true,
    data: {
      name: school.name,
      city: school.city || null,
      address: [school.address, school.city, school.state, school.postal_code].filter(Boolean).join(', '),
      phone: school.phone,
      email: school.email,
      principal: school.principal_name,
    },
  });
}));

router.get('/lookups', asyncHandler(async (req: Request, res: Response) => {
  const sid = schoolOf(req);
  const [classes, years] = await Promise.all([
    prisma.school_class.findMany({
      where: { school_id: sid },
      select: { id: true, class_name: true, section: { select: { id: true, section_name: true }, orderBy: { section_name: 'asc' } } },
      orderBy: { class_numeric_value: 'asc' },
    }),
    prisma.academic_year.findMany({
      where: { school_id: sid },
      select: { id: true, year_name: true, is_active: true, status: true },
      orderBy: { start_date: 'desc' },
    }),
  ]);
  res.json({
    success: true,
    data: {
      classes: classes.map((c) => ({
        id: c.id.toString(),
        name: c.class_name,
        sections: c.section.map((s) => ({ id: s.id.toString(), name: s.section_name })),
      })),
      academicYears: years.map((y) => ({
        id: y.id.toString(),
        name: y.year_name,
        isActive: Boolean(y.is_active || y.status === 'active'),
      })),
    },
  });
}));

export default router;
