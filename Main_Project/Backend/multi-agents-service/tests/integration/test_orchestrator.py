"""
Integration tests for the OrchestratorService.
Imports are hoisted into individual tests to avoid loading the DB layer at collection time.
"""
import pytest
from unittest.mock import patch, MagicMock


class TestOrchestratorServiceInit:
    """Test OrchestratorService initialization."""

    def test_init_with_db(self, mock_db):
        from src.fin_agents.core.orchestrator import OrchestratorService
        service = OrchestratorService(mock_db)
        assert service.db is mock_db


class TestRunStockWorkflow:
    """Test the main stock workflow execution."""

    @patch("src.fin_agents.core.orchestrator.OrchestratorService._save_portfolio_file")
    @patch("src.fin_agents.core.orchestrator.OrchestratorService._save_report_file")
    @patch("src.fin_agents.core.orchestrator.OrchestratorService._load_stock_graph")
    @patch("src.fin_agents.core.orchestrator._ensure_storage")
    @patch("src.fin_agents.core.orchestrator.AdvisoryRequestRepository.create")
    @patch("src.fin_agents.core.orchestrator.AdvisoryRequestRepository.update_status")
    @patch("src.fin_agents.core.orchestrator.RiskAssessmentRepository.create")
    @patch("src.fin_agents.core.orchestrator.GeneratedReportRepository.create")
    @patch("src.fin_agents.core.orchestrator._log_audit")
    def test_successful_workflow(
        self,
        mock_audit,
        mock_gen_repo,
        mock_risk_repo,
        mock_update_status,
        mock_create_req,
        mock_ensure,
        mock_load_graph,
        mock_save_report,
        mock_save_portfolio,
        mock_db,
        sample_state,
        sample_portfolio,
        sample_metrics,
    ):
        from src.fin_agents.core.orchestrator import OrchestratorService

        mock_graph = MagicMock()
        mock_graph.stream.return_value = [
            {"structure_output": {
                "final_report": "# Report\nPortfolio generated successfully.",
                "user_profile": sample_state["user_profile"],
                "proposed_portfolio": sample_portfolio,
                "metrics": sample_metrics,
                "validation_result": {"status": "pass"},
            }}
        ]
        mock_load_graph.return_value = mock_graph

        service = OrchestratorService(mock_db)
        result = service.run_stock_workflow(
            initial_request="Build a retirement portfolio",
            lang="en",
        )

        assert result["status"] == "completed"
        assert result["run_id"].startswith("STK")
        assert result["final_report"] is not None
        assert "user_profile" in result

    @patch("src.fin_agents.core.orchestrator.OrchestratorService._save_portfolio_file")
    @patch("src.fin_agents.core.orchestrator.OrchestratorService._save_report_file")
    @patch("src.fin_agents.core.orchestrator.OrchestratorService._load_stock_graph")
    @patch("src.fin_agents.core.orchestrator._ensure_storage")
    @patch("src.fin_agents.core.orchestrator.AdvisoryRequestRepository.create")
    @patch("src.fin_agents.core.orchestrator._log_audit")
    def test_workflow_failure_returns_failed_status(
        self,
        mock_audit,
        mock_create_req,
        mock_ensure,
        mock_load_graph,
        mock_save_report,
        mock_save_portfolio,
        mock_db,
    ):
        from src.fin_agents.core.orchestrator import OrchestratorService

        mock_graph = MagicMock()
        mock_graph.stream.side_effect = Exception("Network timeout")
        mock_load_graph.return_value = mock_graph

        service = OrchestratorService(mock_db)
        result = service.run_stock_workflow(
            initial_request="Build portfolio",
            lang="en",
        )

        assert result["status"] == "failed"
        assert result["error"] is not None
        assert "Network timeout" in result["error"]

    @patch("src.fin_agents.core.orchestrator.OrchestratorService._save_portfolio_file")
    @patch("src.fin_agents.core.orchestrator.OrchestratorService._save_report_file")
    @patch("src.fin_agents.core.orchestrator.OrchestratorService._load_stock_graph")
    @patch("src.fin_agents.core.orchestrator._ensure_storage")
    @patch("src.fin_agents.core.orchestrator.AdvisoryRequestRepository.create")
    @patch("src.fin_agents.core.orchestrator._log_audit")
    def test_workflow_with_custom_request_id(
        self,
        mock_audit,
        mock_create_req,
        mock_ensure,
        mock_load_graph,
        mock_save_report,
        mock_save_portfolio,
        mock_db,
    ):
        from src.fin_agents.core.orchestrator import OrchestratorService

        mock_graph = MagicMock()
        mock_graph.stream.return_value = [
            {"result": {"final_report": "# Report"}}
        ]
        mock_load_graph.return_value = mock_graph

        service = OrchestratorService(mock_db)
        result = service.run_stock_workflow(
            initial_request="Test",
            request_id="CUSTOM001",
        )
        assert result["run_id"] == "CUSTOM001"

    @patch("src.fin_agents.core.orchestrator.OrchestratorService._save_portfolio_file")
    @patch("src.fin_agents.core.orchestrator.OrchestratorService._save_report_file")
    @patch("src.fin_agents.core.orchestrator.OrchestratorService._load_stock_graph")
    @patch("src.fin_agents.core.orchestrator._ensure_storage")
    @patch("src.fin_agents.core.orchestrator.AdvisoryRequestRepository.create")
    @patch("src.fin_agents.core.orchestrator._log_audit")
    def test_workflow_no_report_generated(
        self,
        mock_audit,
        mock_create_req,
        mock_ensure,
        mock_load_graph,
        mock_save_report,
        mock_save_portfolio,
        mock_db,
    ):
        from src.fin_agents.core.orchestrator import OrchestratorService

        mock_graph = MagicMock()
        # Stream returns a node with final_report=None
        mock_graph.stream.return_value = [
            {"result": {"final_report": None}}
        ]
        mock_load_graph.return_value = mock_graph

        service = OrchestratorService(mock_db)
        result = service.run_stock_workflow(initial_request="Test")
        assert result["status"] == "failed"


