package vn.tt.practice.paymentservice.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.bson.json.JsonObject;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.tt.practice.paymentservice.config.PaymentConfig;
import vn.tt.practice.paymentservice.dto.Request;

import java.io.IOException;
import java.io.UnsupportedEncodingException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.*;

@RestController
@RequestMapping("/v1/api/payment")
public class PaymentController {

    @GetMapping("/create-payment")
    public ResponseEntity<?> createPayment(
            @RequestParam("amount") long amount,
//            @RequestParam(required = false) String bankCode,
//            @RequestParam(required = false, defaultValue = "vn") String language,
            HttpServletRequest req) throws UnsupportedEncodingException {
        String vnp_Version = "2.1.0";
        String vnp_Command = "pay";
        String orderType = "other";
//        long amount = Integer.parseInt(req.getParameter("amount"))*100;
//        String bankCode = req.getParameter("bankCode");

        String vnp_TxnRef = PaymentConfig.getRandomNumber(8);
        String vnp_IpAddr = PaymentConfig.getIpAddress(req);

        String vnp_TmnCode = PaymentConfig.vnp_TmnCode;

        Map<String, String> vnp_Params = new HashMap<>();
        vnp_Params.put("vnp_Version", vnp_Version);
        vnp_Params.put("vnp_Command", vnp_Command);
        vnp_Params.put("vnp_TmnCode", vnp_TmnCode);
        vnp_Params.put("vnp_Amount", String.valueOf(amount));
        vnp_Params.put("vnp_CurrCode", "VND");

//        if (bankCode != null && !bankCode.isEmpty()) {
//            vnp_Params.put("vnp_BankCode", bankCode);
//        }
        vnp_Params.put("vnp_TxnRef", vnp_TxnRef);
        vnp_Params.put("vnp_OrderInfo", "Thanh toan don hang:" + vnp_TxnRef);
        vnp_Params.put("vnp_OrderType", orderType);

        String locate = req.getParameter("language");
        if (locate != null && !locate.isEmpty()) {
            vnp_Params.put("vnp_Locale", locate);
        } else {
            vnp_Params.put("vnp_Locale", "vn");
        }
        vnp_Params.put("vnp_ReturnUrl", PaymentConfig.vnp_ReturnUrl);
        vnp_Params.put("vnp_IpAddr", vnp_IpAddr);

        Calendar cld = Calendar.getInstance(TimeZone.getTimeZone("Etc/GMT+7"));
        SimpleDateFormat formatter = new SimpleDateFormat("yyyyMMddHHmmss");
        String vnp_CreateDate = formatter.format(cld.getTime());
        vnp_Params.put("vnp_CreateDate", vnp_CreateDate);

        cld.add(Calendar.MINUTE, 15);
        String vnp_ExpireDate = formatter.format(cld.getTime());
        vnp_Params.put("vnp_ExpireDate", vnp_ExpireDate);

        List fieldNames = new ArrayList(vnp_Params.keySet());
        Collections.sort(fieldNames);
        StringBuilder hashData = new StringBuilder();
        StringBuilder query = new StringBuilder();
        Iterator itr = fieldNames.iterator();
        while (itr.hasNext()) {
            String fieldName = (String) itr.next();
            String fieldValue = (String) vnp_Params.get(fieldName);
            if ((fieldValue != null) && (fieldValue.length() > 0)) {
                //Build hash data
                hashData.append(fieldName);
                hashData.append('=');
                hashData.append(URLEncoder.encode(fieldValue, StandardCharsets.US_ASCII.toString()));
                //Build query
                query.append(URLEncoder.encode(fieldName, StandardCharsets.US_ASCII.toString()));
                query.append('=');
                query.append(URLEncoder.encode(fieldValue, StandardCharsets.US_ASCII.toString()));
                if (itr.hasNext()) {
                    query.append('&');
                    hashData.append('&');
                }
            }
        }
        String queryUrl = query.toString();
        String vnp_SecureHash = PaymentConfig.hmacSHA512(PaymentConfig.secretKey, hashData.toString());
        queryUrl += "&vnp_SecureHash=" + vnp_SecureHash;
        String paymentUrl = PaymentConfig.vnp_PayUrl + "?" + queryUrl;

        Map<String, Object> result = new HashMap<>();
        result.put("code", "00");
        result.put("message", "Payment successful");
        result.put("url", paymentUrl);

        return ResponseEntity.ok().body(result);
    }

    @GetMapping("/payment-return")
    public void paymentReturn(HttpServletRequest request, HttpServletResponse response) throws IOException {
        Map<String, String[]> fields = request.getParameterMap();
        Map<String, String> vnpParams = new HashMap<>();
        for (Map.Entry<String, String[]> entry : fields.entrySet()) {
            vnpParams.put(entry.getKey(), entry.getValue()[0]);
        }

        String vnp_SecureHash = vnpParams.remove("vnp_SecureHash");
        String vnp_SecureHashType = vnpParams.remove("vnp_SecureHashType"); // optional

        // Tạo hash từ các param (trừ vnp_SecureHash) để đối chiếu
        String calculatedHash = PaymentConfig.hashAllFields(vnpParams);

        if (vnp_SecureHash != null && vnp_SecureHash.equals(calculatedHash)) {
            String responseCode = vnpParams.get("vnp_ResponseCode");

            if ("00".equals(responseCode)) {
                response.sendRedirect("http://localhost:5173/payment/result?vnp_ResponseCode=00");
            } else {
                response.sendRedirect("http://localhost:5173/payment/result?vnp_ResponseCode=" + responseCode);
            }
        } else {
            // ❌ Sai hash, không xác minh được danh tính VNPay
            response.sendRedirect("http://localhost:5173/payment/fail?error=invalid-signature");
        }
    }

}



