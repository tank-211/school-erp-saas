import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  User,
  Users,
  BookOpen,
  FileText,
  Loader2,
  Save,
} from "lucide-react";
import { getToken } from "../utils/authToken.js";
import "../style.css";

const API_URL = import.meta.env.VITE_API_URL;

const STEPS = [
  {
    key: "student",
    label: "Student",
    icon: User,
  },
  {
    key: "parent",
    label: "Parent",
    icon: Users,
  },
  {
    key: "academic",
    label: "Academic",
    icon: BookOpen,
  },
  {
    key: "documents",
    label: "Documents",
    icon: FileText,
  },
  {
    key: "review",
    label: "Review",
    icon: CheckCircle,
  },
];

const emptyStudent = {
  first_name: "",
  last_name: "",
  date_of_birth: "",
  gender: "",
  student_phone: "",
  student_email: "",
};

const emptyParent = {
  primary_contact_relation: "Father",
  father_name: "",
  father_phone: "",
  father_email: "",
  father_occupation: "",
  address: "",
  city: "",
  income_range: "",
};

const emptyAcademic = {
  desired_class: "",
  previous_school: "",
  previous_class: "",
  marks_percentage: "",
  board_name: "CBSE",
  academic_year: "",
  additional_qualifications: "",
  extracurricular_activities: "",
  achievements: "",
};

const DOCUMENT_LABELS = {
  birth_certificate: "Birth Certificate",
  aadhaar_card: "Aadhaar Card",
  passport_photos: "Passport Photos",
  transfer_certificate: "Transfer Certificate",
  previous_report_card: "Previous Report Card",
  address_proof: "Address Proof",
  parent_id_proof: "Parent ID Proof",
};

function formatDateForInput(value) {
  if (!value) return "";

  try {
    return String(value).split("T")[0];
  } catch {
    return "";
  }
}

function getFileName(record) {
  if (!record) return "";

  if (typeof record === "string") {
    return record.split("/").pop() || record;
  }

  return (
    record.file_name ||
    record.name ||
    record.file_path?.split("/").pop() ||
    record.file_url?.split("/").pop() ||
    ""
  );
}

function getRecordValue(record) {
  if (!record) return null;

  if (typeof record === "string") {
    return record;
  }

  return {
    ...record,
    file_name:
      record.file_name ||
      record.name ||
      record.file_path?.split("/").pop() ||
      null,
  };
}

function normalizeDocumentCollection(collection) {
  if (!collection) return {};

  // Already in the expected object format:
  // { birth_certificate: {...}, aadhaar_card: {...} }
  if (
    !Array.isArray(collection) &&
    typeof collection === "object"
  ) {
    return Object.entries(collection).reduce(
      (result, [key, value]) => {
        const normalized = getRecordValue(value);

        if (normalized) {
          result[key] = normalized;
        }

        return result;
      },
      {}
    );
  }

  // Backend may return:
  // [{ document_type: "birth_certificate", ... }]
  if (Array.isArray(collection)) {
    return collection.reduce(
      (result, record) => {
        if (!record) return result;

        const key =
          record.document_type ||
          record.type ||
          record.key;

        if (!key) return result;

        const normalized =
          getRecordValue(record);

        if (normalized) {
          result[key] = normalized;
        }

        return result;
      },
      {}
    );
  }

  return {};
}

function openPreview(record, label = "Document") {
  if (!record) return;

  let previewUrl = "";

  if (typeof record === "string") {
    previewUrl = record;
  } else {
    previewUrl =
      record.url ||
      record.file_url ||
      record.file_path ||
      "";
  }

  if (!previewUrl) {
    alert(`${label} preview is not available.`);
    return;
  }

  // Convert relative backend paths into full URLs
  if (
    previewUrl.startsWith("/") &&
    !previewUrl.startsWith("//")
  ) {
    previewUrl = `${API_URL}${previewUrl}`;
  }

  window.open(
    previewUrl,
    "_blank",
    "noopener,noreferrer"
  );
}

