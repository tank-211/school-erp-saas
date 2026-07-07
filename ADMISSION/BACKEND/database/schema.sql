-- ============================================================================
-- School Admission CRM System - PostgreSQL Schema
-- ============================================================================
-- This script creates a multi-tenant school admission management system
-- with complete support for schools, students, leads, admissions, and fees.
-- ============================================================================
-- Drop existing tables if they exist (for clean setup)
-- dependencies need to install npm install pg dotenv
DROP TABLE IF EXISTS service_provider_staff CASCADE;

DROP TABLE IF EXISTS payment CASCADE;

DROP TABLE IF EXISTS invoice CASCADE;

DROP TABLE IF EXISTS student_fee_assignment CASCADE;

DROP TABLE IF EXISTS fee_structure CASCADE;

DROP TABLE IF EXISTS admission CASCADE;

DROP TABLE IF EXISTS lead CASCADE;

DROP TABLE IF EXISTS parent_detail CASCADE;

DROP TABLE IF EXISTS student CASCADE;

DROP TABLE IF EXISTS section CASCADE;

DROP TABLE IF EXISTS school_class CASCADE;

DROP TABLE IF EXISTS academic_year CASCADE;

DROP TABLE IF EXISTS school CASCADE;
-- ============================================================================
-- TABLE 1: SCHOOL (Tenant)
-- ============================================================================ 
-- Stores information about each school in the multi-tenant system
CREATE TABLE school (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(100) UNIQUE,
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100),
    established_year INT,
    principal_name VARCHAR(150),
    status VARCHAR(50) DEFAULT 'active' CHECK (
        status IN (
            'active',
            'inactive',
            'suspended'
        )
    ),
    plan_type VARCHAR(50) DEFAULT 'trial',
    is_active BOOLEAN DEFAULT TRUE,
    expiry_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100)
);

CREATE INDEX idx_school_name ON school (name);

CREATE INDEX idx_school_status ON school (status);
-- ============================================================================
-- TABLE 2: ACADEMIC_YEAR
-- ============================================================================
-- Stores academic years for the system (e.g., 2023-24, 2024-25)
CREATE TABLE academic_year (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES school (id) ON DELETE CASCADE,
    year_name VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) DEFAULT 'inactive' CHECK (
        status IN (
            'active',
            'inactive',
            'completed'
        )
    ),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    UNIQUE (school_id, year_name),
    CHECK (end_date >= start_date)
);

CREATE INDEX idx_academic_year_school_id ON academic_year (school_id);

CREATE INDEX idx_academic_year_is_active ON academic_year (is_active);
-- ============================================================================
-- TABLE 3: SCHOOL_CLASS
-- ============================================================================
-- Stores class information (Grade 1, Grade 2, etc.)
CREATE TABLE school_class (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES school (id) ON DELETE CASCADE,
    class_name VARCHAR(100) NOT NULL,
    class_numeric_value INT NOT NULL,
    medium VARCHAR(50),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (school_id, class_name)
);

CREATE INDEX idx_school_class_school_id ON school_class (school_id);
-- ============================================================================
-- TABLE 4: SECTION
-- ============================================================================
-- Stores sections within a class (A, B, C, etc.)
CREATE TABLE section (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES school (id) ON DELETE CASCADE,
    class_id BIGINT NOT NULL REFERENCES school_class (id) ON DELETE CASCADE,
    section_name VARCHAR(50) NOT NULL,
    capacity INT DEFAULT 60,
    class_teacher VARCHAR(150),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (class_id, section_name)
);

CREATE INDEX idx_section_school_id ON section (school_id);

CREATE INDEX idx_section_class_id ON section (class_id);
-- ============================================================================
-- TABLE 5: STUDENT
-- ============================================================================
-- Stores student information
CREATE TABLE student (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES school (id) ON DELETE CASCADE,
    admission_number VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    last_name VARCHAR(100),
    date_of_birth DATE,
    gender VARCHAR(20) CHECK (
        gender IN ('Male', 'Female', 'Other')
    ),
    email VARCHAR(100) UNIQUE,
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100),
    blood_group VARCHAR(10),
    aadhar_number VARCHAR(20) UNIQUE,
    status VARCHAR(50) DEFAULT 'active' CHECK (
        status IN (
            'active',
            'inactive',
            'passed-out',
            'suspended'
        )
    ),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100)
);

CREATE INDEX idx_student_school_id ON student (school_id);

CREATE INDEX idx_student_admission_number ON student (admission_number);

CREATE INDEX idx_student_email ON student (email);

