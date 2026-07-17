const prisma = require("../config/prisma");
const { Prisma } = require("@prisma/client");


const renewSchoolSubscription = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      amount,
      currency,
      period_months,
      paid_on,
      notes,
      reactivate_school,
    } = req.body;

    const renewalMonths = Number(period_months);

    const renewalAmount =
      amount === undefined || amount === null || amount === ""
        ? null
        : Number(amount);

    if (!Number.isInteger(renewalMonths) || renewalMonths <= 0) {
      return res.status(400).json({
        error: "period_months must be greater than 0.",
      });
    }

    if (renewalAmount !== null && Number.isNaN(renewalAmount)) {
      return res.status(400).json({
        error: "amount must be a valid number.",
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const school = await tx.school.findUnique({
        where: {
          id: BigInt(id),
        },
      });

      if (!school) {
        const error = new Error("School not found");
        error.code = "SCHOOL_NOT_FOUND";
        throw error;
      }

      const today = new Date();

      const baseDate =
        school.expiry_date && school.expiry_date > today
          ? new Date(school.expiry_date)
          : today;

      const nextExpiryDate = new Date(baseDate);
      nextExpiryDate.setMonth(nextExpiryDate.getMonth() + renewalMonths);

      const renewal = await tx.school_subscription_renewal.create({
        data: {
          school_id: BigInt(id),
          amount:
            renewalAmount === null
              ? null
              : new Prisma.Decimal(renewalAmount),
          currency: currency
            ? String(currency).trim().toUpperCase()
            : "INR",
          period_months: renewalMonths,
          paid_on: paid_on ? new Date(paid_on) : new Date(),
          new_expiry_date: nextExpiryDate,
          notes: notes || null,
          created_by: req.staffUser.full_name,
        },
      });

      const schoolUpdateData = {
        expiry_date: nextExpiryDate,
        updated_at: new Date(),
        updated_by: req.staffUser.full_name,
      };

      if (
        reactivate_school === true ||
        reactivate_school === "true"
      ) {
        schoolUpdateData.is_active = true;
        schoolUpdateData.status = "active";
      }

      const updatedSchool = await tx.school.update({
        where: {
          id: BigInt(id),
        },
        data: schoolUpdateData,
        select: {
          id: true,
          name: true,
          is_active: true,
          status: true,
          expiry_date: true,
          plan_type: true,
        },
      });

      return {
        renewal,
        school: updatedSchool,
      };
    });

    return res.status(201).json(
      serializeBigInt({
        message: "School subscription renewed successfully.",
        renewal: result.renewal,
        school: result.school,
      })
    );
  } catch (err) {
    if (err.code === "SCHOOL_NOT_FOUND") {
      return res.status(404).json({
        error: "School not found.",
      });
    }

    console.error("Renew school error:", err);

    return res.status(500).json({
      error: "Failed to renew school subscription.",
    });
  }
};

const getSchoolRenewals = async (req, res) => {
  try {
    const { id } = req.params;

    const renewals = await prisma.school_subscription_renewal.findMany({
      where: {
        school_id: BigInt(id),
      },
      orderBy: {
        created_at: "desc",
      },
    });

    return res.json(
      serializeBigInt({
        renewals,
      })
    );
  } catch (err) {
    console.error("Get renewals error:", err);

    return res.status(500).json({
      error: "Failed to fetch renewal history.",
    });
  }
};

module.exports = {
  renewSchoolSubscription,
  getSchoolRenewals,
};