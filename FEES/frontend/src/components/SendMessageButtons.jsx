import React, { useState } from 'react';
import { FaWhatsapp } from 'react-icons/fa';
import { MdMessage } from 'react-icons/md';
import { sendWhatsAppMessage, sendSMSMessage } from '../services/apiService';

const SendMessageButtons = ({ invoiceId }) => {
  const [loading, setLoading] = useState({ whatsapp: false, sms: false });

  const handleSend = async (type) => {
    setLoading((prev) => ({ ...prev, [type]: true }));
    let result;
    if (type === 'whatsapp') {
      result = await sendWhatsAppMessage(invoiceId);
    } else {
      result = await sendSMSMessage(invoiceId);
    }
    setLoading((prev) => ({ ...prev, [type]: false }));
    window.alert(result.message); // Replace with toast/snackbar if available
  };

  return (
    <div className="flex gap-2 items-center">
      <button
        className="p-2 rounded-full hover:bg-green-50 text-green-600"
        title="Send WhatsApp"
        aria-label="Send WhatsApp"
        disabled={loading.whatsapp}
        onClick={() => handleSend('whatsapp')}
        type="button"
      >
        <FaWhatsapp size={20} />
      </button>
      <button
        className="p-2 rounded-full hover:bg-blue-50 text-blue-600"
        title="Send SMS"
        aria-label="Send SMS"
        disabled={loading.sms}
        onClick={() => handleSend('sms')}
        type="button"
      >
        <MdMessage size={20} />
      </button>
    </div>
  );
};

export default SendMessageButtons;
