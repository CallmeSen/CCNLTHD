package com.nhom1.productservice;

import com.nhom1.productservice.integration_test.api.ProductApiIntegrationTestCases;
import com.nhom1.productservice.integration_test.platform.ProductPlatformIntegrationTestCases;
import com.nhom1.productservice.unit_test.controller.ProductControllerUnitTestCases;
import com.nhom1.productservice.unit_test.dto.ProductDtoMapperUnitTestCases;
import com.nhom1.productservice.unit_test.repository.ProductRepositoryUnitTestCases;
import com.nhom1.productservice.unit_test.service.ProductServiceUnitTestCases;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

@DisplayName("Product Service Test Launcher")
class ProductServiceApplicationTests {

	@Test
	void launcherIsReady() {
	}

	@Nested
	@DisplayName("Unit tests by layer")
	class UnitControllerLayer extends ProductControllerUnitTestCases {
	}

	@Nested
	@DisplayName("Unit tests by layer")
	class UnitServiceLayer extends ProductServiceUnitTestCases {
	}

	@Nested
	@DisplayName("Unit tests by layer")
	class UnitRepositoryLayer extends ProductRepositoryUnitTestCases {
	}

	@Nested
	@DisplayName("Unit tests by layer")
	class UnitDtoMapperLayer extends ProductDtoMapperUnitTestCases {
	}

	@Nested
	@DisplayName("Integration tests")
	class IntegrationApi extends ProductApiIntegrationTestCases {
	}

	@Nested
	@DisplayName("Integration tests")
	class IntegrationPlatform extends ProductPlatformIntegrationTestCases {
	}

}
