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

    return res.json({
      success: true,
      data: {
        ...gateway,
        has_client_secret: Boolean(gateway.client_id),
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

    if (status !== undefined) {
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
const testPaymentGateway = async (req, res) => {
  try {
    const gateway =
      await prisma.platform_payment_gateway.findUnique({
        where: {
          provider: "razorpay",
        },
      });

    if (!gateway) {
      return res.status(404).json({
        success: false,
        message: "Payment gateway is not configured",
      });
    }

    if (!gateway.client_id || !gateway.client_secret) {
      return res.status(400).json({
        success: false,
        message: "Payment gateway credentials are incomplete",
      });
    }

    return res.json({
      success: true,
      message:
        "Payment gateway configuration is present. Razorpay connection test will be enabled after platform credentials are configured.",
      data: {
        provider: gateway.provider,
        environment: gateway.environment,
        status: gateway.status,
      },
    });
  } catch (error) {
    console.error("Test payment gateway error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to test payment gateway",
    });
  }
};


module.exports = {
  getPaymentGateway,
  createPaymentGateway,
  updatePaymentGateway,
  testPaymentGateway,
};