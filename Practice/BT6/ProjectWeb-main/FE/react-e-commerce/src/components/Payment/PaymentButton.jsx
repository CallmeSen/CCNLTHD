// src/components/PaymentButton.jsx
import React from 'react';
import { createPaymentUrl } from '../services/paymentService';

const PaymentButton = ({ orderId }) => {
    const handlePayment = async () => {
        try {
            const response = await createPaymentUrl(orderId);
            if (response && response.data && response.data.paymentUrl) {
                window.location.href = response.data.paymentUrl; // Redirect đến VNPay
            } else {
                alert('Không thể tạo link thanh toán VNPay');
            }
        } catch (error) {
            console.error('Thanh toán lỗi', error);
            alert('Thanh toán thất bại!');
        }
    };

    return (
        <button onClick={handlePayment} className="btn btn-primary">
            Thanh toán VNPay
        </button>
    );
};

export default PaymentButton;
