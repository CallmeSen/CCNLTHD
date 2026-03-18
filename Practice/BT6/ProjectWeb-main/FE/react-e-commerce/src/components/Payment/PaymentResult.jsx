// src/pages/PaymentResult.jsx
import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

const PaymentResult = () => {
    const { search } = useLocation();
    const [result, setResult] = useState('');

    useEffect(() => {
        const params = new URLSearchParams(search);
        const responseCode = params.get('vnp_ResponseCode');

        if (responseCode === '00') {
            setResult('Thanh toán thành công!');
        } else {
            setResult('Thanh toán thất bại hoặc bị hủy.');
        }
    }, [search]);

    return (
        <div className="payment-result">
            <h2>Kết quả thanh toán</h2>
            <p>{result}</p>
        </div>
    );
};

export default PaymentResult;
