import { errorResponse } from "../utils/response.js";

export const validate = (schema) => {
  return (req, res, next) => {

        console.log("🔥 VALIDATION INPUT:", req.body);

    const result = schema.safeParse(req.body);

    // ❌ Validation failed
  if (!result.success) {

    // 🔥 ADD THIS LINE (CRITICAL DEBUG)
    console.log("❌ VALIDATION ERROR:", result.error.issues)

    const formattedErrors = {}

    result.error.issues.forEach((err) => {
      const field = err.path.join(".")
      formattedErrors[field] = err.message
    })

    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: formattedErrors
    })
  }

    // ✅ Validation success
    req.body = result.data;
    next();
  };
};