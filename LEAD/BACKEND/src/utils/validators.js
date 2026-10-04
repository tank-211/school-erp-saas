import { z } from "zod";

// Auth Validators
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(8, "Current password must be at least 8 characters"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

// Lead Validators
// Lead Validators (UPDATED)
export const createLeadSchema = z.object({
  studentFirstName: z.string().min(1, "First name required"),
  studentLastName: z.string().min(1, "Last name required"),

  dob: z.string().optional(),

   

  gender: z.enum(["Male", "Female", "Other"], {
    errorMap: () => ({ message: "Gender is required" }),
  }),

  grade: z.string().min(1, "Grade is required"),
  currentSchool: z.string().optional(),

  fatherName: z.string().min(1, "Father name required"),
  fatherPhone: z.string().min(10, "Father phone required"),
  fatherEmail: z .string().trim().optional().refine(val => !val || /\S+@\S+\.\S+/.test(val), {message: "Invalid email",}),
  motherName: z.string().optional(),
  motherPhone: z.string().optional(),
  motherEmail: z.string().trim().optional().refine(val=>!val||/\S+@\S+\.\S+/.test(val),{message:"Invalid email"}),

  source: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),

  // Family details with no column of their own are kept in the lead's notes
  fatherOccupation: z.string().optional(),
  fatherCompany: z.string().optional(),
  motherOccupation: z.string().optional(),
  motherCompany: z.string().optional(),

  // Counselor to own the lead (a user of the same school); defaults to the creator
  assignedTo: z.union([z.string(), z.number()]).nullable().optional(),

  status: z.enum(["new", "qualified", "lost", "converted"]).optional(),
});

// Every status the lead service stores (LEAD_STATUSES in services/leadService.js),
// so Lead Details can move a lead to any stage, e.g. "contacted".
const LEAD_STATUS_VALUES = [
  "new", "pending", "contacted", "interested", "qualified",
  "converted", "admitted", "inactive", "lost",
];

export const updateLeadSchema = z.object({
  studentFirstName: z.string().optional(),
  studentLastName: z.string().optional(),
  dob: z.string().optional(),
  gender: z.enum(["Male", "Female", "Other"]).optional(),
  grade: z.string().optional(),
  currentSchool: z.string().optional(),

  fatherName: z.string().optional(),
  fatherPhone: z.string().optional(),
  fatherEmail: z.string().optional(),

  motherName: z.string().optional(),
  motherPhone: z.string().optional(),
  motherEmail: z.string().optional(),

  source: z.string().optional(),
  notes: z.string().optional(),

  status: z.enum(LEAD_STATUS_VALUES).optional(),
});

export const bulkCreateLeadsSchema = z.object({
  leads: z.array(createLeadSchema).min(1, "At least one lead required"),
});

// Activity Validators
export const createActivitySchema = z.object({
  type: z.string().min(1, "Activity type is required"),
  note: z.string().optional(),
  leadId: z.coerce.number().min(1, "Lead ID is required"),
});

export const updateActivitySchema = z.object({
  type: z.string().min(1).optional(),
  note: z.string().optional(),
});

// Communication Validators
export const emailSchema = z.object({
  // The recipient is always the lead's own address (resolved in the service,
  // within the caller's school); a "to" sent by a client is not used.
  to: z.string().optional(),
  subject: z.string().min(1, "Subject is required"),
  content: z.string().min(1, "Content is required"),
  leadId: z.coerce.number(),
});

export const callSchema = z.object({
  leadId: z.coerce.number(),
  duration: z.number().optional(),
  notes: z.string().optional(),
});

// Settings Validators
export const updateSettingsSchema = z.object({
  category: z.string().min(1),
  key: z.string().min(1),
  value: z.string().min(1),
});

export const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  leadId: z.coerce.number(),
  followUpDate: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
});
