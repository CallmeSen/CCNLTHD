package vn.tt.practice.orderservice.model;

import java.util.Arrays;

public enum PaymentMethod {
    CASH_ON_DELIVERY("COD"),
    CREDIT_CARD("CREDIT_CARD"),
    PAYPAL("PAYPAL"),
    VNPAY("VNPAY"),
    MOMO("MOMO"),
    ZALO_PAY("ZALO_PAY");

    private final String code;

    PaymentMethod(String code) {
        this.code = code;
    }

    public static PaymentMethod fromCode(String code) {
        return Arrays.stream(values())
                .filter(m -> m.code.equalsIgnoreCase(code))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Invalid payment method code: " + code));
    }
}

