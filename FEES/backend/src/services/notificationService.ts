import prisma from '../config/database';
import { NotFoundError } from '../middleware/errorHandler';
import logger from '../config/logger';

import { sendSchoolMessage, schoolChannelEnabled, ChannelNotSetUpError } from './schoolMessenger';

/**
 * Fee reminders go out through the school's own SMS / WhatsApp account
 * (Super Admin → Schools → Communication). A school without one gets a clear
 * 409 "not set up"; nothing is reported as sent unless the provider took it.
 */
const send = async (channel: 'sms' | 'whatsapp', phone: string, message: string, schoolId: string, invoiceId: string) => {
  const result = await sendSchoolMessage(schoolId, channel, phone, message);
  logger.info(`${channel} fee message sent`, { invoiceId, provider: result.provider });
  return { invoiceId, channel, status: 'sent', messageId: result.messageId, sentAt: new Date().toISOString() };
};

const feeMessage = (studentName: string, pending: number, total: number, rupee: string) =>
  pending > 0
    ? `Hello ${studentName}, your pending fee is ${rupee}${pending.toLocaleString('en-IN')}. Please pay soon.`
    : `Hello ${studentName}, your fee of ${rupee}${total.toLocaleString('en-IN')} has been paid. Thank you!`;

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

    const message = feeMessage(studentName, pending, totalAmount, '₹');

    return send('whatsapp', phone, message, schoolId, invoiceId);
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

    // SMS: "Rs." because DLT templates and some phones handle the ₹ sign badly
    const message = feeMessage(studentName, pending, totalAmount, 'Rs.');

    return send('sms', phone, message, schoolId, invoiceId);
  }

  async sendBulkNotification(data: {
    schoolId: string;
    channel:
      | 'whatsapp'
      | 'sms';

    invoiceIds: string[];

    message?: string;
  }) {
    // Nothing is attempted when the school has not set up this channel
    if (!(await schoolChannelEnabled(data.schoolId, data.channel))) {
      throw new ChannelNotSetUpError(data.channel);
    }

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
