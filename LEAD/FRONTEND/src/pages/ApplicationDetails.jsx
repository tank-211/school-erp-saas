import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import "./ApplicationDetails.css";

export default function ApplicationDetails() {
  const { id } = useParams();

  const [application, setApplication] = useState(null);
  const [documentName, setDocumentName] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [studentInfo, setStudentInfo] = useState({
    first_name: "",
    middle_name: "",
    last_name: "",
    date_of_birth: "",
    gender: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    postal_code: "",
    country: "",
    blood_group: "",
    aadhar_number: ""
  });

  const [parentInfo, setParentInfo] = useState({

    guardian_name:"",
    guardian_relation:"",
    guardian_phone:"",
    guardian_email:"",

    income_range:"",

    address:"",
    city:"",
    state:"",
    postal_code:"",

    primary_contact_person:"Father",
    primary_contact_relation:"Father",
    primary_contact_phone:""

  });


  useEffect(() => {
    fetchApplication();
  }, [id]);

  const fetchApplication = async () => {
    try {
      const token = localStorage.getItem("authToken");

      const res = await fetch(
        `http://localhost:5000/api/applications/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      console.log("APPLICATION DETAILS:", data);

      setApplication(data.data);

      if (data.data.application_student_info) {
        setStudentInfo(data.data.application_student_info);
      } else {
        setStudentInfo({
          first_name: "",
          middle_name: "",
          last_name: "",
          date_of_birth: "",
          gender: "",
          email: "",
          phone: "",
          address: "",
          city: "",
          state: "",
          postal_code: "",
          country: "",
          blood_group: "",
          aadhar_number: ""
        });
      }

      if (data.data.application_parent_info) {
        setParentInfo(data.data.application_parent_info);
      } else {
        setParentInfo({
          guardian_name: "",
          guardian_relation: "",
          guardian_phone: "",
          guardian_email: "",
          income_range: "",
          address: "",
          city: "",
          state: "",
          postal_code: "",
          primary_contact_person: "Father",
          primary_contact_relation: "Father",
          primary_contact_phone: "",
        });
      }

    } catch (err) {
      console.error(err);
    }
  };

  const updateStatus = async (e) => {
    try {
        const token = localStorage.getItem("authToken");

        const res = await fetch(
        `http://localhost:5000/api/applications/${id}/status`,
        {
            method: "PUT",
            headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
            status: e.target.value,
            }),
        }
        );

        const data = await res.json();

        console.log(data);

        fetchApplication();

    } catch (err) {
        console.error(err);
    }
    };

    const uploadDocument = async () => {
      try {

        if (!selectedFile) {
          alert("Please select a file.");
          return;
        }

        if (!documentName) {
          alert("Please enter document type.");
          return;
        }

        const token = localStorage.getItem("authToken");

        const formData = new FormData();

        formData.append("file", selectedFile);

        formData.append("documentType", documentName);

        const res = await fetch(
          `http://localhost:5000/api/applications/${id}/documents`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          }
        );

        const data = await res.json();

        console.log(data);

        setDocumentName("");
        setSelectedFile(null);

        fetchApplication();

      } catch (err) {
        console.error(err);
      }
    };

      const verifyDocument = async (documentId) => {
        try {
          const token = localStorage.getItem("authToken");

          await fetch(
            `http://localhost:5000/api/applications/document/${documentId}/verify`,
            {
              method: "PUT",
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          fetchApplication();

        } catch (err) {
          console.error(err);
        }
      };

      const saveStudentInfo = async () => {
          try {
            const token = localStorage.getItem("authToken");

            const res = await fetch(
              `http://localhost:5000/api/applications/${id}/student`,
              {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(studentInfo),
              }
            );

            const data = await res.json();

            console.log(data);

            alert("Student Information Saved");

            fetchApplication();

          } catch (err) {
            console.error(err);
          }
        };
      
        const saveParentInfo = async () => {
          try {

            const token = localStorage.getItem("authToken");

            const res = await fetch(
              `http://localhost:5000/api/applications/${id}/parent`,
              {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({

                    ...parentInfo,

                    primary_contact_person: parentInfo.primary_contact_person,
                    primary_contact_relation: parentInfo.primary_contact_relation,
                    primary_contact_phone: parentInfo.guardian_phone

                })
              }
            );

            const data = await res.json();

            console.log(data);

            alert("Parent Information Saved");

            fetchApplication();

          } catch (err) {
            console.error(err);
          }
        };

      const deleteDocument = async (documentId) => {

        if (!window.confirm("Delete this document?")) {
          return;
        }

        try {

          const token = localStorage.getItem("authToken");

          await fetch(
            `http://localhost:5000/api/applications/document/${documentId}`,
            {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          fetchApplication();

        } catch (err) {
          console.error(err);
        }

      };

  if (!application) {
    return (
      <div className="application-details-page">
        Loading...
      </div>
    );
  }

  return (
    <div className="application-details-page">

      <div className="application-header">

        <div>

          <h1>
            {application.application_number}
          </h1>

          <p>
            Status :
            {" "}
            {application.status}
          </p>

        </div>

      </div>

      {/* Student */}

      <div className="application-card">

        <h2>Student Information</h2>

        <div className="detail-row">
          <strong>Name :</strong>

          {application.lead.first_name}
          {" "}
          {application.lead.last_name}
        </div>

        <div className="detail-row">
          <strong>Grade :</strong>

          {application.lead.desired_class}
        </div>

        <div className="detail-row">
          <strong>Phone :</strong>

          {application.lead.phone}
        </div>

        <div className="detail-row">
          <strong>Email :</strong>

          {application.lead.email}
        </div>

      </div>


      <div className="application-card">

      <h2>Edit Student Information</h2>

      <input
        placeholder="First Name"
        value={studentInfo.first_name}
        onChange={(e) =>
          setStudentInfo({
            ...studentInfo,
            first_name: e.target.value,
          })
        }
      />

      <input
        placeholder="Last Name"
        value={studentInfo.last_name}
        onChange={(e) =>
          setStudentInfo({
            ...studentInfo,
            last_name: e.target.value,
          })
        }
      />

      <input
        type="date"
        value={studentInfo.date_of_birth?.substring(0,10) || ""}
        onChange={(e) =>
          setStudentInfo({
            ...studentInfo,
            date_of_birth: e.target.value,
          })
        }
      />

      <input
        placeholder="Phone"
        value={studentInfo.phone}
        onChange={(e) =>
          setStudentInfo({
            ...studentInfo,
            phone: e.target.value,
          })
        }
      />

      <input
        placeholder="Email"
        value={studentInfo.email}
        onChange={(e) =>
          setStudentInfo({
            ...studentInfo,
            email: e.target.value,
          })
        }
      />

      <button onClick={saveStudentInfo}>
        Save Student Information
      </button>

    </div>



    <div className="application-card">

      <h2>Parent / Guardian Information</h2>

      <input
        placeholder="Guardian Name"
        value={parentInfo.guardian_name}
        onChange={(e) =>
          setParentInfo({
            ...parentInfo,
            guardian_name: e.target.value,
          })
        }
      />

      <input
        placeholder="Guardian Relation"
        value={parentInfo.guardian_relation}
        onChange={(e) =>
          setParentInfo({
            ...parentInfo,
            guardian_relation: e.target.value,
          })
        }
      />

      <input
        placeholder="Guardian Phone"
        value={parentInfo.guardian_phone}
        onChange={(e) =>
          setParentInfo({
            ...parentInfo,
            guardian_phone: e.target.value,
          })
        }
      />

      <input
        placeholder="Guardian Email"
        value={parentInfo.guardian_email}
        onChange={(e) =>
          setParentInfo({
            ...parentInfo,
            guardian_email: e.target.value,
          })
        }
      />

      <input
        placeholder="Income Range"
        value={parentInfo.income_range}
        onChange={(e) =>
          setParentInfo({
            ...parentInfo,
            income_range: e.target.value,
          })
        }
      />

      <input
        placeholder="Address"
        value={parentInfo.address}
        onChange={(e) =>
          setParentInfo({
            ...parentInfo,
            address: e.target.value,
          })
        }
      />

      <input
        placeholder="City"
        value={parentInfo.city}
        onChange={(e) =>
          setParentInfo({
            ...parentInfo,
            city: e.target.value,
          })
        }
      />

      <input
        placeholder="State"
        value={parentInfo.state}
        onChange={(e) =>
          setParentInfo({
            ...parentInfo,
            state: e.target.value,
          })
        }
      />

      <input
        placeholder="Postal Code"
        value={parentInfo.postal_code}
        onChange={(e) =>
          setParentInfo({
            ...parentInfo,
            postal_code: e.target.value,
          })
        }
      />

      <button
        className="save-btn"
        onClick={saveParentInfo}
      >
        Save Parent Information
      </button>

    </div>

      {/* Application */}

      <div className="application-card">

        <h2>Application Information</h2>

        <div className="detail-row">
          <strong>Application Number :</strong>

          {application.application_number}
        </div>

        <div className="detail-row">
        <strong>Status :</strong>

        <select
            value={application.status}
            onChange={updateStatus}
        >
            <option value="draft">Draft</option>
            <option value="documents_pending">
            Documents Pending
            </option>
            <option value="submitted">
            Submitted
            </option>
            <option value="under_review">
            Under Review
            </option>
            <option value="approved">
            Approved
            </option>
            <option value="rejected">
            Rejected
            </option>
        </select>
        </div>

        <div className="detail-row">
          <strong>Assigned Counselor :</strong>

          {application.app_user?.name || "Unassigned"}
        </div>

        <div className="detail-row">
          <strong>Created :</strong>

          {new Date(
            application.created_at
          ).toLocaleDateString()}
        </div>

      </div>

      {/* Documents */}

      <div className="application-card">

        <h2>Documents</h2>

        <div style={{ marginBottom: "20px" }}>
          <input
            type="text"
            placeholder="Document Type"
            value={documentName}
            onChange={(e) => setDocumentName(e.target.value)}
          />

          <input
            type="file"
            onChange={(e) => setSelectedFile(e.target.files[0])}
          />

          <button
            onClick={uploadDocument}
          >
            Upload
          </button>
        </div>
      </div>

            {application.application_documents.length === 0 ? (

          <p>No documents uploaded.</p>

        ) : (

          application.application_documents.map((doc) => {
            
            console.log("DOCUMENT:", doc);

            return (

            <div
              key={doc.id}
              className="document-row"
            >

            <div className="document-name">
                <strong>{doc.file_name || doc.document_type}</strong>

                <small>
                    {new Date(doc.uploaded_at).toLocaleString()}
                </small>
            </div>

              <div
                className={
                  doc.verification_status === "Verified"
                    ? "status-badge verified"
                    : "status-badge pending"
                }
              >
                {doc.verification_status}
              </div>

              <div className="document-actions">

                {doc.file_path ? (
                  <button
                    className="view-btn"
                    onClick={() =>
                      window.open(
                        `http://localhost:5000/${doc.file_path}`,
                        "_blank"
                      )
                    }
                  >
                    👁 View
                  </button>
                ) : (
                  <span className="no-file">No File</span>
                )}

                <button
                  className="verify-btn"
                  disabled={doc.verification_status === "Verified"}
                  onClick={() => verifyDocument(doc.id)}
                >
                  {doc.verification_status === "Verified"
                    ? "✓ Verified"
                    : "✓ Verify"}
                </button>

                <button
                  className="delete-btn"
                  onClick={() => deleteDocument(doc.id)}
                >
                  🗑 Delete
                </button>
              </div>

            </div>
          );

        })

        )}

        </div>
  );
}