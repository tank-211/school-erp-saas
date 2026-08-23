/*
  Warnings:

  - You are about to drop the `Activity` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Application` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ApplicationDocument` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Communication` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Lead` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `School` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Task` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "visit_status" AS ENUM ('scheduled', 'completed', 'cancelled', 'no_show');

-- DropForeignKey
ALTER TABLE "Activity" DROP CONSTRAINT "Activity_leadId_fkey";

-- DropForeignKey
ALTER TABLE "Activity" DROP CONSTRAINT "Activity_userId_fkey";

-- DropForeignKey
ALTER TABLE "Application" DROP CONSTRAINT "Application_assignedTo_fkey";

-- DropForeignKey
ALTER TABLE "Application" DROP CONSTRAINT "Application_leadId_fkey";

-- DropForeignKey
ALTER TABLE "Application" DROP CONSTRAINT "Application_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "ApplicationDocument" DROP CONSTRAINT "ApplicationDocument_applicationId_fkey";

-- DropForeignKey
ALTER TABLE "Communication" DROP CONSTRAINT "Communication_leadId_fkey";

-- DropForeignKey
ALTER TABLE "Communication" DROP CONSTRAINT "Communication_userId_fkey";

-- DropForeignKey
ALTER TABLE "Lead" DROP CONSTRAINT "Lead_assignedTo_fkey";

-- DropForeignKey
ALTER TABLE "Lead" DROP CONSTRAINT "Lead_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_userId_fkey";

-- DropForeignKey
ALTER TABLE "Settings" DROP CONSTRAINT "Settings_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "Task_assignedTo_fkey";

-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "Task_leadId_fkey";

-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "Task_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_schoolId_fkey";

-- DropTable
DROP TABLE "Activity";

-- DropTable
DROP TABLE "Application";

-- DropTable
DROP TABLE "ApplicationDocument";

-- DropTable
DROP TABLE "Communication";

-- DropTable
DROP TABLE "Lead";

-- DropTable
DROP TABLE "School";

-- DropTable
DROP TABLE "Task";

-- DropTable
DROP TABLE "User";

-- CreateTable
CREATE TABLE "lead" (
    "id" BIGSERIAL NOT NULL,
    "school_id" BIGINT NOT NULL,
    "academic_year_id" BIGINT NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100),
    "email" VARCHAR(100),
    "phone" VARCHAR(20) NOT NULL,
    "desired_class" VARCHAR(100),
    "source" VARCHAR(100),
    "follow_up_status" VARCHAR(50) DEFAULT 'pending',
    "notes" TEXT,
    "inactivity_reason" VARCHAR(255),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "assigned_to" VARCHAR(100),
    "last_contacted_at" TIMESTAMP(6),
    "created_by" VARCHAR(100),

    CONSTRAINT "lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_activity" (
    "id" BIGSERIAL NOT NULL,
    "lead_id" BIGINT NOT NULL,
    "activity_type" VARCHAR(50) NOT NULL,
    "notes" TEXT,
    "outcome" VARCHAR(50),
    "next_follow_up_date" DATE,
    "scheduled_time" TIME(6),
    "created_by" BIGINT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communication_log" (
    "id" BIGSERIAL NOT NULL,
    "school_id" BIGINT,
    "recipient_type" VARCHAR(50),
    "recipient_id" BIGINT,
    "channel" VARCHAR(20),
    "subject" VARCHAR(255),
    "message" TEXT,
    "status" VARCHAR(50),
    "sent_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "delivered_at" TIMESTAMP(6),
    "opened_at" TIMESTAMP(6),
    "clicked_at" TIMESTAMP(6),
    "created_by" BIGINT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "communication_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_user" (
    "id" BIGSERIAL NOT NULL,
    "school_id" BIGINT NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "role" VARCHAR(50) NOT NULL DEFAULT 'counselor',
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(100),

    CONSTRAINT "app_user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(100),
    "phone" VARCHAR(20),
    "address" TEXT,
    "city" VARCHAR(100),
    "state" VARCHAR(100),
    "postal_code" VARCHAR(20),
    "country" VARCHAR(100),
    "established_year" INTEGER,
    "principal_name" VARCHAR(150),
    "status" VARCHAR(50) DEFAULT 'active',
    "plan_type" VARCHAR(50) DEFAULT 'trial',
    "is_active" BOOLEAN DEFAULT true,
    "expiry_date" DATE,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(100),
    "updated_by" VARCHAR(100),
    "max_students" INTEGER DEFAULT 100,
    "max_users" INTEGER DEFAULT 20,
    "subscription_plan" TEXT DEFAULT 'trial',
    "subscription_status" TEXT DEFAULT 'active',
    "trial_end_date" TIMESTAMP(3),

    CONSTRAINT "school_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application" (
    "id" BIGSERIAL NOT NULL,
    "school_id" BIGINT NOT NULL,
    "academic_year_id" BIGINT NOT NULL,
    "lead_id" BIGINT,
    "application_number" VARCHAR(50) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'draft',
    "current_step" INTEGER DEFAULT 1,
    "assigned_to" BIGINT,
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "submitted_at" TIMESTAMP(6),

    CONSTRAINT "application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_documents" (
    "id" BIGSERIAL NOT NULL,
    "application_id" BIGINT NOT NULL,
    "document_type" VARCHAR(100) NOT NULL,
    "file_name" VARCHAR(255),
    "file_path" VARCHAR(500),
    "document_number" VARCHAR(255),
    "file_size" INTEGER,
    "mime_type" VARCHAR(100),
    "verification_status" VARCHAR(50) DEFAULT 'pending',
    "rejection_reason" TEXT,
    "uploaded_by" BIGINT,
    "verified_by" BIGINT,
    "verified_at" TIMESTAMP(6),
    "uploaded_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academic_year" (
    "id" BIGSERIAL NOT NULL,
    "school_id" BIGINT NOT NULL,
    "year_name" VARCHAR(50) NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "is_active" BOOLEAN DEFAULT false,
    "status" VARCHAR(50) DEFAULT 'inactive',
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(100),
    "updated_by" VARCHAR(100),

    CONSTRAINT "academic_year_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admission" (
    "id" BIGSERIAL NOT NULL,
    "school_id" BIGINT NOT NULL,
    "student_id" BIGINT NOT NULL,
    "lead_id" BIGINT,
    "academic_year_id" BIGINT NOT NULL,
    "class_id" BIGINT NOT NULL,
    "section_id" BIGINT NOT NULL,
    "admission_date" DATE NOT NULL,
    "status" VARCHAR(50) DEFAULT 'active',
    "admission_type" VARCHAR(50),
    "registration_number" VARCHAR(50),
    "previous_school" VARCHAR(255),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(100),
    "application_id" BIGINT,

    CONSTRAINT "admission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_academic_info" (
    "id" BIGSERIAL NOT NULL,
    "application_id" BIGINT NOT NULL,
    "school_id" BIGINT,
    "desired_class" VARCHAR(100) NOT NULL,
    "previous_school" VARCHAR(255),
    "previous_class" VARCHAR(100),
    "marks_percentage" DECIMAL(5,2),
    "board_name" VARCHAR(100),
    "academic_year" VARCHAR(50),
    "additional_qualifications" TEXT,
    "extracurricular_activities" TEXT,
    "achievements" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_academic_info_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_parent_info" (
    "id" BIGSERIAL NOT NULL,
    "application_id" BIGINT NOT NULL,
    "father_name" VARCHAR(150),
    "father_occupation" VARCHAR(100),
    "father_phone" VARCHAR(20),
    "father_email" VARCHAR(100),
    "mother_name" VARCHAR(150),
    "mother_occupation" VARCHAR(100),
    "mother_phone" VARCHAR(20),
    "mother_email" VARCHAR(100),
    "guardian_name" VARCHAR(150),
    "guardian_relation" VARCHAR(50),
    "guardian_phone" VARCHAR(20),
    "guardian_email" VARCHAR(100),
    "primary_contact_person" VARCHAR(150) NOT NULL,
    "primary_contact_relation" VARCHAR(50) NOT NULL,
    "primary_contact_phone" VARCHAR(20) NOT NULL,
    "address" TEXT,
    "city" VARCHAR(100),
    "state" VARCHAR(100),
    "postal_code" VARCHAR(20),
    "income_range" VARCHAR(50),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_parent_info_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_progress" (
    "id" BIGSERIAL NOT NULL,
    "admission_id" BIGINT NOT NULL,
    "student_info_status" VARCHAR(50) DEFAULT 'pending',
    "parent_info_status" VARCHAR(50) DEFAULT 'pending',
    "academic_details_status" VARCHAR(50) DEFAULT 'pending',
    "photos_status" VARCHAR(50) DEFAULT 'pending',
    "documents_status" VARCHAR(50) DEFAULT 'pending',
    "review_status" VARCHAR(50) DEFAULT 'pending',
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_student_info" (
    "id" BIGSERIAL NOT NULL,
    "application_id" BIGINT NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "middle_name" VARCHAR(100),
    "last_name" VARCHAR(100) NOT NULL,
    "date_of_birth" DATE NOT NULL,
    "gender" VARCHAR(20),
    "email" VARCHAR(100),
    "phone" VARCHAR(20),
    "address" TEXT,
    "city" VARCHAR(100),
    "state" VARCHAR(100),
    "postal_code" VARCHAR(20),
    "country" VARCHAR(100),
    "blood_group" VARCHAR(10),
    "aadhar_number" VARCHAR(20),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_student_info_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" BIGSERIAL NOT NULL,
    "school_id" BIGINT NOT NULL,
    "user_id" BIGINT,
    "action" VARCHAR(100) NOT NULL,
    "entity" VARCHAR(100) NOT NULL,
    "entity_id" BIGINT NOT NULL,
    "status" VARCHAR(50),
    "old_data" JSONB,
    "new_data" JSONB,
    "change_summary" TEXT,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign" (
    "id" BIGSERIAL NOT NULL,
    "school_id" BIGINT,
    "name" VARCHAR(100),
    "channel" VARCHAR(20),
    "status" VARCHAR(50),
    "start_date" DATE,
    "end_date" DATE,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campus_visit" (
    "id" BIGSERIAL NOT NULL,
    "school_id" BIGINT NOT NULL,
    "lead_id" BIGINT,
    "visit_date" DATE NOT NULL,
    "start_time" TIME(6) NOT NULL,
    "end_time" TIME(6) NOT NULL,
    "visitor_name" VARCHAR(255) NOT NULL,
    "visitor_phone" VARCHAR(20) NOT NULL,
    "student_name" VARCHAR(255),
    "grade" VARCHAR(50),
    "number_of_visitors" INTEGER DEFAULT 1,
    "tour_preferences" TEXT,
    "internal_notes" TEXT,
    "status" "visit_status" DEFAULT 'scheduled',
    "visit_type" VARCHAR(50) DEFAULT 'campus_visit',
    "created_by" BIGINT,
    "assigned_to" BIGINT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campus_visit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communication_logs" (
    "id" BIGSERIAL NOT NULL,
    "school_id" BIGINT NOT NULL,
    "sender_id" BIGINT NOT NULL,
    "recipient_type" VARCHAR(20) NOT NULL,
    "recipient_id" BIGINT NOT NULL,
    "recipient_email" VARCHAR(255) NOT NULL,
    "subject" VARCHAR(255),
    "content" TEXT,
    "channel" VARCHAR(10) DEFAULT 'email',
    "status" VARCHAR(20) DEFAULT 'pending',
    "error_message" TEXT,
    "sent_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "delivered_at" TIMESTAMP(6),
    "opened_at" TIMESTAMP(6),
    "clicked_at" TIMESTAMP(6),

    CONSTRAINT "communication_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communication_templates" (
    "id" BIGSERIAL NOT NULL,
    "school_id" BIGINT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "subject" VARCHAR(255) NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "communication_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" BIGSERIAL NOT NULL,
    "admission_id" BIGINT NOT NULL,
    "document_type" VARCHAR(100) NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_path" VARCHAR(500) NOT NULL,
    "document_number" VARCHAR(255),
    "file_size" INTEGER,
    "mime_type" VARCHAR(100),
    "uploaded_by" VARCHAR(100),
    "upload_date" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_structure" (
    "id" BIGSERIAL NOT NULL,
    "school_id" BIGINT NOT NULL,
    "academic_year_id" BIGINT NOT NULL,
    "class_id" BIGINT NOT NULL,
    "fee_type" VARCHAR(100) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "due_date" DATE,
    "description" TEXT,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fee_structure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice" (
    "id" BIGSERIAL NOT NULL,
    "school_id" BIGINT NOT NULL,
    "student_id" BIGINT NOT NULL,
    "invoice_number" VARCHAR(50) NOT NULL,
    "invoice_date" DATE NOT NULL,
    "due_date" DATE NOT NULL,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "paid_amount" DECIMAL(12,2) DEFAULT 0,
    "pending_amount" DECIMAL(12,2) NOT NULL,
    "status" VARCHAR(50) DEFAULT 'unpaid',
    "notes" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(100),

    CONSTRAINT "invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_template" (
    "id" BIGSERIAL NOT NULL,
    "school_id" BIGINT,
    "name" VARCHAR(100),
    "category" VARCHAR(50),
    "subject" VARCHAR(255),
    "content" TEXT,
    "last_used_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parent_detail" (
    "id" BIGSERIAL NOT NULL,
    "school_id" BIGINT NOT NULL,
    "student_id" BIGINT NOT NULL,
    "relation" VARCHAR(50) NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100),
    "email" VARCHAR(100),
    "phone" VARCHAR(20) NOT NULL,
    "occupation" VARCHAR(100),
    "address" TEXT,
    "city" VARCHAR(100),
    "income_range" VARCHAR(50),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parent_detail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment" (
    "id" BIGSERIAL NOT NULL,
    "school_id" BIGINT NOT NULL,
    "student_id" BIGINT NOT NULL,
    "invoice_id" BIGINT NOT NULL,
    "payment_number" VARCHAR(50) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "payment_date" DATE NOT NULL,
    "payment_method" VARCHAR(50) NOT NULL,
    "transaction_id" VARCHAR(100),
    "bank_name" VARCHAR(100),
    "cheque_number" VARCHAR(50),
    "status" VARCHAR(50) DEFAULT 'pending',
    "remarks" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "received_by" VARCHAR(100),

    CONSTRAINT "payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduled_emails" (
    "id" BIGSERIAL NOT NULL,
    "school_id" BIGINT NOT NULL,
    "sender_id" BIGINT NOT NULL,
    "recipient_type" VARCHAR(20) NOT NULL,
    "recipient_id" BIGINT NOT NULL,
    "recipients" TEXT NOT NULL,
    "subject" VARCHAR(255),
    "message" TEXT,
    "attachments" JSONB DEFAULT '[]',
    "scheduled_at" TIMESTAMP(6) NOT NULL,
    "status" VARCHAR(20) DEFAULT 'pending',
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scheduled_emails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_class" (
    "id" BIGSERIAL NOT NULL,
    "school_id" BIGINT NOT NULL,
    "class_name" VARCHAR(100) NOT NULL,
    "class_numeric_value" INTEGER NOT NULL,
    "medium" VARCHAR(50),
    "description" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "school_class_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "section" (
    "id" BIGSERIAL NOT NULL,
    "school_id" BIGINT NOT NULL,
    "class_id" BIGINT NOT NULL,
    "section_name" VARCHAR(50) NOT NULL,
    "capacity" INTEGER DEFAULT 60,
    "class_teacher" VARCHAR(150),
    "description" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "section_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_provider_staff" (
    "id" SERIAL NOT NULL,
    "full_name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "internal_role" VARCHAR(50) DEFAULT 'staff',
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "last_login" TIMESTAMP(6),

    CONSTRAINT "service_provider_staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student" (
    "id" BIGSERIAL NOT NULL,
    "school_id" BIGINT NOT NULL,
    "admission_number" VARCHAR(50) NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "middle_name" VARCHAR(100),
    "last_name" VARCHAR(100),
    "date_of_birth" DATE,
    "gender" VARCHAR(20),
    "email" VARCHAR(100),
    "phone" VARCHAR(20),
    "address" TEXT,
    "city" VARCHAR(100),
    "state" VARCHAR(100),
    "postal_code" VARCHAR(20),
    "country" VARCHAR(100),
    "blood_group" VARCHAR(10),
    "aadhar_number" VARCHAR(20),
    "status" VARCHAR(50) DEFAULT 'active',
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(100),

    CONSTRAINT "student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_fee_assignment" (
    "id" BIGSERIAL NOT NULL,
    "school_id" BIGINT NOT NULL,
    "student_id" BIGINT NOT NULL,
    "admission_id" BIGINT NOT NULL,
    "fee_structure_id" BIGINT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "due_date" DATE,
    "concession_percentage" DECIMAL(5,2) DEFAULT 0,
    "concession_amount" DECIMAL(12,2) DEFAULT 0,
    "final_amount" DECIMAL(12,2) NOT NULL,
    "status" VARCHAR(50) DEFAULT 'pending',
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_fee_assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "super_admin" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'super_admin',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "super_admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task" (
    "id" BIGSERIAL NOT NULL,
    "school_id" BIGINT NOT NULL,
    "lead_id" BIGINT,
    "assigned_to" BIGINT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "task_description" TEXT,
    "priority" VARCHAR(20) DEFAULT 'medium',
    "is_done" BOOLEAN DEFAULT false,
    "due_date" DATE DEFAULT CURRENT_DATE,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_lead_academic_year_id" ON "lead"("academic_year_id");

-- CreateIndex
CREATE INDEX "idx_lead_follow_up_status" ON "lead"("follow_up_status");

-- CreateIndex
CREATE INDEX "idx_lead_school_id" ON "lead"("school_id");

-- CreateIndex
CREATE INDEX "idx_lead_school_status_date" ON "lead"("school_id", "follow_up_status", "last_contacted_at" DESC);

-- CreateIndex
CREATE INDEX "idx_lead_activity_activity_type" ON "lead_activity"("activity_type");

-- CreateIndex
CREATE INDEX "idx_lead_activity_created_at" ON "lead_activity"("created_at");

-- CreateIndex
CREATE INDEX "idx_lead_activity_created_by" ON "lead_activity"("created_by");

-- CreateIndex
CREATE INDEX "idx_lead_activity_lead_id" ON "lead_activity"("lead_id");

-- CreateIndex
CREATE UNIQUE INDEX "app_user_email_key" ON "app_user"("email");

-- CreateIndex
CREATE INDEX "idx_app_user_email" ON "app_user"("email");

-- CreateIndex
CREATE INDEX "idx_app_user_role" ON "app_user"("role");

-- CreateIndex
CREATE INDEX "idx_app_user_school_id" ON "app_user"("school_id");

-- CreateIndex
CREATE INDEX "idx_app_user_status" ON "app_user"("status");

-- CreateIndex
CREATE UNIQUE INDEX "app_user_school_id_email_key" ON "app_user"("school_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "school_name_key" ON "school"("name");

-- CreateIndex
CREATE UNIQUE INDEX "school_email_key" ON "school"("email");

-- CreateIndex
CREATE INDEX "idx_school_name" ON "school"("name");

-- CreateIndex
CREATE INDEX "idx_school_status" ON "school"("status");

-- CreateIndex
CREATE UNIQUE INDEX "application_application_number_key" ON "application"("application_number");

-- CreateIndex
CREATE INDEX "idx_application_academic_year_id" ON "application"("academic_year_id");

-- CreateIndex
CREATE INDEX "idx_application_assigned_to" ON "application"("assigned_to");

-- CreateIndex
CREATE INDEX "idx_application_current_step" ON "application"("current_step");

-- CreateIndex
CREATE INDEX "idx_application_lead_id" ON "application"("lead_id");

-- CreateIndex
CREATE INDEX "idx_application_school_id" ON "application"("school_id");

-- CreateIndex
CREATE INDEX "idx_application_status" ON "application"("status");

-- CreateIndex
CREATE UNIQUE INDEX "application_school_id_application_number_key" ON "application"("school_id", "application_number");

-- CreateIndex
CREATE INDEX "idx_application_documents_application_id" ON "application_documents"("application_id");

-- CreateIndex
CREATE INDEX "idx_application_documents_document_type" ON "application_documents"("document_type");

-- CreateIndex
CREATE INDEX "idx_application_documents_uploaded_by" ON "application_documents"("uploaded_by");

-- CreateIndex
CREATE INDEX "idx_application_documents_verification_status" ON "application_documents"("verification_status");

-- CreateIndex
CREATE UNIQUE INDEX "unique_app_id_and_type" ON "application_documents"("application_id", "document_type");

-- CreateIndex
CREATE INDEX "idx_academic_year_is_active" ON "academic_year"("is_active");

-- CreateIndex
CREATE INDEX "idx_academic_year_school_id" ON "academic_year"("school_id");

-- CreateIndex
CREATE UNIQUE INDEX "academic_year_school_id_year_name_key" ON "academic_year"("school_id", "year_name");

-- CreateIndex
CREATE UNIQUE INDEX "admission_registration_number_key" ON "admission"("registration_number");

-- CreateIndex
CREATE INDEX "idx_admission_academic_year_id" ON "admission"("academic_year_id");

-- CreateIndex
CREATE INDEX "idx_admission_application_id" ON "admission"("application_id");

-- CreateIndex
CREATE INDEX "idx_admission_class_id" ON "admission"("class_id");

-- CreateIndex
CREATE INDEX "idx_admission_lead_id" ON "admission"("lead_id");

-- CreateIndex
CREATE INDEX "idx_admission_school_id" ON "admission"("school_id");

-- CreateIndex
CREATE INDEX "idx_admission_section_id" ON "admission"("section_id");

-- CreateIndex
CREATE INDEX "idx_admission_status" ON "admission"("status");

-- CreateIndex
CREATE INDEX "idx_admission_student_id" ON "admission"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "unique_application_academic_info_application" ON "application_academic_info"("application_id");

-- CreateIndex
CREATE INDEX "idx_application_academic_info_application_id" ON "application_academic_info"("application_id");

-- CreateIndex
CREATE INDEX "idx_application_academic_info_desired_class" ON "application_academic_info"("desired_class");

-- CreateIndex
CREATE UNIQUE INDEX "unique_application_parent" ON "application_parent_info"("application_id");

-- CreateIndex
CREATE INDEX "idx_application_parent_info_application_id" ON "application_parent_info"("application_id");

-- CreateIndex
CREATE UNIQUE INDEX "application_progress_admission_id_key" ON "application_progress"("admission_id");

-- CreateIndex
CREATE INDEX "idx_application_progress_admission_id" ON "application_progress"("admission_id");

-- CreateIndex
CREATE UNIQUE INDEX "unique_application_student_info_application" ON "application_student_info"("application_id");

-- CreateIndex
CREATE INDEX "idx_application_student_info_aadhar" ON "application_student_info"("aadhar_number");

-- CreateIndex
CREATE INDEX "idx_application_student_info_application_id" ON "application_student_info"("application_id");

-- CreateIndex
CREATE INDEX "idx_audit_log_action" ON "audit_log"("action");

-- CreateIndex
CREATE INDEX "idx_audit_log_created_at" ON "audit_log"("created_at");

-- CreateIndex
CREATE INDEX "idx_audit_log_entity" ON "audit_log"("entity");

-- CreateIndex
CREATE INDEX "idx_audit_log_entity_id" ON "audit_log"("entity_id");

-- CreateIndex
CREATE INDEX "idx_audit_log_school_id" ON "audit_log"("school_id");

-- CreateIndex
CREATE INDEX "idx_audit_log_user_id" ON "audit_log"("user_id");

-- CreateIndex
CREATE INDEX "idx_campus_visit_dashboard" ON "campus_visit"("school_id", "visit_date", "status");

-- CreateIndex
CREATE UNIQUE INDEX "unique_counselor_slot" ON "campus_visit"("school_id", "assigned_to", "visit_date", "start_time");

-- CreateIndex
CREATE INDEX "idx_comm_logs_school_recipient" ON "communication_logs"("school_id", "recipient_id", "recipient_type");

-- CreateIndex
CREATE INDEX "idx_documents_admission_id" ON "documents"("admission_id");

-- CreateIndex
CREATE INDEX "idx_documents_document_type" ON "documents"("document_type");

-- CreateIndex
CREATE INDEX "idx_fee_structure_academic_year_id" ON "fee_structure"("academic_year_id");

-- CreateIndex
CREATE INDEX "idx_fee_structure_class_id" ON "fee_structure"("class_id");

-- CreateIndex
CREATE INDEX "idx_fee_structure_school_id" ON "fee_structure"("school_id");

-- CreateIndex
CREATE UNIQUE INDEX "fee_structure_academic_year_id_class_id_fee_type_key" ON "fee_structure"("academic_year_id", "class_id", "fee_type");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_invoice_number_key" ON "invoice"("invoice_number");

-- CreateIndex
CREATE INDEX "idx_invoice_invoice_number" ON "invoice"("invoice_number");

-- CreateIndex
CREATE INDEX "idx_invoice_school_id" ON "invoice"("school_id");

-- CreateIndex
CREATE INDEX "idx_invoice_status" ON "invoice"("status");

-- CreateIndex
CREATE INDEX "idx_invoice_student_id" ON "invoice"("student_id");

-- CreateIndex
CREATE INDEX "idx_parent_detail_school_id" ON "parent_detail"("school_id");

-- CreateIndex
CREATE INDEX "idx_parent_detail_student_id" ON "parent_detail"("student_id");

-- CreateIndex
CREATE INDEX "idx_parent_student_lookup" ON "parent_detail"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_payment_number_key" ON "payment"("payment_number");

-- CreateIndex
CREATE INDEX "idx_payment_invoice_id" ON "payment"("invoice_id");

-- CreateIndex
CREATE INDEX "idx_payment_payment_date" ON "payment"("payment_date");

-- CreateIndex
CREATE INDEX "idx_payment_school_id" ON "payment"("school_id");

-- CreateIndex
CREATE INDEX "idx_payment_status" ON "payment"("status");

-- CreateIndex
CREATE INDEX "idx_payment_student_id" ON "payment"("student_id");

-- CreateIndex
CREATE INDEX "idx_school_class_school_id" ON "school_class"("school_id");

-- CreateIndex
CREATE UNIQUE INDEX "school_class_school_id_class_name_key" ON "school_class"("school_id", "class_name");

-- CreateIndex
CREATE INDEX "idx_section_class_id" ON "section"("class_id");

-- CreateIndex
CREATE INDEX "idx_section_school_id" ON "section"("school_id");

-- CreateIndex
CREATE UNIQUE INDEX "section_class_id_section_name_key" ON "section"("class_id", "section_name");

-- CreateIndex
CREATE UNIQUE INDEX "service_provider_staff_email_key" ON "service_provider_staff"("email");

-- CreateIndex
CREATE INDEX "idx_sp_staff_email" ON "service_provider_staff"("email");

-- CreateIndex
CREATE UNIQUE INDEX "student_admission_number_key" ON "student"("admission_number");

-- CreateIndex
CREATE UNIQUE INDEX "student_email_key" ON "student"("email");

-- CreateIndex
CREATE UNIQUE INDEX "student_aadhar_number_key" ON "student"("aadhar_number");

-- CreateIndex
CREATE INDEX "idx_student_admission_number" ON "student"("admission_number");

-- CreateIndex
CREATE INDEX "idx_student_email" ON "student"("email");

-- CreateIndex
CREATE INDEX "idx_student_school_id" ON "student"("school_id");

-- CreateIndex
CREATE INDEX "idx_student_status" ON "student"("status");

-- CreateIndex
CREATE INDEX "idx_student_fee_assignment_admission_id" ON "student_fee_assignment"("admission_id");

-- CreateIndex
CREATE INDEX "idx_student_fee_assignment_school_id" ON "student_fee_assignment"("school_id");

-- CreateIndex
CREATE INDEX "idx_student_fee_assignment_status" ON "student_fee_assignment"("status");

-- CreateIndex
CREATE INDEX "idx_student_fee_assignment_student_id" ON "student_fee_assignment"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_fee_assignment_admission_id_fee_structure_id_key" ON "student_fee_assignment"("admission_id", "fee_structure_id");

-- CreateIndex
CREATE UNIQUE INDEX "super_admin_email_key" ON "super_admin"("email");

-- CreateIndex
CREATE INDEX "idx_task_workspace" ON "task"("school_id", "assigned_to", "is_done", "due_date");

-- AddForeignKey
ALTER TABLE "lead" ADD CONSTRAINT "lead_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_year"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "lead" ADD CONSTRAINT "lead_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "lead_activity" ADD CONSTRAINT "lead_activity_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "app_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "lead_activity" ADD CONSTRAINT "lead_activity_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "lead"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "communication_log" ADD CONSTRAINT "communication_log_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "app_user" ADD CONSTRAINT "app_user_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "application" ADD CONSTRAINT "application_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_year"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "application" ADD CONSTRAINT "application_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "app_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "application" ADD CONSTRAINT "application_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "lead"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "application" ADD CONSTRAINT "application_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "application_documents" ADD CONSTRAINT "application_documents_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "application"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "application_documents" ADD CONSTRAINT "application_documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "app_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "application_documents" ADD CONSTRAINT "application_documents_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "app_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "academic_year" ADD CONSTRAINT "academic_year_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "admission" ADD CONSTRAINT "admission_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_year"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "admission" ADD CONSTRAINT "admission_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "application"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "admission" ADD CONSTRAINT "admission_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "school_class"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "admission" ADD CONSTRAINT "admission_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "lead"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "admission" ADD CONSTRAINT "admission_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "admission" ADD CONSTRAINT "admission_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "section"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "admission" ADD CONSTRAINT "admission_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "application_academic_info" ADD CONSTRAINT "application_academic_info_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "application"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "application_parent_info" ADD CONSTRAINT "application_parent_info_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "application"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "application_progress" ADD CONSTRAINT "application_progress_admission_id_fkey" FOREIGN KEY ("admission_id") REFERENCES "admission"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "application_student_info" ADD CONSTRAINT "application_student_info_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "application"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "campaign" ADD CONSTRAINT "campaign_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "campus_visit" ADD CONSTRAINT "campus_visit_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "lead"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "campus_visit" ADD CONSTRAINT "campus_visit_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "communication_logs" ADD CONSTRAINT "communication_logs_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "communication_templates" ADD CONSTRAINT "communication_templates_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_admission_id_fkey" FOREIGN KEY ("admission_id") REFERENCES "admission"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "fee_structure" ADD CONSTRAINT "fee_structure_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_year"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "fee_structure" ADD CONSTRAINT "fee_structure_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "school_class"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "fee_structure" ADD CONSTRAINT "fee_structure_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "message_template" ADD CONSTRAINT "message_template_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "parent_detail" ADD CONSTRAINT "parent_detail_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "parent_detail" ADD CONSTRAINT "parent_detail_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoice"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "school_class" ADD CONSTRAINT "school_class_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "section" ADD CONSTRAINT "section_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "school_class"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "section" ADD CONSTRAINT "section_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "student" ADD CONSTRAINT "student_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "student_fee_assignment" ADD CONSTRAINT "student_fee_assignment_admission_id_fkey" FOREIGN KEY ("admission_id") REFERENCES "admission"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "student_fee_assignment" ADD CONSTRAINT "student_fee_assignment_fee_structure_id_fkey" FOREIGN KEY ("fee_structure_id") REFERENCES "fee_structure"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "student_fee_assignment" ADD CONSTRAINT "student_fee_assignment_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "student_fee_assignment" ADD CONSTRAINT "student_fee_assignment_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "task" ADD CONSTRAINT "task_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "task" ADD CONSTRAINT "task_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
