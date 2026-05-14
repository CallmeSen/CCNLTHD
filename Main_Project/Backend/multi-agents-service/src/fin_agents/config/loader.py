"""Configuration loader utilities."""
import os
from typing import Any, Dict

import yaml


def _find_config_root() -> str:
    """Locate the config/ directory relative to this file.

    loader.py is at src/fin_agents/config/loader.py
    config/ is a sibling of src/ at the project root (4 levels up).
    """
    return os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))),
        "config",
    )


def load_agents_config() -> Dict[str, Any]:
    """Load agents.yaml and return the parsed dict."""
    path = os.path.join(_find_config_root(), "agents.yaml")
    with open(path, encoding="utf-8") as f:
        return yaml.safe_load(f)


def load_main_config() -> Dict[str, Any]:
    """Load config.yaml and return the parsed dict."""
    path = os.path.join(_find_config_root(), "config.yaml")
    with open(path, encoding="utf-8") as f:
        return yaml.safe_load(f)


def load_risk_bands() -> Dict[str, Any]:
    """Load risk_bands.yaml and return the parsed dict."""
    path = os.path.join(_find_config_root(), "risk_bands.yaml")
    with open(path, encoding="utf-8") as f:
        return yaml.safe_load(f)
