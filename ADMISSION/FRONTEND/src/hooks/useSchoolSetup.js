/**
 * hooks/useSchoolSetup.js
 *
 * The school's own classes, sections and academic years (School Setup), for
 * dropdowns. Class names must match school_class.class_name exactly: starting
 * an admission looks the class up by name.
 *
 *   const { classes, classNames, years, activeYear, loading, error } = useSchoolSetup();
 */
import { useEffect, useState } from "react";
import { fetchSetupOverview } from "../services/setupService";

let cached = null; // one fetch per page load is enough for dropdowns

export function useSchoolSetup() {
  const [state, setState] = useState(
    cached || { classes: [], years: [], loading: true, error: "" },
  );

  useEffect(() => {
    if (cached) return undefined;
    let cancelled = false;
    fetchSetupOverview()
      .then((overview) => {
        const next = {
          classes: overview?.classes || [],
          years: overview?.academic_years || [],
          loading: false,
          error: "",
        };
        cached = next;
        if (!cancelled) setState(next);
      })
      .catch((err) => {
        if (!cancelled) {
          setState({ classes: [], years: [], loading: false, error: err.message || "Could not load classes" });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    ...state,
    classNames: state.classes.map((c) => c.class_name),
    activeYear: state.years.find((y) => y.is_active) || null,
  };
}

/** Forget the cached setup (after School Setup changes classes or years). */
export const resetSchoolSetupCache = () => {
  cached = null;
};
