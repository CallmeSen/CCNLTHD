package com.nhom1.inventory_service;

import com.nhom1.inventory_service.integration_test.api.InventoryApiIntegrationTestCases;
import com.nhom1.inventory_service.integration_test.platform.InventoryPlatformIntegrationTestCases;
import com.nhom1.inventory_service.unit_test.controller.InventoryControllerUnitTestCases;
import com.nhom1.inventory_service.unit_test.dto.InventoryDtoMapperUnitTestCases;
import com.nhom1.inventory_service.unit_test.repository.InventoryRepositoryUnitTestCases;
import com.nhom1.inventory_service.unit_test.service.InventoryServiceUnitTestCases;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

@DisplayName("Inventory Service Test Launcher")
class InventoryServiceApplicationTests {

	@Test
	void launcherIsReady() {
	}

	@Nested
	@DisplayName("Unit tests by layer")
	class UnitControllerLayer extends InventoryControllerUnitTestCases {
	}

	@Nested
	@DisplayName("Unit tests by layer")
	class UnitServiceLayer extends InventoryServiceUnitTestCases {
	}

	@Nested
	@DisplayName("Unit tests by layer")
	class UnitRepositoryLayer extends InventoryRepositoryUnitTestCases {
	}

	@Nested
	@DisplayName("Unit tests by layer")
	class UnitDtoMapperLayer extends InventoryDtoMapperUnitTestCases {
	}

	@Nested
	@DisplayName("Integration tests")
	class IntegrationApi extends InventoryApiIntegrationTestCases {
	}

	@Nested
	@DisplayName("Integration tests")
	class IntegrationPlatform extends InventoryPlatformIntegrationTestCases {
	}

}
