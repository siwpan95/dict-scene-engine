"""重构冒烟测试：装好引擎（pip install -r requirements.txt）后，
本内容工程可加载、可校验、可玩。

运行：pip install pytest && pytest tests-py/ -q
"""

from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parent.parent


@pytest.fixture(autouse=True)
def _clean_scripted_input(monkeypatch):
    """play 会写 DSE_INPUT 环境变量；用例间隔离，避免互相污染。"""
    monkeypatch.delenv("DSE_INPUT", raising=False)


def test_check_passes(capsys):
    from dse_core.cli import main

    assert main(["check", "--root", str(REPO)]) == 0
    assert "587 场景" in capsys.readouterr().out


def test_doctor_healthy(capsys):
    from dse_core.cli import main

    assert main(["doctor", "--root", str(REPO)]) == 0
    assert "健康" in capsys.readouterr().out


def test_scripted_playthrough(capsys):
    from dse_core.cli import main

    assert main(["play", "--root", str(REPO), "--input", "1,1,quit"]) == 0
    out = capsys.readouterr().out
    assert "村庄 · 晨雾" in out          # 入口场景渲染 + 状态插值
    assert "游戏已退出" in out            # 正常收尾


def test_trade_line_playthrough(capsys):
    """经营线：进货 → 出货 → 过完 5 天 → 收市结算。"""
    from dse_core.cli import main

    code = main(["play", "--root", str(REPO), "--entry", "town.shop",
                 "--input", "buy tea 2,sell tea,next,next,next,next,next,quit"])
    assert code == 0
    assert "收市" in capsys.readouterr().out
