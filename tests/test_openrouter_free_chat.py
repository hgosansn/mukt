import io
import json
import os
import sys
import unittest
import urllib.error
from contextlib import redirect_stderr, redirect_stdout
from unittest.mock import patch

from scripts import openrouter_free_chat as skill


class OpenRouterFreeChatTests(unittest.TestCase):
    def test_is_free_model_true(self) -> None:
        model = {"pricing": {"prompt": "0", "completion": "0"}}
        self.assertTrue(skill.is_free_model(model))

    def test_is_free_model_false(self) -> None:
        model = {"pricing": {"prompt": "0.0001", "completion": "0"}}
        self.assertFalse(skill.is_free_model(model))

    def test_extract_text_from_string_content(self) -> None:
        payload = {"choices": [{"message": {"content": "  hello world  "}}]}
        self.assertEqual(skill.extract_text(payload), "hello world")

    def test_extract_text_from_list_content(self) -> None:
        payload = {
            "choices": [
                {
                    "message": {
                        "content": [
                            {"type": "text", "text": "one"},
                            {"type": "text", "text": "two"},
                        ]
                    }
                }
            ]
        }
        self.assertEqual(skill.extract_text(payload), "one\ntwo")

    @patch.object(skill, "openrouter_get")
    def test_ranked_free_models_filters_and_sorts(self, mock_get) -> None:
        mock_get.return_value = {
            "data": [
                {
                    "id": "best:free",
                    "pricing": {"prompt": "0", "completion": "0"},
                    "supported_parameters": ["structured_outputs", "temperature"],
                    "context_length": 120000,
                },
                {
                    "id": "paid-model",
                    "pricing": {"prompt": "1", "completion": "1"},
                    "supported_parameters": [],
                    "context_length": 8000,
                },
                {
                    "id": "lower:free",
                    "pricing": {"prompt": "0", "completion": "0"},
                    "supported_parameters": ["temperature"],
                    "context_length": 4000,
                },
            ]
        }
        ranked = skill.ranked_free_models("dummy-key")

        self.assertEqual(len(ranked), 2)
        self.assertEqual(ranked[0]["id"], "best:free")
        self.assertEqual(ranked[1]["id"], "lower:free")

    def test_main_requires_api_key(self) -> None:
        stdout = io.StringIO()
        stderr = io.StringIO()

        with patch.dict(os.environ, {}, clear=True), patch.object(
            sys, "argv", ["openrouter_free_chat.py", "--prompt", "hello"]
        ):
            with redirect_stdout(stdout), redirect_stderr(stderr):
                rc = skill.main()

        self.assertEqual(rc, 2)
        self.assertIn("OPENROUTER_API_KEY is not set", stderr.getvalue())

    @patch.object(skill, "ranked_free_models")
    @patch.object(skill, "openrouter_chat")
    def test_main_fallback_then_success(self, mock_chat, mock_ranked) -> None:
        mock_ranked.return_value = [
            {"id": "model-a:free", "score": 3},
            {"id": "model-b:free", "score": 1},
        ]
        mock_chat.side_effect = [
            urllib.error.URLError("temporary failure"),
            {"choices": [{"message": {"content": "final answer"}}]},
        ]

        stdout = io.StringIO()
        stderr = io.StringIO()

        with patch.dict(os.environ, {"OPENROUTER_API_KEY": "key"}, clear=True), patch.object(
            sys,
            "argv",
            ["openrouter_free_chat.py", "--prompt", "hello", "--max-attempts", "2"],
        ):
            with redirect_stdout(stdout), redirect_stderr(stderr):
                rc = skill.main()

        self.assertEqual(rc, 0)
        self.assertEqual(stderr.getvalue(), "")
        payload = json.loads(stdout.getvalue())
        self.assertEqual(payload["selected_model"], "model-b:free")
        self.assertEqual(payload["response"], "final answer")
        self.assertEqual(payload["attempted_models"], ["model-a:free", "model-b:free"])
        self.assertEqual(payload["free_model_candidates"], 2)


if __name__ == "__main__":
    unittest.main()
