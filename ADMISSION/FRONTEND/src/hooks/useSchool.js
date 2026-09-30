// The signed-in user's own school (GET /api/schools/me), for headers and
// sidebars. Settings dispatches "school-updated" after saving, so the name and
// city shown everywhere stay current without a reload.
import { useEffect, useState } from "react";
import axios from "axios";
import { getAuthHeader } from "../utils/authToken.js";

export const initialsOf = (name = "") =>
  name
    .split(/\s+/)
    .filter((w) => /^[A-Za-z0-9]/.test(w))
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("") || "S";

export function useSchool() {
  const [school, setSchool] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      axios
        .get("/api/schools/me", { headers: getAuthHeader() })
        .then((res) => {
          if (!cancelled && res.data?.success) setSchool(res.data.data);
        })
        .catch(() => {});
    load();
    window.addEventListener("school-updated", load);
    return () => {
      cancelled = true;
      window.removeEventListener("school-updated", load);
    };
  }, []);

  return school;
}