export function AdmissionResume() {
  const { id: admissionId } = useParams();
  const navigate = useNavigate();

  const [admission, setAdmission] = useState(null);
  const [student, setStudent] = useState(emptyStudent);
  const [parent, setParent] = useState(emptyParent);
  const [academic, setAcademic] = useState(emptyAcademic);

  const [photos, setPhotos] = useState({});
  const [documents, setDocuments] = useState({});

  const [step, setStep] = useState(0);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const currentStep = STEPS[step];

  const isAdmissionCompleted =
    admission?.status === "active" ||
    admission?.is_completed === true;

  const studentName = useMemo(() => {
    return [student.first_name, student.last_name]
      .filter(Boolean)
      .join(" ")
      .trim();
  }, [student.first_name, student.last_name]);

  useEffect(() => {
    if (!admissionId) {
      setError("Admission ID is missing.");
      setLoading(false);
      return;
    }

    sessionStorage.setItem(
      "activeAdmissionId",
      String(admissionId)
    );

    loadAdmission();
  }, [admissionId]);

  const loadAdmission = async () => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const token = getToken();

      const admissionRes = await fetch(
        `${API_URL}/api/applications/resume/${admissionId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const admissionData = await admissionRes.json();

      if (!admissionRes.ok) {
        throw new Error(
          admissionData.message ||
            "Failed to load admission"
        );
      }

      const admissionResult = admissionData.data;

      console.log(
        "ADMISSION RESUME RESPONSE:",
        admissionResult
      );

      setAdmission(admissionResult.admission || null);

      const studentData = admissionResult.student || {};
      const parentData = admissionResult.parent || {};
      const academicData = admissionResult.academic || {};

      setStudent({
        first_name: studentData.first_name || "",
        last_name: studentData.last_name || "",
        date_of_birth: formatDateForInput(
          studentData.date_of_birth
        ),
        gender: studentData.gender || "",
        student_phone:
          studentData.phone ||
          studentData.student_phone ||
          "",
        student_email:
          studentData.email ||
          studentData.student_email ||
          "",
      });

      setParent({
        primary_contact_relation:
          parentData.relation || "Father",
        father_name: parentData.first_name || "",
        father_phone: parentData.phone || "",
        father_email: parentData.email || "",
        father_occupation:
          parentData.occupation || "",
        address: parentData.address || "",
        city: parentData.city || "",
        income_range:
          parentData.income_range || "",
      });

      setAcademic({
        desired_class:
          academicData.desired_class || "",
        previous_school:
          academicData.previous_school || "",
        previous_class:
          academicData.previous_class || "",
        marks_percentage:
          academicData.marks_percentage ?? "",
        board_name:
          academicData.board_name || "CBSE",
        academic_year:
          academicData.academic_year || "",
        additional_qualifications:
          academicData.additional_qualifications || "",
        extracurricular_activities:
          academicData.extracurricular_activities || "",
        achievements:
          academicData.achievements || "",
      });

        setPhotos(
        normalizeDocumentCollection(
            admissionResult.photos
        )
        );

        setDocuments(
        normalizeDocumentCollection(
            admissionResult.documents
        )
        );

      /*
       * The admission stores the application ID.
       * Load the original application as well so that
       * already-uploaded application documents/photos can
       * be reused for the admission.
       */
      const linkedApplicationId =
        admissionResult.admission?.application_id;

      if (linkedApplicationId) {
        try {
          const applicationRes = await fetch(
            `${API_URL}/api/applications/${linkedApplicationId}/details`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          const applicationData =
            await applicationRes.json();

          if (applicationRes.ok) {
            const original = applicationData.data;

            console.log(
              "LINKED APPLICATION DETAILS:",
              original
            );

            const originalPhotos =
                normalizeDocumentCollection(
                    original?.photos
                );

                const originalDocuments =
                    normalizeDocumentCollection(
                        original?.documents ||
                        original?.application_documents
                    );

                if (Object.keys(originalPhotos).length > 0) {
                setPhotos((previous) => ({
                    ...originalPhotos,
                    ...previous,
                }));
                }

                if (Object.keys(originalDocuments).length > 0) {
                setDocuments((previous) => ({
                    ...originalDocuments,
                    ...previous,
                }));
                }
          }
        } catch (applicationError) {
          console.warn(
            "Could not load linked application documents:",
            applicationError
          );
        }
      }

      /*
       * Convert backend current_step into our UI index.
       */
      const backendStep =
        admissionResult.current_step ||
        admissionResult.admission?.current_step ||
        "student";

      const stepIndex = STEPS.findIndex(
        (item) => item.key === backendStep
      );

      setStep(stepIndex >= 0 ? stepIndex : 0);
    } catch (err) {
      console.error(
        "LOAD ADMISSION ERROR:",
        err
      );

      setError(
        err.message ||
          "Failed to load admission"
      );
    } finally {
      setLoading(false);
    }
  };

  const updateStudent = (field, value) => {
    setStudent((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const updateParent = (field, value) => {
    setParent((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const updateAcademic = (field, value) => {
    setAcademic((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleDocumentUpload = (documentType, file) => {
    if (!file || isAdmissionCompleted) return;

    const localRecord = {
      type: documentType,
      name: file.name,
      file,
      url: URL.createObjectURL(file),
      file_path: "",
      mime_type: file.type || "",
      file_size: file.size || null,
      fromServer: false,
    };

    setDocuments((previous) => ({
      ...previous,
      [documentType]: localRecord,
    }));

    // Clear old preview/error state
    setError("");
    setSuccess("");
  };

  const saveStep = async (stepKey) => {
    if (isAdmissionCompleted) {
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const token = getToken();

      let data = {};

      if (stepKey === "student") {
        if (!student.first_name.trim()) {
          throw new Error(
            "Student first name is required."
          );
        }

        data = {
          first_name: student.first_name.trim(),
          last_name:
            student.last_name.trim() || null,
          date_of_birth:
            student.date_of_birth || null,
          gender: student.gender || null,
          student_phone:
            student.student_phone || null,
          student_email:
            student.student_email || null,
        };
      }

      if (stepKey === "parent") {
        if (!parent.father_name.trim()) {
          throw new Error(
            "Parent/guardian name is required."
          );
        }

        data = {
          primary_contact_relation:
            parent.primary_contact_relation ||
            "Father",
          father_name:
            parent.father_name.trim(),
          father_phone:
            parent.father_phone || null,
          father_email:
            parent.father_email || null,
          father_occupation:
            parent.father_occupation || null,
          address:
            parent.address || null,
          city:
            parent.city || null,
          income_range:
            parent.income_range || null,
        };
      }

      if (stepKey === "academic") {
        if (!academic.desired_class.trim()) {
          throw new Error(
            "Desired class is required."
          );
        }

        data = {
          application_id:
            admission?.application_id,

          desired_class:
            academic.desired_class.trim(),

          previous_school:
            academic.previous_school || null,

          previous_class:
            academic.previous_class || null,

          marks_percentage:
            academic.marks_percentage === ""
              ? null
              : academic.marks_percentage,

          board_name:
            academic.board_name || null,

          academic_year:
            academic.academic_year || null,

          additional_qualifications:
            academic.additional_qualifications ||
            null,

          extracurricular_activities:
            academic.extracurricular_activities ||
            null,

          achievements:
            academic.achievements || null,
        };
      }

      if (stepKey === "documents") {
        const normalizedPhotos =
            normalizeDocumentCollection(photos);

        const normalizedDocuments =
            normalizeDocumentCollection(documents);

        data = {
          photos: normalizedPhotos,
          documents: normalizedDocuments,
          documentNumbers: {},
        };

        const requiredDocuments = [
            "birth_certificate",
            "aadhaar_card",
            "passport_photos",
            "transfer_certificate",
            "previous_report_card",
            "address_proof",
            "parent_id_proof",
        ];

        const missingDocuments =
            requiredDocuments.filter(
            (key) =>
                !normalizedDocuments[key] &&
                !normalizedPhotos[key]
            );

        console.log(
            "ADMISSION DOCUMENT PAYLOAD:",
            {
            admission_id: String(admissionId),
            photos: normalizedPhotos,
            documents: normalizedDocuments,
            missingDocuments,
            }
        );
        }

      const formData = new FormData();

      formData.append(
        "admission_id",
        String(admissionId)
      );

      formData.append(
        "step",
        stepKey
      );

      // Send the normal JSON data
      formData.append(
        "data",
        JSON.stringify(data)
      );

      // Upload admission documents
      if (stepKey === "documents") {
        Object.entries(documents || {}).forEach(
          ([documentType, record]) => {
            const file = record?.file;

            if (file instanceof File) {
              formData.append(
                `document_${documentType}`,
                file,
                file.name
              );
            }
          }
        );

        // Upload photos if there are new ones
        Object.entries(photos || {}).forEach(
          ([photoType, record]) => {
            const file = record?.file;

            if (file instanceof File) {
              formData.append(
                `photo_${photoType}`,
                file,
                file.name
              );
            }
          }
        );
      }

      console.log(
        "📤 Sending admission form data:",
        {
          admission_id: String(admissionId),
          step: stepKey,
          files: [
            ...Object.entries(documents || {})
              .filter(
                ([, record]) =>
                  record?.file instanceof File
              )
              .map(([type, record]) => ({
                type,
                name: record.file.name,
              })),
          ],
        }
      );

      const response = await fetch(
        `${API_URL}/api/applications/save-step`,
        {
          method: "POST",

          headers: {
            Authorization: `Bearer ${token}`,
          },

          body: formData,
        }
      );

      const responseData =
        await response.json();

      console.log(
        "SAVE ADMISSION STEP RESPONSE:",
        responseData
      );

      if (!response.ok) {
        throw new Error(
          responseData.message ||
            `Failed to save ${stepKey} step`
        );
      }

      const nextStepKey =
        responseData.data?.current_step;

      setSuccess(
        `${currentStep.label} information saved successfully.`
      );

      if (nextStepKey) {
        const nextIndex = STEPS.findIndex(
          (item) => item.key === nextStepKey
        );

        if (nextIndex >= 0) {
          setStep(nextIndex);
        }
      } else {
        setStep((previous) =>
          Math.min(
            previous + 1,
            STEPS.length - 1
          )
        );
      }

      setAdmission((previous) =>
        previous
          ? {
              ...previous,
              current_step:
                nextStepKey ||
                previous.current_step,
            }
          : previous
      );
    } catch (err) {
      console.error(
        "SAVE ADMISSION STEP ERROR:",
        err
      );

      setError(
        err.message ||
          "Failed to save admission step"
      );
    } finally {
      setSaving(false);
    }
  };

  const completeAdmission = async () => {
    if (isAdmissionCompleted) {
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const token = getToken();

      const response = await fetch(
        `${API_URL}/api/applications/complete`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            admission_id: String(admissionId),
          }),
        }
      );

      const data = await response.json();

      console.log(
        "COMPLETE ADMISSION RESPONSE:",
        data
      );

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to complete admission"
        );
      }

      sessionStorage.removeItem(
        "activeAdmissionId"
      );

      alert(
        "Admission completed successfully."
      );

      navigate("/enrollment");
    } catch (err) {
      console.error(
        "COMPLETE ADMISSION ERROR:",
        err
      );

      setError(
        err.message ||
          "Failed to complete admission"
      );
    } finally {
      setSaving(false);
    }
  };

  const renderInput = (
    label,
    value,
    onChange,
    type = "text",
    placeholder = ""
  ) => {
    return (
      <div className="form-group">
        <label className="form-label">
          {label}
        </label>

        <input
          className="form-input"
          type={type}
          value={value ?? ""}
          placeholder={placeholder}
          disabled={isAdmissionCompleted}
          onChange={(event) =>
            onChange(event.target.value)
          }
        />
      </div>
    );
  };

  const renderSelect = (
    label,
    value,
    onChange,
    options
  ) => {
    return (
      <div className="form-group">
        <label className="form-label">
          {label}
        </label>

        <select
          className="form-input"
          value={value ?? ""}
          disabled={isAdmissionCompleted}
          onChange={(event) =>
            onChange(event.target.value)
          }
        >
          <option value="">
            Select {label}
          </option>

          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
            >
              {option.label}
            </option>
          ))}
        </select>
      </div>
    );
  };

  const renderStudentStep = () => {
    return (
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">
              Student Information
            </div>
            <div className="page-sub">
              Verify and update the student details
              before continuing.
            </div>
          </div>
        </div>

        <div className="card-body">
          <div className="grid-2">
            {renderInput(
              "First Name *",
              student.first_name,
              (value) =>
                updateStudent(
                  "first_name",
                  value
                )
            )}

            {renderInput(
              "Last Name",
              student.last_name,
              (value) =>
                updateStudent(
                  "last_name",
                  value
                )
            )}

            {renderInput(
              "Date of Birth",
              student.date_of_birth,
              (value) =>
                updateStudent(
                  "date_of_birth",
                  value
                ),
              "date"
            )}

            {renderSelect(
              "Gender",
              student.gender,
              (value) =>
                updateStudent(
                  "gender",
                  value
                ),
              [
                {
                  value: "Male",
                  label: "Male",
                },
                {
                  value: "Female",
                  label: "Female",
                },
                {
                  value: "Other",
                  label: "Other",
                },
              ]
            )}

            {renderInput(
              "Student Phone",
              student.student_phone,
              (value) =>
                updateStudent(
                  "student_phone",
                  value
                ),
              "tel"
            )}

            {renderInput(
              "Student Email",
              student.student_email,
              (value) =>
                updateStudent(
                  "student_email",
                  value
                ),
              "email"
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderParentStep = () => {
    return (
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">
              Parent / Guardian Information
            </div>
            <div className="page-sub">
              Confirm the primary parent or guardian
              details.
            </div>
          </div>
        </div>

        <div className="card-body">
          <div className="grid-2">
            {renderSelect(
              "Relation",
              parent.primary_contact_relation,
              (value) =>
                updateParent(
                  "primary_contact_relation",
                  value
                ),
              [
                {
                  value: "Father",
                  label: "Father",
                },
                {
                  value: "Mother",
                  label: "Mother",
                },
                {
                  value: "Guardian",
                  label: "Guardian",
                },
                {
                  value: "Other",
                  label: "Other",
                },
              ]
            )}

            {renderInput(
              "Parent / Guardian Name *",
              parent.father_name,
              (value) =>
                updateParent(
                  "father_name",
                  value
                )
            )}

            {renderInput(
              "Phone",
              parent.father_phone,
              (value) =>
                updateParent(
                  "father_phone",
                  value
                ),
              "tel"
            )}

            {renderInput(
              "Email",
              parent.father_email,
              (value) =>
                updateParent(
                  "father_email",
                  value
                ),
              "email"
            )}

            {renderInput(
              "Occupation",
              parent.father_occupation,
              (value) =>
                updateParent(
                  "father_occupation",
                  value
                )
            )}

            {renderInput(
              "Income Range",
              parent.income_range,
              (value) =>
                updateParent(
                  "income_range",
                  value
                )
            )}

            {renderInput(
              "Address",
              parent.address,
              (value) =>
                updateParent(
                  "address",
                  value
                )
            )}

            {renderInput(
              "City",
              parent.city,
              (value) =>
                updateParent(
                  "city",
                  value
                )
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderAcademicStep = () => {
    return (
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">
              Academic Information
            </div>
            <div className="page-sub">
              Confirm the student's academic placement
              details.
            </div>
          </div>
        </div>

        <div className="card-body">
          <div className="grid-2">
            {renderInput(
              "Desired Class *",
              academic.desired_class,
              (value) =>
                updateAcademic(
                  "desired_class",
                  value
                ),
              "text",
              "Example: Class 3"
            )}

            {renderInput(
              "Previous School",
              academic.previous_school,
              (value) =>
                updateAcademic(
                  "previous_school",
                  value
                )
            )}

            {renderInput(
              "Previous Class",
              academic.previous_class,
              (value) =>
                updateAcademic(
                  "previous_class",
                  value
                )
            )}

            {renderInput(
              "Marks Percentage",
              academic.marks_percentage,
              (value) =>
                updateAcademic(
                  "marks_percentage",
                  value
                ),
              "number"
            )}

            {renderSelect(
              "Board",
              academic.board_name,
              (value) =>
                updateAcademic(
                  "board_name",
                  value
                ),
              [
                {
                  value: "CBSE",
                  label: "CBSE",
                },
                {
                  value: "ICSE",
                  label: "ICSE",
                },
                {
                  value: "State Board",
                  label: "State Board",
                },
                {
                  value: "Other",
                  label: "Other",
                },
              ]
            )}

            {renderInput(
              "Academic Year",
              academic.academic_year,
              (value) =>
                updateAcademic(
                  "academic_year",
                  value
                ),
              "text",
              "Example: 2026-27"
            )}

            {renderInput(
              "Additional Qualifications",
              academic.additional_qualifications,
              (value) =>
                updateAcademic(
                  "additional_qualifications",
                  value
                )
            )}

            {renderInput(
              "Extracurricular Activities",
              academic.extracurricular_activities,
              (value) =>
                updateAcademic(
                  "extracurricular_activities",
                  value
                )
            )}
          </div>

          <div className="form-group">
            <label className="form-label">
              Achievements
            </label>

            <textarea
              className="form-input"
              rows="4"
              value={
                academic.achievements || ""
              }
              disabled={isAdmissionCompleted}
              onChange={(event) =>
                updateAcademic(
                  "achievements",
                  event.target.value
                )
              }
            />
          </div>
        </div>
      </div>
    );
  };

  const renderDocumentsStep = () => {
    const documentTypes = Object.entries(DOCUMENT_LABELS);

    return (
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">
              Documents & Photos
            </div>

            <div className="page-sub">
              Upload any documents that are missing from
              the approved application.
            </div>
          </div>
        </div>

        <div className="card-body">

          <div
            className="info-box info-box-blue"
            style={{ marginBottom: "20px" }}
          >
            <div className="info-box-text">
              <strong>Admission Documents</strong>
              <div style={{ marginTop: 5 }}>
                Existing application documents are already
                available. Upload only the missing documents
                or replace an existing document if required.
              </div>
            </div>
          </div>

          <div className="grid-2">
            {documentTypes.map(([key, label]) => {
              const record = documents[key];
              const isAvailable = Boolean(record);

              return (
                <div
                  key={key}
                  className="info-box info-box-blue"
                  style={{
                    padding: "16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "12px",
                    }}
                  >
                    <div className="info-box-text">
                      <strong>{label}</strong>
                    </div>

                    {isAvailable ? (
                      <span className="badge badge-green">
                        Available
                      </span>
                    ) : (
                      <span className="badge badge-blue">
                        Missing
                      </span>
                    )}
                  </div>

                  <div
                    style={{
                      fontSize: "13px",
                      color: "var(--gray-600)",
                    }}
                  >
                    {record
                      ? getFileName(record)
                      : "No document uploaded"}
                  </div>

                  <input
                    id={`admission_document_${key}`}
                    type="file"
                    className="form-input"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    disabled={isAdmissionCompleted}
                    onChange={(event) =>
                      handleDocumentUpload(
                        key,
                        event.target.files?.[0]
                      )
                    }
                  />

                  {record && (
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() =>
                        openPreview(record, label)
                      }
                    >
                      View Document
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div
            className="info-box info-box-blue"
            style={{ marginTop: "20px" }}
          >
            <div className="info-box-text">
              <strong>Student Photo</strong>
            </div>

            <div className="info-box-text mt-1">
              {photos.student_photo
                ? getFileName(photos.student_photo)
                : "Not available"}
            </div>
          </div>

          <div
            style={{
              marginTop: "20px",
              padding: "14px",
              borderRadius: "8px",
              background: "var(--gray-50)",
              fontSize: "13px",
            }}
          >
            <strong>Important:</strong>{" "}
            Upload the required missing documents before
            completing the admission. The final confirmation
            will check the required document types.
          </div>
        </div>
      </div>
    );
  };

  const renderReviewStep = () => {
    return (
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">
              Review Admission
            </div>

            <div className="page-sub">
              Verify everything before completing the
              admission.
            </div>
          </div>
        </div>

        <div className="card-body">
          <div className="grid-2">
            <div className="info-box info-box-blue">
              <div className="info-box-text">
                <strong>
                  Student
                </strong>
              </div>

              <div className="info-box-text mt-1">
                {studentName || "Not provided"}
              </div>

              <div className="info-box-text mt-1">
                Class:{" "}
                {academic.desired_class ||
                  "Not provided"}
              </div>
            </div>

            <div className="info-box info-box-blue">
              <div className="info-box-text">
                <strong>
                  Parent / Guardian
                </strong>
              </div>

              <div className="info-box-text mt-1">
                {parent.father_name ||
                  "Not provided"}
              </div>

              <div className="info-box-text mt-1">
                {parent.father_phone ||
                  "No phone"}
              </div>
            </div>

            <div className="info-box info-box-blue">
              <div className="info-box-text">
                <strong>
                  Academic
                </strong>
              </div>

              <div className="info-box-text mt-1">
                Board:{" "}
                {academic.board_name ||
                  "Not provided"}
              </div>

              <div className="info-box-text mt-1">
                Previous School:{" "}
                {academic.previous_school ||
                  "Not provided"}
              </div>
            </div>

            <div className="info-box info-box-blue">
              <div className="info-box-text">
                <strong>
                  Documents
                </strong>
              </div>

              <div className="info-box-text mt-1">
                {
                  Object.keys({
                    ...photos,
                    ...documents,
                  }).length
                }{" "}
                uploaded/available
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: "24px",
              padding: "16px",
              borderRadius: "8px",
              border: "1px solid var(--border)",
            }}
          >
            {isAdmissionCompleted ? (
              <>
                <strong>Admission Completed</strong>

                <p
                  style={{
                    marginTop: "6px",
                    marginBottom: 0,
                    fontSize: "14px",
                    opacity: 0.75,
                  }}
                >
                  This admission has been successfully completed.
                  The student is now enrolled.
                </p>
              </>
            ) : (
              <>
                <strong>Ready to complete?</strong>

                <p
                  style={{
                    marginTop: "6px",
                    marginBottom: 0,
                    fontSize: "14px",
                    opacity: 0.75,
                  }}
                >
                  Clicking Complete Admission will run the backend
                  validation for the mandatory student photo and
                  documents.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderCurrentStep = () => {
    switch (currentStep.key) {
      case "student":
        return renderStudentStep();

      case "parent":
        return renderParentStep();

      case "academic":
        return renderAcademicStep();

      case "documents":
        return renderDocumentsStep();

      case "review":
        return renderReviewStep();

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div
        className="page"
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "400px",
        }}
      >
        <Loader2
          size={28}
          className="spin"
        />

        <span style={{ marginLeft: "10px" }}>
          Loading admission...
        </span>
      </div>
    );
  }

  if (error && !admission) {
    return (
      <div className="page">
        <div
          className="card"
          style={{ padding: "24px" }}
        >
          <h2>
            Unable to load admission
          </h2>

          <p
            style={{
              color: "red",
              marginTop: "10px",
            }}
          >
            {error}
          </p>

          <button
            className="btn btn-outline"
            style={{ marginTop: "16px" }}
            onClick={() =>
              navigate("/enrollment")
            }
          >
            Back to Enrollment
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Admission Processing
          </h1>

          <p className="page-sub">
            Complete admission for{" "}
            <strong>
              {studentName || "Student"}
            </strong>
          </p>
        </div>

        <div>
          <button
            className="btn btn-outline"
            onClick={() =>
              navigate("/enrollment")
            }
          >
            Back to Enrollment
          </button>
        </div>
      </div>

      {admission && (
        <div
          className="card mb-5"
          style={{ padding: "16px 20px" }}
        >
          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              gap: "20px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div className="stat-label">
                Admission ID
              </div>

              <div className="td-mono">
                {String(admission.id)}
              </div>
            </div>

            <div>
              <div className="stat-label">
                Application ID
              </div>

              <div className="td-mono">
                {String(
                  admission.application_id ||
                    "N/A"
                )}
              </div>
            </div>

            <div>
              <div className="stat-label">
                Status
              </div>

              <span
              className={
                isAdmissionCompleted
                  ? "badge badge-green"
                  : "badge badge-blue"
              }
            >
              {isAdmissionCompleted
                ? "Completed"
                : admission.status || "Processing"}
            </span>
            </div>
          </div>
        </div>
      )}

      <div className="card mb-5">
        <div
          className="card-body"
          style={{ padding: "20px" }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(5, 1fr)",
              gap: "10px",
            }}
          >
            {STEPS.map(
              (item, index) => {
                const Icon = item.icon;

                const isActive =
                  index === step;

                const isCompleted =
                  index < step;

                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      if (
                        !isAdmissionCompleted &&
                        index <= step
                      ) {
                        setStep(index);
                      }
                    }}
                    style={{
                      border: "none",
                      background:
                        "transparent",
                      cursor:
                        !isAdmissionCompleted && index <= step
                          ? "pointer"
                          : "default",
                      opacity:
                        !isAdmissionCompleted && index <= step
                          ? 1
                          : 0.55,
                      padding: "4px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems:
                          "center",
                        gap: "8px",
                        justifyContent:
                          "center",
                      }}
                    >
                      <div
                        className={`enroll-step-icon ${
                          isCompleted ||
                          isActive
                            ? "done"
                            : "todo"
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle
                            size={16}
                          />
                        ) : (
                          <Icon size={16} />
                        )}
                      </div>

                      <span
                        className="enroll-step-label"
                      >
                        {item.label}
                      </span>
                    </div>
                  </button>
                );
              }
            )}
          </div>
        </div>
      </div>

      {error && (
        <div
          className="card"
          style={{
            padding: "14px 18px",
            marginBottom: "20px",
            border: "1px solid #ef4444",
          }}
        >
          <div
            style={{
              color: "#dc2626",
            }}
          >
            {error}
          </div>
        </div>
      )}

      {success && (
        <div
          className="card"
          style={{
            padding: "14px 18px",
            marginBottom: "20px",
            border: "1px solid #22c55e",
          }}
        >
          <div
            style={{
              color: "#16a34a",
            }}
          >
            {success}
          </div>
        </div>
      )}

      {renderCurrentStep()}

      <div
        className="card"
        style={{ marginTop: "20px" }}
      >
        <div
          className="card-body"
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <button
            className="btn btn-outline"
            disabled={
              saving ||
              step === 0 ||
              isAdmissionCompleted
            }
            style={{
              opacity: isAdmissionCompleted ? 0.5 : 1,
              cursor: isAdmissionCompleted
                ? "not-allowed"
                : "pointer",
            }}
            onClick={() =>
              setStep((previous) =>
                Math.max(
                  previous - 1,
                  0
                )
              )
            }
          >
            <ChevronLeft size={16} />
            Previous
          </button>

          <div
            style={{
              fontSize: "13px",
              opacity: 0.7,
            }}
          >
            Step {step + 1} of{" "}
            {STEPS.length}
          </div>
          {currentStep.key !== "review" ? (
            <button
              className="btn btn-primary"
              disabled={saving || isAdmissionCompleted}
              onClick={() => saveStep(currentStep.key)}
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Save & Continue
                  <ChevronRight size={16} />
                </>
              )}
            </button>
          ) : isAdmissionCompleted ? (
            <button
              className="btn btn-primary"
              disabled
              style={{
                cursor: "default",
                opacity: 0.8,
              }}
            >
              <CheckCircle size={16} />
              Admission Completed
            </button>
          ) : (
            <button
              className="btn btn-primary"
              disabled={saving}
              onClick={completeAdmission}
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="spin" />
                  Completing...
                </>
              ) : (
                <>
                  <GraduationCap size={16} />
                  Complete Admission
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}