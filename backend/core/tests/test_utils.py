"""Тесты для core.utils"""
import pytest
from core.utils import normalize_phone


@pytest.mark.parametrize(
    "input_phone,expected",
    [
        ("+996 700 750 606", "996700750606"),
        ("+996700750606", "996700750606"),
        ("996700750606", "996700750606"),
        ("0700750606", "996700750606"),
        ("+996 700 75 06 06", "996700750606"),
        ("+996 557 903 999", "996557903999"),
        ("996 557 903 999", "996557903999"),
        ("", ""),
        ("abc", ""),
        ("123", ""),
    ],
)
def test_normalize_phone(input_phone, expected):
    assert normalize_phone(input_phone) == expected