class TestPersistHelpers:
    """Test the persistence helper methods."""

    @patch("src.fin_agents.core.orchestrator.RiskAssessmentRepository.create")
    @patch("src.fin_agents.core.orchestrator.GeneratedReportRepository.create")
    def test_persist_with_portfolio(self, mock_gen, mock_risk, mock_db):
        from src.fin_agents.core.orchestrator import OrchestratorService
        service = OrchestratorService(mock_db)
        service._persist_stock_result("REQ001", {
            "proposed_portfolio": {"AAPL": 0.5, "MSFT": 0.5},
            "final_report": "# Report",
            "metrics": {"sharpe_ratio": 0.5},
            "user_profile": {},
        })
        mock_risk.assert_called_once()
        mock_gen.assert_called_once()

    @patch("src.fin_agents.core.orchestrator.RiskAssessmentRepository.create")
    @patch("src.fin_agents.core.orchestrator.GeneratedReportRepository.create")
    def test_persist_without_portfolio(self, mock_gen, mock_risk, mock_db):
        from src.fin_agents.core.orchestrator import OrchestratorService
        service = OrchestratorService(mock_db)
        service._persist_stock_result("REQ002", {
            "proposed_portfolio": None,
            "final_report": "# Report",
        })
        mock_risk.assert_not_called()
        mock_gen.assert_called_once()

    @patch("src.fin_agents.core.orchestrator.RiskAssessmentRepository.create")
    @patch("src.fin_agents.core.orchestrator.GeneratedReportRepository.create")
    def test_persist_without_report(self, mock_gen, mock_risk, mock_db):
        from src.fin_agents.core.orchestrator import OrchestratorService
        service = OrchestratorService(mock_db)
        service._persist_stock_result("REQ003", {
            "proposed_portfolio": None,
            "final_report": None,
        })
        mock_risk.assert_not_called()
        mock_gen.assert_not_called()


class TestSaveFileHelpers:
    """Test file save helpers."""

    def test_save_report_file(self, mock_db, tmp_storage, monkeypatch):
        import src.fin_agents.core.orchestrator as orch_mod
        monkeypatch.setattr(orch_mod, "STORAGE_REPORTS", str(tmp_storage / "reports"))
        from src.fin_agents.core.orchestrator import OrchestratorService
        service = OrchestratorService(mock_db)
        service._save_report_file("TEST001", "# Test Report\nContent here.")
        report_path = tmp_storage / "reports" / "TEST001.md"
        assert report_path.exists()
        content = open(report_path).read()
        assert "# Test Report" in content

    def test_save_report_file_empty_content(self, mock_db, tmp_storage, monkeypatch):
        import src.fin_agents.core.orchestrator as orch_mod
        monkeypatch.setattr(orch_mod, "STORAGE_REPORTS", str(tmp_storage / "reports"))
        from src.fin_agents.core.orchestrator import OrchestratorService
        service = OrchestratorService(mock_db)
        service._save_report_file("TEST002", "")
        report_path = tmp_storage / "reports" / "TEST002.md"
        assert report_path.exists()

    def test_save_portfolio_file(self, mock_db, tmp_storage, monkeypatch, sample_portfolio):
        import src.fin_agents.core.orchestrator as orch_mod
        monkeypatch.setattr(orch_mod, "STORAGE_PORTFOLIOS", str(tmp_storage / "portfolios"))
        from src.fin_agents.core.orchestrator import OrchestratorService
        service = OrchestratorService(mock_db)
        service._save_portfolio_file("TEST003", sample_portfolio)
        portfolio_path = tmp_storage / "portfolios" / "TEST003_context.json"
        assert portfolio_path.exists()
        import json
        with open(portfolio_path) as f:
            data = json.load(f)
        assert data["AAPL"] == 0.4

    def test_save_portfolio_file_skipped_when_none(self, mock_db, tmp_storage, monkeypatch):
        import src.fin_agents.core.orchestrator as orch_mod
        monkeypatch.setattr(orch_mod, "STORAGE_PORTFOLIOS", str(tmp_storage / "portfolios"))
        from src.fin_agents.core.orchestrator import OrchestratorService
        service = OrchestratorService(mock_db)
        service._save_portfolio_file("TEST004", None)
        portfolio_path = tmp_storage / "portfolios" / "TEST004_context.json"
        assert not portfolio_path.exists()


class TestLogAudit:
    """Test the module-level _log_audit helper."""

    def test_log_audit_success(self, mock_db):
        from src.fin_agents.core.orchestrator import _log_audit
        _log_audit(mock_db, "REQ001", "orchestrator", "WORKFLOW_START", {"key": "value"})

    def test_log_audit_db_error_swallowed(self, mock_db):
        from src.fin_agents.core.orchestrator import _log_audit
        with patch(
            "src.fin_agents.db.repositories.AuditLogRepository.log",
            side_effect=Exception("DB error"),
        ):
            _log_audit(mock_db, "REQ001", "agent", "ACTION", {})


class TestUpdateStatus:
    """Test status update helper."""

    @patch("src.fin_agents.core.orchestrator.AdvisoryRequestRepository.update_status")
    def test_update_status(self, mock_update, mock_db):
        from src.fin_agents.core.orchestrator import OrchestratorService
        service = OrchestratorService(mock_db)
        service._update_status("REQ001", "COMPLETED")
        mock_update.assert_called_once_with(mock_db, "REQ001", "COMPLETED")
