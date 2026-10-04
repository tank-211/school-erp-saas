const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

/**
 * GET /api/super-admin/payment-gateway
 * Get current platform payment gateway configuration
 */
const getPaymentGateway = async (req, res) => {
  try {
    const gateway = await prisma.platform_payment_gateway.findUnique({
      where: {
        provider: "razorpay",
      },
      select: {
        id: true,
        provider: true,
        environment: true,
        status: true,
        connected_at: true,
        created_at: true,
        updated_at: true,
        client_id: true,
        // IMPORTANT:
        // client_secret is intentionally NOT returned
      },
    });

    if (!gateway) {
      return res.json({
        success: true,
        data: {
          provider: "razorpay",
          environment: "test",
          status: "not_configured",
          client_id: "",
          has_client_secret: false,
          connected_at: null,
        },
      });
    }

    // Whether a secret is stored, without ever reading it out
    const withSecret = await prisma.platform_payment_gateway.count({
      where: { provider: "razorpay", client_secret: { not: "" } },
    });

    return res.json({
      success: true,
      data: {
        ...gateway,
        has_client_secret: withSecret > 0,
      },
    });
  } catch (error) {
    console.error("Get payment gateway error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch payment gateway configuration",
    });
  }
};


/**
 * POST /api/super-admin/payment-gateway
 * Create platform payment gateway configuration
 */
const createPaymentGateway = async (req, res) => {
  try {
    const {
      provider = "razorpay",
      environment = "test",
      client_id,
      client_secret,
    } = req.body;

    if (!client_id || !client_secret) {
      return res.status(400).json({
        success: false,
        message: "Client ID and Client Secret are required",
      });
    }

    if (!["test", "live"].includes(environment)) {
      return res.status(400).json({
        success: false,
        message: "Environment must be either test or live",
      });
    }

    const existingGateway =
      await prisma.platform_payment_gateway.findUnique({
        where: {
          provider,
        },
      });

    if (existingGateway) {
      return res.status(409).json({
        success: false,
        message:
          "Payment gateway is already configured. Use update instead.",
      });
    }

    const gateway = await prisma.platform_payment_gateway.create({
      data: {
        provider,
        environment,
        client_id,
        client_secret,
        status: "configured",
      },
      select: {
        id: true,
        provider: true,
        environment: true,
        status: true,
        client_id: true,
        connected_at: true,
        created_at: true,
        updated_at: true,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Payment gateway configured successfully",
      data: {
        ...gateway,
        has_client_secret: true,
      },
    });
  } catch (error) {
    console.error("Create payment gateway error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to configure payment gateway",
    });
  }
};


/**
 * PATCH /api/super-admin/payment-gateway
 * Update platform payment gateway configuration
 */
const updatePaymentGateway = async (req, res) => {
  try {
    const {
      environment,
      client_id,
      client_secret,
      status,
    } = req.body;

    const existingGateway =
      await prisma.platform_payment_gateway.findUnique({
        where: {
          provider: "razorpay",
        },
      });

    if (!existingGateway) {
      return res.status(404).json({
        success: false,
        message: "Payment gateway is not configured yet",
      });
    }

    const updateData = {};

    if (environment !== undefined) {
      if (!["test", "live"].includes(environment)) {
        return res.status(400).json({
          success: false,
          message: "Environment must be either test or live",
        });
      }

      updateData.environment = environment;
    }

    if (client_id !== undefined) {
      updateData.client_id = client_id;
    }

    // Only update secret when a new one is provided.
    if (client_secret) {
      updateData.client_secret = client_secret;
    }

    // New keys or environment are untested until "Test connection" passes;
    // a save that changes none of them keeps the current status
    const keysChanged =
      (updateData.environment !== undefined && updateData.environment !== existingGateway.environment) ||
      (updateData.client_id !== undefined && updateData.client_id !== existingGateway.client_id) ||
      Boolean(updateData.client_secret);
    if (keysChanged) {
      updateData.status = "configured";
      updateData.connected_at = null;
    }

    // "connected" is only ever set by a successful test
    if (status !== undefined) {
      if (!["configured", "disabled"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Status can only be set to configured or disabled",
        });
      }
      updateData.status = status;
    }

    const gateway =
      await prisma.platform_payment_gateway.update({
        where: {
          provider: "razorpay",
        },
        data: updateData,
        select: {
          id: true,
          provider: true,
          environment: true,
          status: true,
          client_id: true,
          connected_at: true,
          created_at: true,
          updated_at: true,
        },
      });

    return res.json({
      success: true,
      message: "Payment gateway updated successfully",
      data: {
        ...gateway,
        has_client_secret: true,
      },
    });
  } catch (error) {
    console.error("Update payment gateway error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update payment gateway",
    });
  }
};


