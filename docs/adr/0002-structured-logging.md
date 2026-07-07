# 2. Structured JSON Logging

Date: 2026-07-07

## Status

Accepted

## Context

The backend application historically relied on `print()` statements and basic error traces for debugging. In a containerized Kubernetes environment, simple print statements are difficult to parse, search, and monitor at scale. We need a way to output logs that can be easily ingested by modern observability stacks (e.g., Elasticsearch, Datadog, CloudWatch).

## Decision

We will use the **`python-json-logger`** library in the Flask backend to output structured JSON logs.

1. **Standard `logging` module**: We replaced `print()` statements with standard `logging.getLogger()` calls.
2. **JSON Formatter**: We configured the root logger to format all output as JSON, including timestamps, log levels, and dynamic extra contextual fields.

## Consequences

- **Pros**: 
  - Logs are machine-readable and easily indexed by log aggregators.
  - Contextual data (like stack traces) can be structured natively rather than spanning multiple unparseable text lines.
- **Cons**: 
  - Raw JSON logs can be slightly harder for a human to read directly in the terminal without a formatter like `jq`.
