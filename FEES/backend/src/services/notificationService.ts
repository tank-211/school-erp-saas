import prisma from '../config/database';
import { NotFoundError } from '../middleware/errorHandler';
import logger from '../config/logger';

/**
 * No SMS or WhatsApp provider is connected yet. Instead of logging a message
 * and reporting it as sent, the request fails with 503 and says so.
 * Connect a provider (e.g. MSG91, Twilio, WhatsApp Business API) in send().
 */
class ProviderNotConfiguredError extends Error {
  status = 503;
  code = 'PROVIDER_NOT_CONFIGURED';
  constructor(channel: 'sms' | 'whatsapp') {
    super(`${channel === 'sms' ? 'SMS' : 'WhatsApp'} is not set up yet: no provider is connected, so nothing was sent.`);
    this.name = 'ProviderNotConfiguredError';
  }
}

const send = async (channel: 'sms' | 'whatsapp', _phone: string, _message: string): Promise<never> => {
  throw new ProviderNotConfiguredError(channel);
};

export class NotificationService {
  async sendWhatsAppNotification(invoiceId: string, schoolId: string) {
    const invoice = await prisma.invoice.findFirst({
      where: { id: BigInt(invoiceId), school_id: BigInt(schoolId) },
      include: {
        student: {
          select: {
            first_name: true,
            middle_name: true,
            last_name: true,
            phone: true,

            parent_detail: {
              select: {
                phone: true,
              },
            },
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundError(
        'Invoice not found'
      );
    }

    const student = invoice.student;

    const parentPhone =
      student.parent_detail?.[0]?.phone;

    const phone =
      parentPhone || student.phone;

    if (!phone) {
      throw new NotFoundError(
        'No phone number found for this student'
      );
    }

    const studentName = [
      student.first_name,
      student.middle_name,
      student.last_name,
    ]
      .filter(Boolean)
      .join(' ');

    const totalAmount =
      Number(invoice.total_amount);

    const amountPaid =
      Number(invoice.paid_amount ?? 0);

    const pending =
      Number(invoice.pending_amount) ||
      Math.max(
        0,
        totalAmount - amountPaid
      );

    const message =
      `Hello ${studentName}, your pending fee is ₹${pending.toLocaleString('en-IN')}. Please pay soon.`;

    return send('whatsapp', phone, message);
  }

  async sendSMSNotification(invoiceId: string, schoolId: string) {
    const invoice = await prisma.invoice.findFirst({
      where: { id: BigInt(invoiceId), school_id: BigInt(schoolId) },
      include: {
        student: {
          select: {
            first_name: true,
            middle_name: true,
            last_name: true,
            phone: true,

            parent_detail: {
              select: {
                phone: true,
              },
            },
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundError(
        'Invoice not found'
      );
    }

    const student = invoice.student;

    const parentPhone =
      student.parent_detail?.[0]?.phone;

    const phone =
      parentPhone || student.phone;

    if (!phone) {
      throw new NotFoundError(
        'No phone number found for this student'
      );
    }

    const studentName = [
      student.first_name,
      student.middle_name,
      student.last_name,
    ]
      .filter(Boolean)
      .join(' ');

    const totalAmount =
      Number(invoice.total_amount);

    const amountPaid =
      Number(invoice.paid_amount ?? 0);

    const pending =
      Number(invoice.pending_amount) ||
      Math.max(
        0,
        totalAmount - amountPaid
      );

    const message =
      `Hello ${studentName}, your pending fee is Rs.${pending.toLocaleString('en-IN')}. Please pay soon.`;

    return send('sms', phone, message);
  }

  async sendBulkNotification(data: {
    schoolId: string;
    channel:
      | 'whatsapp'
      | 'sms';

    invoiceIds: string[];

    message?: string;
  }) {
    const results: Array<{
      invoiceId: string;
      success: boolean;
      data?: any;
      error?: string;
    }> = [];

    for (
      const invoiceId of data.invoiceIds
    ) {
      try {
        let result;

        if (
          data.channel === 'whatsapp'
        ) {
          result =
            await this.sendWhatsAppNotification(
              invoiceId, data.schoolId
            );
        } else {
          result =
            await this.sendSMSNotification(
              invoiceId, data.schoolId
            );
        }

        results.push({
          invoiceId,
          success: true,
          data: result,
        });
      } catch (error: any) {
        results.push({
          invoiceId,
          success: false,
          error:
            error.message,
        });
      }
    }

    const successCount =
      results.filter(
        (result) =>
          result.success
      ).length;

    const failureCount =
      results.filter(
        (result) =>
          !result.success
      ).length;

    logger.info(
      'Bulk notification sent',
      {
        channel:
          data.channel,
        total:
          results.length,
        success:
          successCount,
        failed:
          failureCount,
      }
    );

    return {
      success: successCount > 0,
      channel:
        data.channel,
      total:
        results.length,
      successCount,
      failureCount,
      results,
    };
  }
}

export default new NotificationService();