/**
 * POST /api/super-admin/payment-gateway/test
 *
 * NOTE:
 * This endpoint currently only verifies that configuration exists.
 *
 * Actual Razorpay platform/OAuth connection testing will be added
 * after the Razorpay Technology Partner credentials/flow are configured.
 */
// Razorpay key ids start with rzp_test_ or rzp_live_
const keyEnvironment = (keyId) =>
  /^rzp_test_/.test(keyId) ? "test" : /^rzp_live_/.test(keyId) ? "live" : null;

/**
 * POST /api/super-admin/payment-gateway/test
 * Real check: calls Razorpay with the saved keys. On success the gateway is
 * marked "connected"; on rejected keys, "invalid_credentials".
 */
const testPaymentGateway = async (req, res) => {
  try {
    const gateway = await prisma.platform_payment_gateway.findUnique({
      where: { provider: "razorpay" },
    });

    if (!gateway) {
      return res.status(404).json({ success: false, message: "Payment gateway is not configured" });
    }
    if (!gateway.client_id || !gateway.client_secret) {
      return res.status(400).json({ success: false, message: "Payment gateway credentials are incomplete" });
    }

    const keyEnv = keyEnvironment(gateway.client_id);
    if (!keyEnv) {
      return res.status(400).json({ success: false, message: "The Key ID should start with rzp_test_ or rzp_live_." });
    }
    if (keyEnv !== gateway.environment) {
      return res.status(400).json({
        success: false,
        message: `This is a ${keyEnv} key but the environment is set to ${gateway.environment}.`,
      });
    }

    if (typeof fetch !== "function") {
      return res.status(500).json({ success: false, message: "This server cannot make outgoing requests (Node 18+ needed)." });
    }

    const auth = Buffer.from(`${gateway.client_id}:${gateway.client_secret}`).toString("base64");
    let response;
    try {
      response = await fetch("https://api.razorpay.com/v1/payments?count=1", {
        headers: { Authorization: `Basic ${auth}` },
        signal: AbortSignal.timeout(10000),
      });
    } catch (networkError) {
      return res.status(502).json({ success: false, message: "Could not reach Razorpay. Try again in a minute." });
    }

    if (response.status === 401) {
      await prisma.platform_payment_gateway.update({
        where: { provider: "razorpay" },
        data: { status: "invalid_credentials" },
      });
      return res.status(400).json({ success: false, message: "Razorpay rejected these keys. Check the Key ID and Secret." });
    }
    if (!response.ok) {
      return res.status(502).json({ success: false, message: `Razorpay answered with status ${response.status}. Try again later.` });
    }

    const updated = await prisma.platform_payment_gateway.update({
      where: { provider: "razorpay" },
      data: { status: "connected", connected_at: new Date() },
      select: { provider: true, environment: true, status: true, connected_at: true },
    });

    return res.json({
      success: true,
      message: `Connected: Razorpay accepted the ${gateway.environment} keys.`,
      data: updated,
    });
  } catch (error) {
    console.error("Test payment gateway error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to test payment gateway" });
  }
};


module.exports = {
  getPaymentGateway,
  createPaymentGateway,
  updatePaymentGateway,
  testPaymentGateway,
};