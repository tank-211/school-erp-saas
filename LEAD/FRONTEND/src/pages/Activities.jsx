import React, { useEffect, useState } from "react";

export default function Activities() {
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    fetch("/api/leads/activities", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("authToken")}`
      }
    })
      .then(res => res.json())
      .then(data => setActivities(data.data || []));
  }, []);

  return (
    <div>
      <h2>Recent Activities</h2>

      {activities.map(a => (
        <div key={a.id}>
          <b>{a.type}</b>
          {" - "}
          {a.lead?.studentFirstName}
          {" - "}
          {new Date(a.createdAt).toLocaleString()}
        </div>
      ))}
    </div>
  );
}