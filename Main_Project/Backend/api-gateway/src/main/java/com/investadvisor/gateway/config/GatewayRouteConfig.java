package com.investadvisor.gateway.config;

import com.investadvisor.gateway.filter.AuthenticationFilter;
import org.springframework.cloud.gateway.filter.GatewayFilter;
import org.springframework.cloud.gateway.route.Route;
import org.springframework.cloud.gateway.route.RouteLocator;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.server.RequestPath;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Flux;

import java.net.URI;
import java.util.LinkedList;
import java.util.List;
import java.util.function.Predicate;

@Configuration
public class GatewayRouteConfig {

    @Bean
    public RouteLocator staticRouteLocator(AuthenticationFilter authFilter) {
        GatewayFilter auth = authFilter.apply(new AuthenticationFilter.Config());

        List<Route> routes = new LinkedList<>();

        // /api/auth/** → user-service (no auth filter)
        routes.add(RouteLocatorSupport.builder()
                .id("user-service-auth")
                .uri(URI.create("http://invest_user_svc:8081"))
                .predicate(exchange -> exchange.getRequest().getPath().value().startsWith("/api/auth"))
                .buildRoute());

        // /api/users/** → user-service (with auth)
        routes.add(RouteLocatorSupport.builder()
                .id("user-service")
                .uri(URI.create("http://invest_user_svc:8081"))
                .predicate(exchange -> exchange.getRequest().getPath().value().startsWith("/api/users"))
                .filter(auth)
                .buildRoute());

        // /api/market/** → market-data-service
        routes.add(RouteLocatorSupport.builder()
                .id("market-data-service")
                .uri(URI.create("http://invest_market_svc:8082"))
                .predicate(exchange -> exchange.getRequest().getPath().value().startsWith("/api/market"))
                .filter(auth)
                .buildRoute());

        // /api/portfolios/** → portfolio-service
        routes.add(RouteLocatorSupport.builder()
                .id("portfolio-service")
                .uri(URI.create("http://invest_portfolio_svc:8083"))
                .predicate(exchange -> exchange.getRequest().getPath().value().startsWith("/api/portfolios"))
                .filter(auth)
                .buildRoute());

        // /api/notifications/** → notification-service
        routes.add(RouteLocatorSupport.builder()
                .id("notification-service")
                .uri(URI.create("http://invest_notification_svc:8084"))
                .predicate(exchange -> exchange.getRequest().getPath().value().startsWith("/api/notifications"))
                .filter(auth)
                .buildRoute());

        // /api/ai/** → ai-intelligence-service
        routes.add(RouteLocatorSupport.builder()
                .id("ai-intelligence-service")
                .uri(URI.create("http://fin_multi_agents:8086"))
                .predicate(exchange -> exchange.getRequest().getPath().value().startsWith("/api/ai"))
                .filter(auth)
                .buildRoute());

        return () -> Flux.fromIterable(routes);
    }

    /**
     * Helper to build Route objects without going through RouteLocatorBuilder DSL
     * which has URI parsing issues in Spring Cloud Gateway 4.x.
     */
    private static class RouteLocatorSupport {
        private String id;
        private URI uri;
        private Predicate<ServerWebExchange> predicate;
        private GatewayFilter filter;

        public static RouteLocatorSupport builder() {
            return new RouteLocatorSupport();
        }

        public RouteLocatorSupport id(String id) {
            this.id = id;
            return this;
        }

        public RouteLocatorSupport uri(URI uri) {
            this.uri = uri;
            return this;
        }

        public RouteLocatorSupport predicate(Predicate<ServerWebExchange> predicate) {
            this.predicate = predicate;
            return this;
        }

        public RouteLocatorSupport filter(GatewayFilter filter) {
            this.filter = filter;
            return this;
        }

        public Route buildRoute() {
            Route.AsyncBuilder builder = Route.async()
                    .id(this.id)
                    .uri(this.uri)
                    .predicate(this.predicate);
            if (this.filter != null) {
                builder.filter(this.filter);
            }
            return builder.build();
        }
    }
}
