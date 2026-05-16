package com.investadvisor.gateway.config;

import com.investadvisor.gateway.filter.AuthenticationFilter;
import org.springframework.cloud.gateway.route.RouteLocator;
import org.springframework.cloud.gateway.route.builder.RouteLocatorBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class GatewayRouteConfig {

    private static final String USER_SVC = "http://user-service:8081";
    private static final String MARKET_SVC = "http://market-data-service:8082";
    private static final String PORTFOLIO_SVC = "http://portfolio-service:8083";
    private static final String NOTIFY_SVC = "http://notification-service:8084";
    private static final String AI_SVC = "http://multi-agents-service:8086";

    @Bean
    public RouteLocator customRouteLocator(
            RouteLocatorBuilder builder,
            AuthenticationFilter authFilter) {

        return builder.routes()
                // /api/auth/** → user-service (no auth)
                .route("user-service-auth", r -> r
                        .path("/api/auth/**")
                        .uri(USER_SVC))

                // /api/users/** → user-service (with auth)
                .route("user-service", r -> r
                        .path("/api/users/**")
                        .filters(f -> f.filter(authFilter.apply(new AuthenticationFilter.Config())))
                        .uri(USER_SVC))

                // /api/market/** → market-data-service
                .route("market-data-service", r -> r
                        .path("/api/market/**")
                        .filters(f -> f.filter(authFilter.apply(new AuthenticationFilter.Config())))
                        .uri(MARKET_SVC))

                // /api/portfolios/** → portfolio-service
                .route("portfolio-service", r -> r
                        .path("/api/portfolios/**")
                        .filters(f -> f.filter(authFilter.apply(new AuthenticationFilter.Config())))
                        .uri(PORTFOLIO_SVC))

                // /api/notifications/** → notification-service
                .route("notification-service", r -> r
                        .path("/api/notifications/**")
                        .filters(f -> f.filter(authFilter.apply(new AuthenticationFilter.Config())))
                        .uri(NOTIFY_SVC))

                // /api/ai/** → ai-intelligence-service
                .route("ai-intelligence-service", r -> r
                        .path("/api/ai/**")
                        .filters(f -> f
                                .filter(authFilter.apply(new AuthenticationFilter.Config()))
                                .rewritePath("/api/ai/?(?<remaining>.*)", "/${remaining}"))
                        .uri(AI_SVC))

                .build();
    }
}