CREATE INDEX idx_student_status ON student (status);
-- ============================================================================
-- TABLE 6: PARENT_DETAIL
-- ============================================================================
-- Stores parent/guardian information
CREATE TABLE parent_detail (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES school (id) ON DELETE CASCADE,
    student_id BIGINT NOT NULL REFERENCES student (id) ON DELETE CASCADE,
    relation VARCHAR(50) NOT NULL CHECK (
        relation IN (
            'Father',
            'Mother',
            'Guardian',
            'Other'
        )
    ),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(20) NOT NULL,
    occupation VARCHAR(100),
    address TEXT,
    city VARCHAR(100),
    income_range VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_parent_detail_school_id ON parent_detail (school_id);

CREATE INDEX idx_parent_detail_student_id ON parent_detail (student_id);
-- ============================================================================
-- TABLE 7: LEAD
-- ============================================================================
-- Stores prospective student leads (not yet admitted)
CREATE TABLE lead(
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES school (id) ON DELETE CASCADE,
    academic_year_id BIGINT NOT NULL REFERENCES academic_year (id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(20) NOT NULL,
    desired_class VARCHAR(100),
    source VARCHAR(100),
    follow_up_status VARCHAR(50) DEFAULT 'pending' CHECK (
        follow_up_status IN (
            'pending',
            'contacted',
            'interested',
            'not-interested',
            'converted',
            'lost'
        )
    ),
    notes TEXT,
    inactivity_reason VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_to VARCHAR(100),
    last_contacted_at TIMESTAMP,
    created_by VARCHAR(100)
);

CREATE INDEX idx_lead_school_id ON lead(school_id);

CREATE INDEX idx_lead_academic_year_id ON lead(academic_year_id);

CREATE INDEX idx_lead_follow_up_status ON lead(follow_up_status);
-- ============================================================================
-- TABLE 8: ADMISSION
-- ============================================================================
-- Stores admission records of students
CREATE TABLE admission (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES school (id) ON DELETE CASCADE,
    student_id BIGINT NOT NULL REFERENCES student (id) ON DELETE CASCADE,
    lead_id BIGINT REFERENCES lead(id) ON DELETE SET NULL,
    academic_year_id BIGINT NOT NULL REFERENCES academic_year (id) ON DELETE CASCADE,
    class_id BIGINT NOT NULL REFERENCES school_class (id) ON DELETE CASCADE,
    section_id BIGINT NOT NULL REFERENCES section (id) ON DELETE CASCADE,
    admission_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'active' CHECK (
        status IN (
            'active',
            'on-leave',
            'suspended',
            'withdrawn',
            'draft',
            'submitted'
        )
    ),
    admission_type VARCHAR(50) CHECK (
        admission_type IN ('new', 'transfer', 'regular')
    ),
    registration_number VARCHAR(50) UNIQUE,
    previous_school VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100)
);

CREATE INDEX idx_admission_school_id ON admission (school_id);

CREATE INDEX idx_admission_student_id ON admission (student_id);

CREATE INDEX idx_admission_lead_id ON admission (lead_id);

CREATE INDEX idx_admission_academic_year_id ON admission (academic_year_id);

CREATE INDEX idx_admission_class_id ON admission (class_id);

CREATE INDEX idx_admission_section_id ON admission (section_id);

CREATE INDEX idx_admission_status ON admission (status);
-- ============================================================================
-- TABLE 9: FEE_STRUCTURE
-- ============================================================================
-- Stores fee structure for classes in each academic year
CREATE TABLE fee_structure (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES school (id) ON DELETE CASCADE,
    academic_year_id BIGINT NOT NULL REFERENCES academic_year (id) ON DELETE CASCADE,
    class_id BIGINT NOT NULL REFERENCES school_class (id) ON DELETE CASCADE,
    fee_type VARCHAR(100) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    due_date DATE,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (
        academic_year_id,
        class_id,
        fee_type
    )
);

CREATE INDEX idx_fee_structure_school_id ON fee_structure (school_id);

CREATE INDEX idx_fee_structure_academic_year_id ON fee_structure (academic_year_id);

CREATE INDEX idx_fee_structure_class_id ON fee_structure (class_id);
-- ============================================================================
-- TABLE 9A: APPLICATION_PROGRESS
-- ============================================================================
-- Tracks completion status of each admission application step
CREATE TABLE application_progress (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    admission_id BIGINT NOT NULL UNIQUE REFERENCES admission (id) ON DELETE CASCADE,
    student_info_status VARCHAR(50) DEFAULT 'pending' CHECK (
        student_info_status IN ('pending', 'completed')
    ),
    parent_info_status VARCHAR(50) DEFAULT 'pending' CHECK (
        parent_info_status IN ('pending', 'completed')
    ),
    academic_details_status VARCHAR(50) DEFAULT 'pending' CHECK (
        academic_details_status IN ('pending', 'completed')
    ),
    photos_status VARCHAR(50) DEFAULT 'pending' CHECK (
        photos_status IN ('pending', 'completed')
    ),
    documents_status VARCHAR(50) DEFAULT 'pending' CHECK (
        documents_status IN ('pending', 'completed')
    ),
    review_status VARCHAR(50) DEFAULT 'pending' CHECK (
        review_status IN ('pending', 'completed')
    ),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_application_progress_admission_id ON application_progress (admission_id);
-- ============================================================================
-- TABLE 9B: DOCUMENTS
-- ============================================================================
-- Stores document metadata and file paths for admissions
CREATE TABLE documents (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    admission_id BIGINT NOT NULL REFERENCES admission (id) ON DELETE CASCADE,
    document_type VARCHAR(100) NOT NULL CHECK (
        document_type IN (
            'student_photo',
            'aadhar_card',
            'birth_certificate',
            'transfer_certificate',
            'previous_marksheet',
            'other'
        )
    ),
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    document_number VARCHAR(255),
    file_size INT,
    mime_type VARCHAR(100),
    uploaded_by VARCHAR(100),
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_documents_admission_id ON documents (admission_id);

CREATE INDEX idx_documents_document_type ON documents (document_type);
-- ============================================================================
-- TABLE 10: STUDENT_FEE_ASSIGNMENT
-- ============================================================================
-- Assigns fees to individual students
CREATE TABLE student_fee_assignment (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES school (id) ON DELETE CASCADE,
    student_id BIGINT NOT NULL REFERENCES student (id) ON DELETE CASCADE,
    admission_id BIGINT NOT NULL REFERENCES admission (id) ON DELETE CASCADE,
    fee_structure_id BIGINT NOT NULL REFERENCES fee_structure (id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    due_date DATE,
    concession_percentage DECIMAL(5, 2) DEFAULT 0 CHECK (
        concession_percentage >= 0
        AND concession_percentage <= 100
    ),
    concession_amount DECIMAL(12, 2) DEFAULT 0,
    final_amount DECIMAL(12, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (
        status IN (
            'pending',
            'partial',
            'completed',
            'overdue',
            'waived'
        )
    ),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (
        admission_id,
        fee_structure_id
    )
);

CREATE INDEX idx_student_fee_assignment_school_id ON student_fee_assignment (school_id);

CREATE INDEX idx_student_fee_assignment_student_id ON student_fee_assignment (student_id);

CREATE INDEX idx_student_fee_assignment_admission_id ON student_fee_assignment (admission_id);

CREATE INDEX idx_student_fee_assignment_status ON student_fee_assignment (status);
-- ============================================================================
-- TABLE 11: INVOICE
-- ============================================================================
-- Generates invoices for fee collection
CREATE TABLE invoice (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES school (id) ON DELETE CASCADE,
    student_id BIGINT NOT NULL REFERENCES student (id) ON DELETE CASCADE,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    total_amount DECIMAL(12, 2) NOT NULL,
    paid_amount DECIMAL(12, 2) DEFAULT 0,
    pending_amount DECIMAL(12, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'unpaid' CHECK (
        status IN (
            'unpaid',
            'partial',
            'paid',
            'overdue',
            'cancelled'
        )
    ),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100)
);

CREATE INDEX idx_invoice_school_id ON invoice (school_id);

CREATE INDEX idx_invoice_student_id ON invoice (student_id);

CREATE INDEX idx_invoice_status ON invoice (status);

CREATE INDEX idx_invoice_invoice_number ON invoice (invoice_number);
-- ============================================================================
-- TABLE 12: PAYMENT
-- ============================================================================
-- Records individual payment transactions
CREATE TABLE payment (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES school (id) ON DELETE CASCADE,
    student_id BIGINT NOT NULL REFERENCES student (id) ON DELETE CASCADE,
    invoice_id BIGINT NOT NULL REFERENCES invoice (id) ON DELETE CASCADE,
    payment_number VARCHAR(50) UNIQUE NOT NULL,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    payment_date DATE NOT NULL,
    payment_method VARCHAR(50) NOT NULL CHECK (
        payment_method IN (
            'cash',
            'check',
            'bank-transfer',
            'card',
            'upi',
            'other'
        )
    ),
    transaction_id VARCHAR(100),
    bank_name VARCHAR(100),
    cheque_number VARCHAR(50),
    status VARCHAR(50) DEFAULT 'pending' CHECK (
        status IN (
            'pending',
            'successful',
            'failed',
            'cancelled'
        )
    ),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    received_by VARCHAR(100)
);

CREATE INDEX idx_payment_school_id ON payment (school_id);

CREATE INDEX idx_payment_student_id ON payment (student_id);

CREATE INDEX idx_payment_invoice_id ON payment (invoice_id);

CREATE INDEX idx_payment_payment_date ON payment (payment_date);

CREATE INDEX idx_payment_status ON payment (status);
-- ============================================================================
-- Insert Sample Data
-- ============================================================================
-- Insert a sample school
INSERT INTO
    school (
        name,
        email,
        phone,
        address,
        city,
        state,
        postal_code,
        country,
        principal_name,
        status,
        created_by
    )
VALUES (
        'Green Valley School',
        'info@greenvalley.edu',
        '+91-9876543210',
        '123, School Road',
        'Delhi',
        'Delhi',
        '110001',
        'India',
        'Dr. Rajesh Kumar',
        'active',
        'admin'
    );
-- Insert academic years
INSERT INTO
    academic_year (
        school_id,
        year_name,
        start_date,
        end_date,
        is_active,
        status,
        created_by
    )
VALUES (
        1,
        '2024-25',
        '2024-04-01',
        '2025-03-31',
        TRUE,
        'active',
        'admin'
    );
-- Insert classes
INSERT INTO
    school_class (
        school_id,
        class_name,
        class_numeric_value,
        medium
    )
VALUES (1, 'Class 1', 1, 'English'),
    (1, 'Class 2', 2, 'English'),
    (1, 'Class 10', 10, 'English');
-- Insert sections
INSERT INTO
    section (
        school_id,
        class_id,
        section_name,
        capacity,
        class_teacher
    )
VALUES (
        1,
        1,
        'A',
        45,
        'Mrs. Priya Singh'
    ),
    (
        1,
        1,
        'B',
        45,
        'Mrs. Anjali Sharma'
    ),
    (
        1,
        2,
        'A',
        45,
        'Mr. Vikram Patel'
    );
-- Insert a sample student
INSERT INTO
    student (
        school_id,
        admission_number,
        first_name,
        middle_name,
        last_name,
        date_of_birth,
        gender,
        email,
        phone,
        address,
        city,
        state,
        postal_code,
        country,
        blood_group,
        status,
        created_by
    )
VALUES (
        1,
        'ADM001',
        'Rohan',
        'Kumar',
        'Singh',
        '2015-08-15',
        'Male',
        'rohan@example.com',
        '+91-9123456789',
        '456, Main Street',
        'Delhi',
        'Delhi',
        '110001',
        'India',
        'O+',
        'active',
        'admin'
    );
-- Insert parent details
INSERT INTO
    parent_detail (
        school_id,
        student_id,
        relation,
        first_name,
        last_name,
        email,
        phone,
        occupation,
        city
    )
VALUES (
        1,
        1,
        'Father',
        'Rajesh',
        'Singh',
        'rajesh@example.com',
        '+91-9123456780',
        'Engineer',
        'Delhi'
    );
-- Insert a sample lead
INSERT INTO
    lead(
        school_id,
        academic_year_id,
        first_name,
        last_name,
        email,
        phone,
        desired_class,
        source,
        follow_up_status,
        assigned_to,
        created_by
    )
VALUES (
        1,
        1,
        'Arjun',
        'Kapoor',
        'arjun@example.com',
        '+91-9876543211',
        'Class 5',
        'Website',
        'interested',
        'admin',
        'admin'
    );
-- Insert admission record
INSERT INTO
    admission (
        school_id,
        student_id,
        academic_year_id,
        class_id,
        section_id,
        admission_date,
        status,
        admission_type,
        created_by
    )
VALUES (
        1,
        1,
        1,
        1,
        1,
        '2024-04-10',
        'active',
        'new',
        'admin'
    );
-- Insert fee structure
INSERT INTO
    fee_structure (
        school_id,
        academic_year_id,
        class_id,
        fee_type,
        amount,
        description
    )
VALUES (
        1,
        1,
        1,
        'Tuition Fee',
        50000,
        'Monthly tuition fee'
    ),
    (
        1,
        1,
        1,
        'Admission Fee',
        5000,
        'One-time admission fee'
    ),
    (
        1,
        1,
        1,
        'Activity Fee',
        2000,
        'Extra-curricular activities'
    );
-- Insert student fee assignment
INSERT INTO
    student_fee_assignment (
        school_id,
        student_id,
        admission_id,
        fee_structure_id,
        amount,
        due_date,
        concession_percentage,
        concession_amount,
        final_amount,
        status
    )
VALUES (
        1,
        1,
        1,
        1,
        50000,
        '2024-05-10',
        10,
        5000,
        45000,
        'partial'
    ),
    (
        1,
        1,
        1,
        2,
        5000,
        '2024-04-10',
        0,
        0,
        5000,
        'completed'
    );
-- Insert invoice
INSERT INTO
    invoice (
        school_id,
        student_id,
        invoice_number,
        invoice_date,
        due_date,
        total_amount,
        paid_amount,
        pending_amount,
        status,
        created_by
    )
VALUES (
        1,
        1,
        'INV-001',
        '2024-04-10',
        '2024-05-10',
        50000,
        25000,
        25000,
        'partial',
        'admin'
    );
-- Insert payment record
INSERT INTO
    payment (
        school_id,
        student_id,
        invoice_id,
        payment_number,
        amount,
        payment_date,
        payment_method,
        transaction_id,
        status,
        received_by
    )
VALUES (
        1,
        1,
        1,
        'PAY-001',
        25000,
        '2024-05-05',
        'bank-transfer',
        'TXN-2024-05-001',
        'successful',
        'admin'
    );
-- ============================================================================
-- Create Views (Optional but useful for reporting)
-- ============================================================================
-- View: Student with current class and section
CREATE VIEW student_enrollment_view AS
SELECT
    s.id,
    s.admission_number,
    CONCAT(
        s.first_name,
        ' ',
        s.last_name
    ) as student_name,
    sc.class_name,
    sec.section_name,
    a.admission_date,
    a.status as admission_status,
    sh.name as school_name
FROM
    student s
    JOIN admission a ON s.id = a.student_id
    JOIN school_class sc ON a.class_id = sc.id
    JOIN section sec ON a.section_id = sec.id
    JOIN school sh ON s.school_id = sh.id
WHERE
    a.status = 'active';
-- View: Student fee summary
CREATE VIEW student_fee_summary_view AS
SELECT
    s.id,
    s.admission_number,
    CONCAT(
        s.first_name,
        ' ',
        s.last_name
    ) as student_name,
    SUM(sfa.final_amount) as total_fees,
    SUM(
        CASE
            WHEN sfa.status = 'completed' THEN sfa.final_amount
            ELSE 0
        END
    ) as paid_fees,
    SUM(
        CASE
            WHEN sfa.status IN (
                'pending',
                'partial',
                'overdue'
            ) THEN sfa.final_amount
            ELSE 0
        END
    ) as pending_fees
FROM
    student s
    JOIN student_fee_assignment sfa ON s.id = sfa.student_id
GROUP BY
    s.id,
    s.admission_number,
    s.first_name,
    s.last_name;
-- ============================================================================
-- SAAS EXTENSION: Multi-Step Application System
-- ============================================================================
-- The following tables extend the system to support SaaS features,
-- multi-step admission workflows, and enterprise audit tracking.
-- No existing tables are modified.
-- ============================================================================
-- ============================================================================
-- TABLE: APP_USER (Role-based User Management for SaaS)
-- ============================================================================
-- Stores users with roles for multi-tenant school access
CREATE TABLE app_user (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES school (id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    UNIQUE (school_id, email)
);

CREATE INDEX idx_app_user_school_id ON app_user (school_id);

CREATE INDEX idx_app_user_role ON app_user (role);

CREATE INDEX idx_app_user_email ON app_user (email);

CREATE INDEX idx_app_user_status ON app_user (status);
-- ============================================================================
-- TABLE: APPLICATION (Core Multi-Step Application Management)
-- ============================================================================
-- Main table to track admission applications through multiple steps
CREATE TABLE application (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES school (id) ON DELETE CASCADE,
    academic_year_id BIGINT NOT NULL REFERENCES academic_year (id) ON DELETE CASCADE,
    lead_id BIGINT REFERENCES lead(id) ON DELETE SET NULL,
    application_number VARCHAR(50) NOT NULL UNIQUE,
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (
        status IN (
            'draft',
            'in_progress',
            'submitted',
            'approved',
            'rejected'
        )
    ),
    current_step INT DEFAULT 1 CHECK (
        current_step >= 1
        AND current_step <= 6
    ),
    assigned_to BIGINT REFERENCES app_user (id) ON DELETE SET NULL,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    submitted_at TIMESTAMP,
    UNIQUE (school_id, application_number)
);

CREATE INDEX idx_application_school_id ON application (school_id);

CREATE INDEX idx_application_academic_year_id ON application (academic_year_id);

CREATE INDEX idx_application_lead_id ON application (lead_id);

CREATE INDEX idx_application_status ON application (status);

CREATE INDEX idx_application_current_step ON application (current_step);

CREATE INDEX idx_application_assigned_to ON application (assigned_to);
-- ============================================================================
-- TABLE: APPLICATION_STUDENT_INFO (Step 1: Student Details)
-- ============================================================================
-- Stores student personal information for the application
CREATE TABLE application_student_info (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    application_id BIGINT NOT NULL REFERENCES application (id) ON DELETE CASCADE,
    CONSTRAINT unique_application_student_info_application UNIQUE (application_id),
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_application_student_info_application_id ON application_student_info (application_id);

CREATE INDEX idx_application_student_info_aadhar ON application_student_info (aadhar_number);
-- ============================================================================
-- TABLE: APPLICATION_PARENT_INFO (Step 2: Parent/Guardian Details)
-- ============================================================================
-- Stores parent and guardian information for the application
CREATE TABLE application_parent_info (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    application_id BIGINT NOT NULL REFERENCES application (id) ON DELETE CASCADE,
    CONSTRAINT unique_application_parent UNIQUE (application_id),
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_application_parent_info_application_id ON application_parent_info (application_id);
-- ============================================================================
-- TABLE: APPLICATION_ACADEMIC_INFO (Step 3: Academic History)
-- ============================================================================
-- Stores previous academic information for the application
CREATE TABLE application_academic_info (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    application_id BIGINT NOT NULL REFERENCES application (id) ON DELETE CASCADE,
    CONSTRAINT unique_application_academic_info_application UNIQUE (application_id),
    school_id BIGINT,
    desired_class VARCHAR(100) NOT NULL,
    previous_school VARCHAR(255),
    previous_class VARCHAR(100),
    marks_percentage DECIMAL(5, 2),
    board_name VARCHAR(100),
    academic_year VARCHAR(50),
    additional_qualifications TEXT,
    extracurricular_activities TEXT,
    achievements TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_application_academic_info_application_id ON application_academic_info (application_id);

CREATE INDEX idx_application_academic_info_desired_class ON application_academic_info (desired_class);
-- ============================================================================
-- TABLE: APPLICATION_DOCUMENTS (Document Management)
-- ============================================================================
-- Stores documents uploaded during the application process
CREATE TABLE application_documents (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    application_id BIGINT NOT NULL REFERENCES application (id) ON DELETE CASCADE,
    CONSTRAINT unique_app_id_and_type UNIQUE (application_id, document_type),
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
    file_size INT,
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_application_documents_application_id ON application_documents (application_id);

CREATE INDEX idx_application_documents_document_type ON application_documents (document_type);

CREATE INDEX idx_application_documents_verification_status ON application_documents (verification_status);

CREATE INDEX idx_application_documents_uploaded_by ON application_documents (uploaded_by);
-- ============================================================================
-- TABLE: LEAD_ACTIVITY (CRM Activity Tracking)
-- ============================================================================
-- Tracks all activities (calls, emails, visits, etc.) related to leads
CREATE TABLE lead_activity (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_lead_activity_lead_id ON lead_activity (lead_id);

CREATE INDEX idx_lead_activity_activity_type ON lead_activity (activity_type);

CREATE INDEX idx_lead_activity_created_by ON lead_activity (created_by);

CREATE INDEX idx_lead_activity_created_at ON lead_activity (created_at);
-- ============================================================================
-- TABLE: AUDIT_LOG (Enterprise Audit Trail)
-- ============================================================================
-- Comprehensive audit log for enterprise compliance and tracking
CREATE TABLE audit_log (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_log_school_id ON audit_log (school_id);

CREATE INDEX idx_audit_log_user_id ON audit_log (user_id);

CREATE INDEX idx_audit_log_entity ON audit_log (entity);

CREATE INDEX idx_audit_log_entity_id ON audit_log (entity_id);

CREATE INDEX idx_audit_log_action ON audit_log (action);

CREATE INDEX idx_audit_log_created_at ON audit_log (created_at);
-- ============================================================================
-- ALTER EXISTING TABLE: admission
-- ============================================================================
-- Add reference to the new application table for linking multi-step apps
ALTER TABLE admission
ADD COLUMN application_id BIGINT REFERENCES application (id) ON DELETE SET NULL;

CREATE INDEX idx_admission_application_id ON admission (application_id);
-- ============================================================================
-- FUNCTION: Update Application Status Timestamp
-- ============================================================================
-- Automatically track when application status changes
CREATE OR REPLACE FUNCTION update_application_submitted_at() RETURNS TRIGGER AS $$ BEGIN IF NEW.status = 'submitted'
  AND OLD.status != 'submitted' THEN NEW.submitted_at = CURRENT_TIMESTAMP;
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_application_submitted_at BEFORE
UPDATE ON application FOR EACH ROW EXECUTE FUNCTION update_application_submitted_at();
-- ============================================================================
-- FUNCTION: Auto-Update Updated_At Timestamp
-- ============================================================================
-- Automatically update updated_at timestamp for new tables
CREATE OR REPLACE FUNCTION update_timestamp() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = CURRENT_TIMESTAMP;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Apply to application_student_info
CREATE TRIGGER tr_application_student_info_updated_at BEFORE
UPDATE ON application_student_info FOR EACH ROW EXECUTE FUNCTION update_timestamp();
-- Apply to application_parent_info
CREATE TRIGGER tr_application_parent_info_updated_at BEFORE
UPDATE ON application_parent_info FOR EACH ROW EXECUTE FUNCTION update_timestamp();
-- Apply to application_academic_info
CREATE TRIGGER tr_application_academic_info_updated_at BEFORE
UPDATE ON application_academic_info FOR EACH ROW EXECUTE FUNCTION update_timestamp();
-- Apply to application_documents
CREATE TRIGGER tr_application_documents_updated_at BEFORE
UPDATE ON application_documents FOR EACH ROW EXECUTE FUNCTION update_timestamp();
-- Apply to application
CREATE TRIGGER tr_application_updated_at BEFORE
UPDATE ON application FOR EACH ROW EXECUTE FUNCTION update_timestamp();
-- Apply to lead_activity
CREATE TRIGGER tr_lead_activity_updated_at BEFORE
UPDATE ON lead_activity FOR EACH ROW EXECUTE FUNCTION update_timestamp();
-- Apply to app_user
CREATE TRIGGER tr_app_user_updated_at BEFORE
UPDATE ON app_user FOR EACH ROW EXECUTE FUNCTION update_timestamp();
-- ==========================
-- communication log
-- ==========================
CREATE TABLE communication_log (
    id BIGSERIAL PRIMARY KEY,
    school_id BIGINT REFERENCES school (id) ON DELETE CASCADE,
    recipient_type VARCHAR(50) CHECK (
        recipient_type IN ('lead', 'student', 'parent')
    ),
    recipient_id BIGINT,
    channel VARCHAR(20) CHECK (
        channel IN ('email', 'sms', 'whatsapp')
    ),
    subject VARCHAR(255),
    message TEXT,
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
    created_by BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE message_template (
    id BIGSERIAL PRIMARY KEY,
    school_id BIGINT REFERENCES school (id),
    name VARCHAR(100),
    category VARCHAR(50),
    -- onboarding, follow-up, reminder
    subject VARCHAR(255),
    content TEXT,
    last_used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE campaign (
    id BIGSERIAL PRIMARY KEY,
    school_id BIGINT REFERENCES school (id),
    name VARCHAR(100),
    channel VARCHAR(20),
    status VARCHAR(50),
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- sample data for communications table
-- communication_log data
INSERT INTO
    communication_log (
        school_id,
        recipient_type,
        recipient_id,
        channel,
        subject,
        message,
        status,
        sent_at,
        delivered_at,
        opened_at,
        clicked_at,
        created_by
    )
VALUES (
        1,
        'lead',
        1,
        'email',
        'Welcome',
        'Welcome to our school',
        'delivered',
        NOW(),
        NOW(),
        NOW(),
        NULL,
        1
    ),
    (
        1,
        'lead',
        2,
        'sms',
        NULL,
        'Visit scheduled',
        'sent',
        NOW(),
        NULL,
        NULL,
        NULL,
        1
    ),
    (
        1,
        'student',
        1,
        'whatsapp',
        NULL,
        'Fee reminder',
        'delivered',
        NOW(),
        NOW(),
        NULL,
        NULL,
        1
    ),
    (
        1,
        'parent',
        1,
        'email',
        'PTM Meeting',
        'Join PTM tomorrow',
        'opened',
        NOW(),
        NOW(),
        NOW(),
        NULL,
        1
    ),
    (
        1,
        'lead',
        3,
        'email',
        'Admission Open',
        'Apply now',
        'clicked',
        NOW(),
        NOW(),
        NOW(),
        NOW(),
        1
    ),
    (
        1,
        'student',
        2,
        'sms',
        NULL,
        'Exam schedule',
        'delivered',
        NOW(),
        NOW(),
        NULL,
        NULL,
        2
    ),
    (
        1,
        'parent',
        2,
        'whatsapp',
        NULL,
        'Fee due',
        'sent',
        NOW(),
        NULL,
        NULL,
        NULL,
        2
    ),
    (
        1,
        'lead',
        4,
        'email',
        'Follow-up',
        'Checking interest',
        'opened',
        NOW(),
        NOW(),
        NOW(),
        NULL,
        2
    ),
    (
        1,
        'student',
        3,
        'email',
        'Holiday Notice',
        'School closed tomorrow',
        'delivered',
        NOW(),
        NOW(),
        NULL,
        NULL,
        2
    ),
    (
        1,
        'parent',
        3,
        'sms',
        NULL,
        'Transport update',
        'sent',
        NOW(),
        NULL,
        NULL,
        NULL,
        2
    ),
    (
        1,
        'lead',
        5,
        'email',
        'Campus Visit',
        'Schedule visit',
        'clicked',
        NOW(),
        NOW(),
        NOW(),
        NOW(),
        1
    ),
    (
        1,
        'student',
        4,
        'whatsapp',
        NULL,
        'Assignment reminder',
        'delivered',
        NOW(),
        NOW(),
        NULL,
        NULL,
        1
    ),
    (
        1,
        'parent',
        4,
        'email',
        'Result Published',
        'Check portal',
        'opened',
        NOW(),
        NOW(),
        NOW(),
        NULL,
        1
    ),
    (
        1,
        'lead',
        6,
        'sms',
        NULL,
        'Application pending',
        'sent',
        NOW(),
        NULL,
        NULL,
        NULL,
        1
    ),
    (
        1,
        'student',
        5,
        'email',
        'Fee Receipt',
        'Download receipt',
        'delivered',
        NOW(),
        NOW(),
        NULL,
        NULL,
        1
    ),
    (
        1,
        'lead',
        7,
        'email',
        'Reminder',
        'Complete application',
        'opened',
        NOW(),
        NOW(),
        NOW(),
        NULL,
        2
    ),
    (
        1,
        'student',
        6,
        'sms',
        NULL,
        'Attendance alert',
        'sent',
        NOW(),
        NULL,
        NULL,
        NULL,
        2
    ),
    (
        1,
        'parent',
        6,
        'email',
        'Meeting Reminder',
        'PTM reminder',
        'delivered',
        NOW(),
        NOW(),
        NULL,
        NULL,
        2
    );
-- message_template sample data
INSERT INTO
    message_template (
        school_id,
        name,
        category,
        subject,
        content,
        last_used_at
    )
VALUES (
        1,
        'Welcome Email',
        'onboarding',
        'Welcome to School',
        'Welcome {{name}} to our school',
        NOW()
    ),
    (
        1,
        'Fee Reminder',
        'reminder',
        'Fee Due',
        'Your fee is pending',
        NOW()
    ),
    (
        1,
        'Campus Visit',
        'follow-up',
        'Visit Invitation',
        'Schedule your visit',
        NOW()
    ),
    (
        1,
        'Application Reminder',
        'reminder',
        'Complete Application',
        'Finish your form',
        NOW()
    ),
    (
        1,
        'Event Invite',
        'information',
        'Annual Day',
        'Join our event',
        NOW()
    );
-- campaign sample
INSERT INTO
    campaign (
        school_id,
        name,
        channel,
        status,
        start_date,
        end_date
    )
VALUES (
        1,
        'Admission Campaign 2026',
        'email',
        'active',
        '2026-01-01',
        '2026-03-31'
    ),
    (
        1,
        'Fee Reminder Campaign',
        'sms',
        'active',
        '2026-02-01',
        '2026-02-28'
    ),
    (
        1,
        'Campus Visit Drive',
        'whatsapp',
        'completed',
        '2025-12-01',
        '2025-12-31'
    ),
    (
        1,
        'Re-engagement Campaign',
        'email',
        'draft',
        '2026-04-01',
        '2026-04-30'
    ),
    (
        1,
        'New Session Outreach',
        'sms',
        'active',
        '2026-03-01',
        '2026-05-01'
    );
-- ============================================================================
-- STEP 5: DOCUMENTS
-- ============================================================================
-- Primary application_documents definition is declared earlier in this file.
-- Keeping a second CREATE TABLE block here causes schema drift and duplicate constraints.
-- ============================================================================
-- TRIGGERS & CONSTRAINTS
-- ============================================================================
-- Update application updated_at on progress change
CREATE OR REPLACE FUNCTION update_application_timestamp() RETURNS TRIGGER AS $$ BEGIN
UPDATE application
SET updated_at = CURRENT_TIMESTAMP
WHERE id = NEW.application_id;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_app_on_progress_change
AFTER
UPDATE ON application_progress FOR EACH ROW EXECUTE FUNCTION update_application_timestamp();
-- Similar triggers for all step tables
CREATE TRIGGER trigger_update_app_on_student_info
AFTER
INSERT
  OR
UPDATE ON application_student_info FOR EACH ROW EXECUTE FUNCTION update_application_timestamp();

CREATE TRIGGER trigger_update_app_on_parent_info
AFTER
INSERT
  OR
UPDATE ON application_parent_info FOR EACH ROW EXECUTE FUNCTION update_application_timestamp();

CREATE TRIGGER trigger_update_app_on_academic_info
AFTER
INSERT
  OR
UPDATE ON application_academic_info FOR EACH ROW EXECUTE FUNCTION update_application_timestamp();
-- ============================================================================
-- Migration: Add indexes for upcoming follow-ups optimization
-- ============================================================================
-- Purpose: Optimize queries for the "Upcoming Follow-ups" widget in Admissions Dashboard
--
-- This migration adds a composite index on the lead table to:
-- 1. Filter by school_id (multi-tenant isolation)
-- 2. Filter by follow_up_status (pending, contacted, interested)
-- 3. Filter by last_contacted_at (non-null values)
--
-- Expected index usage in query:
-- SELECT ... FROM lead WHERE school_id = X AND follow_up_status IN (...) AND last_contacted_at IS NOT NULL
-- Create the composite index for upcoming follow-ups query
CREATE INDEX IF NOT EXISTS idx_lead_followup_upcoming ON lead(
    school_id,
    follow_up_status,
    last_contacted_at DESC
)
WHERE
    last_contacted_at IS NOT NULL;
-- Additional index to support filtering by assigned_to for team-based views
CREATE INDEX IF NOT EXISTS idx_lead_assigned_to ON lead(
    school_id,
    assigned_to,
    follow_up_status
)
WHERE
    last_contacted_at IS NOT NULL;
-- Alternative simple index if composite doesn't perform well
CREATE INDEX IF NOT EXISTS idx_lead_contactdate ON lead(last_contacted_at DESC)
WHERE
    school_id IS NOT NULL
    AND follow_up_status IN (
        'pending',
        'contacted',
        'interested'
    );
-- Index to support sorting by last_contacted_at for various queries
CREATE INDEX IF NOT EXISTS idx_lead_school_status_date ON lead(
    school_id,
    follow_up_status,
    last_contacted_at DESC
);
-- ============================================================================
-- TABLE: CAMPUS_VISIT (Campus Visit Scheduling & Tracking)
-- ============================================================================
-- Stores campus visit schedules linked to leads, with counselor assignment
-- and slot-based double-booking prevention.

-- 1. Define the status enum if not already done
DO $$ BEGIN
    CREATE TYPE visit_status AS ENUM ('scheduled', 'completed', 'cancelled', 'no_show');

EXCEPTION WHEN duplicate_object THEN null;

END $$;

CREATE TABLE campus_visit (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  school_id BIGINT NOT NULL REFERENCES school(id) ON DELETE CASCADE,
  lead_id BIGINT REFERENCES lead(id) ON DELETE SET NULL,

-- Visit Schedule (Using specific types for easier frontend filtering)
visit_date DATE NOT NULL,
start_time TIME NOT NULL,
end_time TIME NOT NULL,

-- Visitor Information (For Auto-fill requirement)
-- We store these even if we have lead_id to keep a historical record
visitor_name VARCHAR(255) NOT NULL,
visitor_phone VARCHAR(20) NOT NULL,
student_name VARCHAR(255), -- Added to match "Auto-fill student name" requirement
grade VARCHAR(50),
number_of_visitors INT DEFAULT 1,

-- Context & Notes
tour_preferences TEXT,
internal_notes TEXT,
status visit_status DEFAULT 'scheduled',
visit_type VARCHAR(50) DEFAULT 'campus_visit',

-- Audit & Assignment
created_by BIGINT, -- Links to staff/user table
assigned_to BIGINT, -- The Counselor
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

-- IMPROVED CONSTRAINT: Prevent a specific counselor from being double-booked,
-- but allow the school to have multiple visits at the same time with different staff.
CONSTRAINT unique_counselor_slot
  UNIQUE (school_id, assigned_to, visit_date, start_time)
);

-- Index for the "Counselor Workspace" dashboard (Speed up date-based lookups)
CREATE INDEX idx_campus_visit_dashboard ON campus_visit (school_id, visit_date, status);

-- ============================================================================
-- TABLE: TASK
-- ============================================================================
-- Create the Task table
CREATE TABLE task (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  school_id BIGINT NOT NULL REFERENCES school(id) ON DELETE CASCADE,
  assigned_to BIGINT NOT NULL, -- Links to your staff/user table

-- Task Content
title VARCHAR(255) NOT NULL,
task_description TEXT,
priority VARCHAR(20) CHECK (
    priority IN ('low', 'medium', 'high')
) DEFAULT 'medium',

-- Status and Deadlines
is_done BOOLEAN DEFAULT FALSE, due_date DATE DEFAULT CURRENT_DATE,

-- Tracking
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for the "Counselor Workspace" to load pending tasks instantly
CREATE INDEX idx_task_workspace ON task (
    school_id,
    assigned_to,
    is_done,
    due_date
);

-- Insert a High Priority follow-up
INSERT INTO
    task (
        school_id,
        assigned_to,
        title,
        priority,
        due_date
    )
VALUES (
        1,
        5,
        'Follow-up with 5 hot leads',
        'high',
        CURRENT_DATE
    );

-- Insert a Medium Priority admin task
INSERT INTO
    task (
        school_id,
        assigned_to,
        title,
        priority,
        due_date
    )
VALUES (
        1,
        5,
        'Prepare tour schedule for next week',
        'medium',
        CURRENT_DATE + 1
    );

-- Insert a Completed task
INSERT INTO
    task (
        school_id,
        assigned_to,
        title,
        priority,
        is_done
    )
VALUES (
        1,
        5,
        'Send weekly report',
        'low',
        TRUE
    );

-- ============================================================================
-- TABLE: COMMUNICATION_LOGS & TEMPLATES
-- ============================================================================
-- TABLE: communication_logs
-- Tracks every email/message sent for history and auditing
CREATE TABLE communication_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  school_id BIGINT NOT NULL REFERENCES school(id) ON DELETE CASCADE,
  sender_id BIGINT NOT NULL, -- Links to the staff/user who sent it

-- Recipient Details
recipient_type VARCHAR(20) NOT NULL CHECK (
    recipient_type IN ('lead', 'student', 'parent')
),
recipient_id BIGINT NOT NULL,
recipient_email VARCHAR(255) NOT NULL,

-- Content
subject VARCHAR(255),
content TEXT,
channel VARCHAR(10) DEFAULT 'email' CHECK (channel IN ('email', 'sms')),

-- Status Tracking
status VARCHAR(20) DEFAULT 'pending' CHECK (
    status IN (
        'pending',
        'sent',
        'delivered',
        'opened',
        'failed'
    )
),
error_message TEXT, -- Stores why a mail failed (e.g., "Invalid Email")

-- Timestamps for Analytics
sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  delivered_at TIMESTAMP,
  opened_at TIMESTAMP,
  clicked_at TIMESTAMP
);

-- Index for fast loading of communication history in the UI
CREATE INDEX idx_comm_logs_school_recipient ON communication_logs (
    school_id,
    recipient_id,
    recipient_type
);

-- TABLE: communication_templates
CREATE TABLE communication_templates (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES school (id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL, -- e.g., 'Admission Inquiry Follow-up'
    subject VARCHAR(255) NOT NULL,
    content TEXT NOT NULL, -- Stores HTML/Text with {{first_name}} placeholders
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ensure indexes exist for the resolveRecipient logic
CREATE INDEX IF NOT EXISTS idx_parent_student_lookup ON parent_detail (student_id);

-- ============================================================================
-- TABLE: SCHEDULED_EMAILS
-- ============================================================================
-- Tracks emails scheduled for later delivery
CREATE TABLE scheduled_emails (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    school_id BIGINT NOT NULL,
    sender_id BIGINT NOT NULL,
    recipient_type VARCHAR(20) NOT NULL, -- 'lead', 'student', or 'parent'
    recipient_id BIGINT NOT NULL,
    recipients TEXT NOT NULL, -- comma-separated list of recipient emails
    subject VARCHAR(255),
    message TEXT,
    attachments JSONB DEFAULT '[]',
    scheduled_at TIMESTAMP NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- TABLE: SERVICE_PROVIDER_STAFF
-- ============================================================================
-- Table for internal platform management staff
CREATE TABLE service_provider_staff (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    internal_role VARCHAR(50) DEFAULT 'staff' CHECK (internal_role IN ('super_admin', 'support', 'billing')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- Speed up login lookups for your internal team
CREATE INDEX idx_sp_staff_email ON service_provider_staff(email);

-- Placeholder for your first Super Admin account
INSERT INTO service_provider_staff (full_name, email, password_hash, internal_role)
VALUES ('Platform Owner', 'admin@your-saas-provider.com', '$2b$10$YourHashedPasswordExample', 'super_admin');

-- ============================================================================
-- SQL Script ends
-- ============================================================================