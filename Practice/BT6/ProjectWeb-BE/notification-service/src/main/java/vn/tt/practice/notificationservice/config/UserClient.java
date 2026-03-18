package vn.tt.practice.notificationservice.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
public class UserClient {
    private final RestTemplate restTemplate;

    @Value("${user-service.base-url}")
    private String userServiceBaseUrl;

    public UserClient(RestTemplateBuilder builder) {
        this.restTemplate = builder.build();
    }

    public String getEmailByUserId(String userId) {
        try {
            String url = userServiceBaseUrl + "/v1/api/user/" + userId + "/email";
            return restTemplate.getForObject(url, String.class);
        } catch (Exception e) {
            return null;
        }
    }


}
