-- ============================================================================
-- School ERP Final Unified Schema (PostgreSQL 15+)
-- Admission-first architecture with fee module integration
-- ============================================================================

CREATE TABLE school (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE,
    email VARCHAR(255),
    phone VARCHAR(30),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    status VARCHAR(30) NOT NULL DEFAULT 'active' CHECK (
        status IN ('active', 'inactive')
    ),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE academic_year (
    id BIGSERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES school (id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_current BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_academic_year_dates CHECK (end_date >= start_date),
    CONSTRAINT uq_academic_year_per_school UNIQUE (school_id, name)
);

CREATE INDEX idx_academic_year_school_id ON academic_year (school_id);

CREATE TABLE school_class (
    id BIGSERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES school (id) ON DELETE CASCADE,
    class_name VARCHAR(100) NOT NULL,
    class_order INT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_school_class UNIQUE (school_id, class_name)
);

CREATE INDEX idx_school_class_school_id ON school_class (school_id);

CREATE TABLE section (
    id BIGSERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES school (id) ON DELETE CASCADE,
    class_id BIGINT NOT NULL REFERENCES school_class (id) ON DELETE CASCADE,
    section_name VARCHAR(20) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_class_section UNIQUE (class_id, section_name)
);

CREATE INDEX idx_section_school_id ON section (school_id);

CREATE INDEX idx_section_class_id ON section (class_id);

CREATE TABLE lead(
    id BIGSERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES school (id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(100),
    source VARCHAR(100),
    status VARCHAR(30) DEFAULT 'new',
    follow_up_status VARCHAR(30) DEFAULT 'pending',
    assigned_to BIGINT,
    last_contacted_at TIMESTAMP,
    remarks TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_lead_school_id ON lead(school_id);

CREATE INDEX idx_lead_status ON lead(status);

CREATE INDEX idx_lead_followup_upcoming ON lead(
    school_id,
    follow_up_status,
    last_contacted_at DESC
)
WHERE
    last_contacted_at IS NOT NULL;

CREATE INDEX idx_lead_assigned_to ON lead(
    school_id,
    assigned_to,
    follow_up_status
)
WHERE
    last_contacted_at IS NOT NULL;

CREATE INDEX idx_lead_contactdate ON lead(last_contacted_at DESC)
WHERE
    school_id IS NOT NULL
    AND follow_up_status IN (
        'pending',
        'contacted',
        'interested'
    );

CREATE INDEX idx_lead_school_status_date ON lead(
    school_id,
    follow_up_status,
    last_contacted_at DESC
);

CREATE TABLE admission (
    id BIGSERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES school (id) ON DELETE CASCADE,
    lead_id BIGINT REFERENCES lead(id) ON DELETE SET NULL,
    academic_year_id BIGINT NOT NULL REFERENCES academic_year (id) ON DELETE RESTRICT,
    class_id BIGINT NOT NULL REFERENCES school_class (id) ON DELETE RESTRICT,
    section_id BIGINT NOT NULL REFERENCES section (id) ON DELETE RESTRICT,
    admission_date DATE NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (
        status IN (
            'draft',
            'submitted',
            'active',
            'on-leave',
            'suspended',
            'withdrawn'
        )
    ),
    admission_type VARCHAR(30) CHECK (
        admission_type IN ('new', 'transfer', 'regular')
    ),
    registration_number VARCHAR(100),
    previous_school VARCHAR(255),
    current_step VARCHAR(30) DEFAULT 'student',
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_by VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX uq_admission_registration_number ON admission (registration_number)
WHERE
    registration_number IS NOT NULL;

CREATE INDEX idx_admission_school_id ON admission (school_id);

CREATE INDEX idx_admission_lead_id ON admission (lead_id);

CREATE INDEX idx_admission_academic_year_id ON admission (academic_year_id);

CREATE INDEX idx_admission_class_id ON admission (class_id);

CREATE INDEX idx_admission_section_id ON admission (section_id);

CREATE INDEX idx_admission_status ON admission (status);

CREATE INDEX idx_admission_date ON admission (
    school_id,
    admission_date,
    status
);

CREATE TABLE student_class (
    id BIGSERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES school (id) ON DELETE CASCADE,
    admission_id BIGINT NOT NULL REFERENCES admission (id) ON DELETE CASCADE,
    class_id BIGINT NOT NULL REFERENCES school_class (id) ON DELETE RESTRICT,
    enrollment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(30) NOT NULL DEFAULT 'active' CHECK (
        status IN (
            'active',
            'inactive',
            'graduated',
            'transferred'
        )
    ),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_student_class_admission_class UNIQUE (admission_id, class_id)
);

CREATE INDEX idx_student_class_school_id ON student_class (school_id);

CREATE INDEX idx_student_class_admission_id ON student_class (admission_id);

CREATE INDEX idx_student_class_class_id ON student_class (class_id);

CREATE TABLE app_user (
    id BIGSERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES school (id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'counselor' CHECK (
        role IN (
            'super_admin',
            'admin',
            'counselor',
            'accountant'
        )
    ),
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (
        status IN (
            'active',
            'inactive',
            'suspended'
        )
    ),
    created_by VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_app_user_school_email UNIQUE (school_id, email)
);

CREATE UNIQUE INDEX uq_app_user_email_global ON app_user (email);

CREATE INDEX idx_app_user_school_id ON app_user (school_id);

CREATE INDEX idx_app_user_role ON app_user (role);

CREATE INDEX idx_app_user_email ON app_user (email);

CREATE INDEX idx_app_user_status ON app_user (status);

CREATE TABLE application (
    id BIGSERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES school (id) ON DELETE CASCADE,
    academic_year_id BIGINT NOT NULL REFERENCES academic_year (id) ON DELETE CASCADE,
    lead_id BIGINT REFERENCES lead(id) ON DELETE SET NULL,
    application_number VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (
        status IN (
            'draft',
            'in_progress',
            'submitted',
            'approved',
            'rejected'
        )
    ),
    current_step INT NOT NULL DEFAULT 1 CHECK (current_step BETWEEN 1 AND 6),
    assigned_to BIGINT REFERENCES app_user (id) ON DELETE SET NULL,
    rejection_reason TEXT,
    submitted_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_application_school_number UNIQUE (school_id, application_number)
);

CREATE INDEX idx_application_school_id ON application (school_id);

CREATE INDEX idx_application_academic_year_id ON application (academic_year_id);

CREATE INDEX idx_application_lead_id ON application (lead_id);

CREATE INDEX idx_application_status ON application (status);

CREATE INDEX idx_application_current_step ON application (current_step);

CREATE INDEX idx_application_assigned_to ON application (assigned_to);

ALTER TABLE admission ADD COLUMN application_id BIGINT;

ALTER TABLE admission
ADD CONSTRAINT fk_admission_application FOREIGN KEY (application_id) REFERENCES application (id) ON DELETE SET NULL;

CREATE INDEX idx_admission_application_id ON admission (application_id);

CREATE TABLE application_student_info (
    id BIGSERIAL PRIMARY KEY,
    application_id BIGINT NOT NULL REFERENCES application (id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE NOT NULL,
    gender VARCHAR(20) CHECK (
        gender IN ('Male', 'Female', 'Other')
    ),
    email VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100),
    blood_group VARCHAR(10),
    aadhar_number VARCHAR(20),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_application_student_info UNIQUE (application_id)
);

CREATE INDEX idx_application_student_info_application_id ON application_student_info (application_id);

CREATE INDEX idx_application_student_info_aadhar ON application_student_info (aadhar_number);

CREATE TABLE application_parent_info (
    id BIGSERIAL PRIMARY KEY,
    application_id BIGINT NOT NULL REFERENCES application (id) ON DELETE CASCADE,
    father_name VARCHAR(150),
    father_occupation VARCHAR(100),
    father_phone VARCHAR(20),
    father_email VARCHAR(100),
    mother_name VARCHAR(150),
    mother_occupation VARCHAR(100),
    mother_phone VARCHAR(20),
    mother_email VARCHAR(100),
    guardian_name VARCHAR(150),
    guardian_relation VARCHAR(50) CHECK (
        guardian_relation IN (
            'Other Relative',
            'Family Friend',
            'Court Appointed',
            'Other'
        )
    ),
    guardian_phone VARCHAR(20),
    guardian_email VARCHAR(100),
    primary_contact_person VARCHAR(150) NOT NULL,
    primary_contact_relation VARCHAR(50) NOT NULL,
    primary_contact_phone VARCHAR(20) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    income_range VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_application_parent_info UNIQUE (application_id)
);

CREATE INDEX idx_application_parent_info_application_id ON application_parent_info (application_id);

CREATE TABLE application_academic_info (
    id BIGSERIAL PRIMARY KEY,
    application_id BIGINT NOT NULL REFERENCES application (id) ON DELETE CASCADE,
    school_id BIGINT,
    desired_class VARCHAR(100) NOT NULL,
    previous_school VARCHAR(255),
    previous_class VARCHAR(100),
    marks_percentage NUMERIC(5, 2),
    board_name VARCHAR(100),
    academic_year VARCHAR(50),
    additional_qualifications TEXT,
    extracurricular_activities TEXT,
    achievements TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_application_academic_info UNIQUE (application_id)
);

CREATE INDEX idx_application_academic_info_application_id ON application_academic_info (application_id);

CREATE INDEX idx_application_academic_info_desired_class ON application_academic_info (desired_class);

CREATE TABLE application_documents (
    id BIGSERIAL PRIMARY KEY,
    application_id BIGINT NOT NULL REFERENCES application (id) ON DELETE CASCADE,
    document_type VARCHAR(100) NOT NULL CHECK (
        document_type IN (
            'birth_certificate',
            'aadhaar_card',
            'passport_photos',
            'transfer_certificate',
            'previous_report_card',
            'address_proof',
            'parent_id_proof',
            'student_photo',
            'previous_marksheet',
            'aadhar_card',
            'father_id_proof',
            'mother_id_proof',
            'other'
        )
    ),
    file_name VARCHAR(255),
    file_path VARCHAR(500),
    document_number VARCHAR(255),
    file_size INT CHECK (
        file_size IS NULL
        OR file_size >= 0
    ),
    mime_type VARCHAR(100),
    verification_status VARCHAR(50) DEFAULT 'pending' CHECK (
        verification_status IN (
            'pending',
            'approved',
            'rejected'
        )
    ),
    rejection_reason TEXT,
    uploaded_by BIGINT REFERENCES app_user (id) ON DELETE SET NULL,
    verified_by BIGINT REFERENCES app_user (id) ON DELETE SET NULL,
    verified_at TIMESTAMP,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_application_document_type UNIQUE (application_id, document_type)
);

CREATE INDEX idx_application_documents_application_id ON application_documents (application_id);

CREATE INDEX idx_application_documents_document_type ON application_documents (document_type);

CREATE INDEX idx_application_documents_verification_status ON application_documents (verification_status);

CREATE INDEX idx_application_documents_uploaded_by ON application_documents (uploaded_by);

CREATE TABLE application_progress (
    id BIGSERIAL PRIMARY KEY,
    application_id BIGINT NOT NULL UNIQUE REFERENCES application (id) ON DELETE CASCADE,
    step_1_student_info VARCHAR(20) DEFAULT 'pending' CHECK (
        step_1_student_info IN (
            'pending',
            'in_progress',
            'completed'
        )
    ),
    step_2_parent_info VARCHAR(20) DEFAULT 'pending' CHECK (
        step_2_parent_info IN (
            'pending',
            'in_progress',
            'completed'
        )
    ),
    step_3_academic_info VARCHAR(20) DEFAULT 'pending' CHECK (
        step_3_academic_info IN (
            'pending',
            'in_progress',
            'completed'
        )
    ),
    step_4_photos VARCHAR(20) DEFAULT 'pending' CHECK (
        step_4_photos IN (
            'pending',
            'in_progress',
            'completed'
        )
    ),
    step_5_documents VARCHAR(20) DEFAULT 'pending' CHECK (
        step_5_documents IN (
            'pending',
            'in_progress',
            'completed'
        )
    ),
    step_6_review VARCHAR(20) DEFAULT 'pending' CHECK (
        step_6_review IN (
            'pending',
            'in_progress',
            'completed'
        )
    ),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_application_progress_application_id ON application_progress (application_id);

CREATE TABLE application_photos (
    id BIGSERIAL PRIMARY KEY,
    application_id BIGINT NOT NULL REFERENCES application (id) ON DELETE CASCADE,
    photo_type VARCHAR(100),
    file_path VARCHAR(500),
    file_size INT CHECK (
        file_size IS NULL
        OR file_size >= 0
    ),
    mime_type VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_application_photos_application_id ON application_photos (application_id);

CREATE INDEX idx_application_photos_photo_type ON application_photos (photo_type);

CREATE TABLE fee_structure (
    id BIGSERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES school (id) ON DELETE CASCADE,
    academic_year_id BIGINT NOT NULL REFERENCES academic_year (id) ON DELETE CASCADE,
    class_id BIGINT NOT NULL REFERENCES school_class (id) ON DELETE RESTRICT,
    fee_component VARCHAR(100) NOT NULL,
    installment_no INT NOT NULL DEFAULT 1,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
    due_day_of_month INT CHECK (
        due_day_of_month IS NULL
        OR due_day_of_month BETWEEN 1 AND 31
    ),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_fee_structure UNIQUE (
        school_id,
        academic_year_id,
        class_id,
        fee_component,
        installment_no
    )
);

CREATE INDEX idx_fee_structure_school_id ON fee_structure (school_id);

CREATE INDEX idx_fee_structure_class_id ON fee_structure (class_id);

CREATE INDEX idx_fee_structure_academic_year_id ON fee_structure (academic_year_id);

CREATE TABLE student_fee_assignment (
    id BIGSERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES school (id) ON DELETE CASCADE,
    admission_id BIGINT NOT NULL REFERENCES admission (id) ON DELETE CASCADE,
    fee_structure_id BIGINT NOT NULL REFERENCES fee_structure (id) ON DELETE RESTRICT,
    due_date DATE NOT NULL,
    concession_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (
        concession_percentage >= 0
        AND concession_percentage <= 100
    ),
    concession_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (concession_amount >= 0),
    final_amount NUMERIC(12, 2) NOT NULL CHECK (final_amount >= 0),
    status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (
        status IN (
            'pending',
            'partial',
            'completed',
            'cancelled'
        )
    ),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_sfa_admission_fee UNIQUE (
        admission_id,
        fee_structure_id
    )
);

CREATE INDEX idx_student_fee_assignment_admission_id ON student_fee_assignment (admission_id);

CREATE INDEX idx_student_fee_assignment_school_id ON student_fee_assignment (school_id);

CREATE TABLE invoice (
    id BIGSERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES school (id) ON DELETE CASCADE,
    admission_id BIGINT NOT NULL REFERENCES admission (id) ON DELETE CASCADE,
    invoice_number VARCHAR(100) NOT NULL UNIQUE,
    total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount >= 0),
    paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
    pending_amount NUMERIC(12, 2) NOT NULL CHECK (pending_amount >= 0),
    status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (
        status IN (
            'pending',
            'partial',
            'paid',
            'overdue',
            'cancelled'
        )
    ),
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_invoice_balance CHECK (
        pending_amount = total_amount - paid_amount
    )
);

CREATE INDEX idx_invoice_admission_id ON invoice (admission_id);

CREATE INDEX idx_invoice_school_id ON invoice (school_id);

CREATE INDEX idx_invoice_status ON invoice (status);

CREATE TABLE payment (
    id BIGSERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES school (id) ON DELETE CASCADE,
    admission_id BIGINT NOT NULL REFERENCES admission (id) ON DELETE CASCADE,
    invoice_id BIGINT NOT NULL REFERENCES invoice (id) ON DELETE CASCADE,
    transaction_id VARCHAR(150),
    amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
    payment_method VARCHAR(50),
    payment_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(30) NOT NULL DEFAULT 'successful' CHECK (
        status IN (
            'pending',
            'successful',
            'failed',
            'refunded'
        )
    ),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX uq_payment_transaction_id ON payment (transaction_id)
WHERE
    transaction_id IS NOT NULL;

CREATE INDEX idx_payment_admission_id ON payment (admission_id);

CREATE INDEX idx_payment_invoice_id ON payment (invoice_id);

CREATE INDEX idx_payment_transaction_id ON payment (transaction_id);

CREATE INDEX idx_payment_school_id ON payment (school_id);

CREATE TABLE payment_receipts (
    id BIGSERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES school (id) ON DELETE CASCADE,
    admission_id BIGINT NOT NULL REFERENCES admission (id) ON DELETE CASCADE,
    payment_id BIGINT NOT NULL REFERENCES payment (id) ON DELETE CASCADE,
    receipt_number VARCHAR(100) NOT NULL UNIQUE,
    issued_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payment_receipts_admission_id ON payment_receipts (admission_id);

CREATE INDEX idx_payment_receipts_school_id ON payment_receipts (school_id);

CREATE TABLE refund_requests (
    id BIGSERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES school (id) ON DELETE CASCADE,
    admission_id BIGINT NOT NULL REFERENCES admission (id) ON DELETE CASCADE,
    payment_id BIGINT REFERENCES payment (id) ON DELETE SET NULL,
    invoice_id BIGINT REFERENCES invoice (id) ON DELETE SET NULL,
    requested_amount NUMERIC(12, 2) NOT NULL CHECK (requested_amount >= 0),
    approved_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (approved_amount >= 0),
    status VARCHAR(30) NOT NULL DEFAULT 'requested' CHECK (
        status IN (
            'requested',
            'approved',
            'rejected',
            'processed'
        )
    ),
    reason TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_refund_requests_admission_id ON refund_requests (admission_id);

CREATE INDEX idx_refund_requests_school_id ON refund_requests (school_id);

CREATE TABLE lead_activity (
    id BIGSERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES school (id) ON DELETE CASCADE,
    lead_id BIGINT NOT NULL REFERENCES lead(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL CHECK (
        activity_type IN (
            'call',
            'email',
            'visit',
            'sms',
            'whatsapp',
            'follow_up',
            'meeting',
            'no_response',
            'other'
        )
    ),
    notes TEXT,
    outcome VARCHAR(50) CHECK (
        outcome IN (
            'positive',
            'negative',
            'neutral',
            'pending'
        )
    ),
    next_follow_up_date DATE,
    scheduled_time TIME,
    created_by BIGINT REFERENCES app_user (id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_lead_activity_school_id ON lead_activity (school_id);

CREATE INDEX idx_lead_activity_lead_id ON lead_activity (lead_id);

CREATE INDEX idx_lead_activity_activity_type ON lead_activity (activity_type);

CREATE INDEX idx_lead_activity_created_by ON lead_activity (created_by);

CREATE INDEX idx_lead_activity_created_at ON lead_activity (created_at);

CREATE TABLE audit_log (
    id BIGSERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES school (id) ON DELETE CASCADE,
    user_id BIGINT REFERENCES app_user (id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL CHECK (
        action IN (
            'create',
            'update',
            'delete',
            'view',
            'export',
            'approve',
            'reject',
            'submit',
            'other'
        )
    ),
    entity VARCHAR(100) NOT NULL,
    entity_id BIGINT NOT NULL,
    status VARCHAR(50) CHECK (
        status IN ('success', 'failure')
    ),
    old_data JSONB,
    new_data JSONB,
    change_summary TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_log_school_id ON audit_log (school_id);

CREATE INDEX idx_audit_log_user_id ON audit_log (user_id);

CREATE INDEX idx_audit_log_entity ON audit_log (entity);

CREATE INDEX idx_audit_log_entity_id ON audit_log (entity_id);

CREATE INDEX idx_audit_log_action ON audit_log (action);

CREATE INDEX idx_audit_log_created_at ON audit_log (created_at);

CREATE TABLE communication_log (
    id BIGSERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES school (id) ON DELETE CASCADE,
    recipient_type VARCHAR(50) NOT NULL CHECK (
        recipient_type IN ('lead', 'student', 'parent')
    ),
    recipient_id BIGINT NOT NULL,
    channel VARCHAR(20) NOT NULL CHECK (
        channel IN ('email', 'sms', 'whatsapp')
    ),
    subject VARCHAR(255),
    message TEXT NOT NULL,
    status VARCHAR(50) CHECK (
        status IN (
            'sent',
            'delivered',
            'failed',
            'opened',
            'clicked'
        )
    ),
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delivered_at TIMESTAMP,
    opened_at TIMESTAMP,
    clicked_at TIMESTAMP,
    created_by BIGINT REFERENCES app_user (id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_communication_log_school_recipient ON communication_log (
    school_id,
    recipient_type,
    recipient_id
);

CREATE INDEX idx_communication_log_status ON communication_log (status);

CREATE TABLE message_template (
    id BIGSERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES school (id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    subject VARCHAR(255),
    content TEXT NOT NULL,
    last_used_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_message_template_school_id ON message_template (school_id);

CREATE INDEX idx_message_template_category ON message_template (category);

CREATE TABLE campaign (
    id BIGSERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES school (id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    channel VARCHAR(20) CHECK (
        channel IN ('email', 'sms', 'whatsapp')
    ),
    status VARCHAR(50),
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_campaign_dates CHECK (
        end_date IS NULL
        OR start_date IS NULL
        OR end_date >= start_date
    )
);

CREATE INDEX idx_campaign_school_id ON campaign (school_id);

CREATE INDEX idx_campaign_status ON campaign (status);

CREATE TABLE scheduled_emails (
    id BIGSERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES school (id) ON DELETE CASCADE,
    sender_id BIGINT NOT NULL REFERENCES app_user (id) ON DELETE RESTRICT,
    recipient_type VARCHAR(20) NOT NULL CHECK (
        recipient_type IN ('lead', 'student', 'parent')
    ),
    recipient_id BIGINT NOT NULL,
    recipients TEXT NOT NULL,
    subject VARCHAR(255),
    message TEXT,
    attachments JSONB NOT NULL DEFAULT '[]',
    scheduled_at TIMESTAMP NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (
        status IN (
            'pending',
            'sent',
            'failed',
            'cancelled'
        )
    ),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_scheduled_emails_school_scheduled_at ON scheduled_emails (school_id, scheduled_at);

CREATE INDEX idx_scheduled_emails_status ON scheduled_emails (status);

CREATE TYPE visit_status AS ENUM ('scheduled', 'completed', 'cancelled', 'no_show');

CREATE TABLE campus_visit (
    id BIGSERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES school (id) ON DELETE CASCADE,
    lead_id BIGINT REFERENCES lead(id) ON DELETE SET NULL,
    visit_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    visitor_name VARCHAR(255) NOT NULL,
    visitor_phone VARCHAR(20) NOT NULL,
    student_name VARCHAR(255),
    grade VARCHAR(50),
    number_of_visitors INT NOT NULL DEFAULT 1 CHECK (number_of_visitors > 0),
    tour_preferences TEXT,
    internal_notes TEXT,
    status visit_status NOT NULL DEFAULT 'scheduled',
    visit_type VARCHAR(50) NOT NULL DEFAULT 'campus_visit',
    created_by BIGINT REFERENCES app_user (id) ON DELETE SET NULL,
    assigned_to BIGINT REFERENCES app_user (id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_campus_visit_time CHECK (end_time > start_time),
    CONSTRAINT unique_counselor_slot UNIQUE (
        school_id,
        assigned_to,
        visit_date,
        start_time
    )
);

CREATE INDEX idx_campus_visit_dashboard ON campus_visit (school_id, visit_date, status);

CREATE INDEX idx_campus_visit_assigned_to ON campus_visit (assigned_to);

CREATE TABLE task (
    id BIGSERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES school (id) ON DELETE CASCADE,
    assigned_to BIGINT NOT NULL REFERENCES app_user (id) ON DELETE RESTRICT,
    title VARCHAR(255) NOT NULL,
    task_description TEXT,
    priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (
        priority IN ('low', 'medium', 'high')
    ),
    is_done BOOLEAN NOT NULL DEFAULT FALSE,
    due_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_task_workspace ON task (
    school_id,
    assigned_to,
    is_done,
    due_date
);

CREATE TABLE service_provider_staff (
    id BIGSERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    internal_role VARCHAR(50) NOT NULL DEFAULT 'staff' CHECK (
        internal_role IN (
            'super_admin',
            'support',
            'billing',
            'staff'
        )
    ),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

CREATE INDEX idx_sp_staff_email ON service_provider_staff (email);

CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_application_submitted_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'submitted' AND OLD.status <> 'submitted' THEN
        NEW.submitted_at = CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_application_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE application
    SET updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.application_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_school_updated_at
BEFORE UPDATE ON school
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER tr_academic_year_updated_at
BEFORE UPDATE ON academic_year
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER tr_school_class_updated_at
BEFORE UPDATE ON school_class
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER tr_section_updated_at
BEFORE UPDATE ON section
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- student table removed from final schema; related trigger omitted

CREATE TRIGGER tr_lead_updated_at
BEFORE UPDATE ON lead
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER tr_admission_updated_at
BEFORE UPDATE ON admission
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER tr_app_user_updated_at
BEFORE UPDATE ON app_user
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER tr_application_submitted_at
BEFORE UPDATE ON application
FOR EACH ROW EXECUTE FUNCTION update_application_submitted_at();

CREATE TRIGGER tr_application_updated_at
BEFORE UPDATE ON application
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER tr_application_student_info_updated_at
BEFORE UPDATE ON application_student_info
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER tr_application_parent_info_updated_at
BEFORE UPDATE ON application_parent_info
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER tr_application_academic_info_updated_at
BEFORE UPDATE ON application_academic_info
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER tr_application_documents_updated_at
BEFORE UPDATE ON application_documents
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER tr_application_progress_updated_at
BEFORE UPDATE ON application_progress
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER tr_trigger_update_app_on_progress_change
AFTER UPDATE ON application_progress
FOR EACH ROW EXECUTE FUNCTION update_application_timestamp();
