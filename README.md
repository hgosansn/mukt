# openrouter-free-responder

[![OpenClaw Skill](https://img.shields.io/badge/OpenClaw-Skill-0A84FF)](https://docs.openclaw.ai/tools/skills)
[![OpenRouter](https://img.shields.io/badge/OpenRouter-Free%20Model%20Routing-00A67E)](https://openrouter.ai)
[![Python](https://img.shields.io/badge/Python-3.9%2B-3776AB)](https://www.python.org)
[![Env](https://img.shields.io/badge/Requires-OPENROUTER__API__KEY-orange)](#dependency)
[![License](https://img.shields.io/badge/License-MIT-black)](./LICENSE)

OpenClaw skill focused on one job: find a currently free OpenRouter model, run a prompt, and return the response.

## What is Mukt for?

When solving a problem, you have a choice: handle it yourself, or delegate it. Mukt gives you a third option — offload it to an external model at no cost.

Think of Mukt as a pool of interns. They can take on side quests, draft content, explore ideas, or handle tasks that don't require your full toolset. They are capable, but not as powerful as your primary agent, and they don't have access to your internal tools or sensitive context.

**Use Mukt when:**
- The task is non-critical and doesn't involve sensitive information
- You want a second opinion or a rough draft without burning compute budget
- The problem can be solved with language alone — no tool access required

**Don't use Mukt for:**
- Tasks involving secrets, credentials, or private data
- Anything that requires direct access to your workspace or systems

## Purpose

- Discover available free models from OpenRouter at request time
- Rank candidates and use fallback attempts when a model fails
- Return structured output with selected model and response text

## Dependency

- `OPENROUTER_API_KEY` (required)

Create your local env value:

```bash
export OPENROUTER_API_KEY="your-openrouter-api-key"
```

## Local Check

```bash
python3 scripts/openrouter_free_chat.py --prompt "Say hello in one sentence"
```

## Tests

Run offline unit tests (no network calls):

```bash
python3 -m unittest discover -s tests -p "test_*.py"
```

Optional flags:

```bash
python3 scripts/openrouter_free_chat.py \
  --prompt "Summarize TCP in 4 bullets" \
  --system "Be concise and accurate." \
  --max-attempts 10 \
  --temperature 0.2 \
  --debug
```

## OpenClaw Skill Entry

Skill spec is in `SKILL.md`.

- Declares OpenClaw metadata
- Declares required env dependency (`OPENROUTER_API_KEY`)
- Uses `{baseDir}/scripts/openrouter_free_chat.py` as runtime command

## Publish to ClawHub

Install and authenticate ClawHub CLI, then publish from repo root:

```bash
clawhub publish . --slug openrouter-free-responder --version 1.0.0
```

Useful flags:

```bash
clawhub publish . --slug openrouter-free-responder --version 1.0.0 --dry-run
clawhub publish . --slug openrouter-free-responder --version 1.0.0 --visibility public
```
