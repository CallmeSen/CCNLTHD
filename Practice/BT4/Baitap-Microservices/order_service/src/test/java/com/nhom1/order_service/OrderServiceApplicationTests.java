package com.nhom1.order_service;

import org.junit.platform.suite.api.SelectPackages;
import org.junit.platform.suite.api.Suite;

@Suite
@SelectPackages({"unit_test", "integration_test"})
class OrderServiceApplicationTests {

}
