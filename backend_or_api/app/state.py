from __future__ import annotations

import asyncio
from collections import defaultdict
from typing import Any

from .models import RunSnapshot

RUNS: dict[str, RunSnapshot] = {}
# Ordered event log per run (SSE clients catch up from here; avoids losing events if they connect late).
RUN_EVENT_LOG: dict[str, list[dict[str, Any]]] = defaultdict(list)
# Wake queues: broadcast puts a tick after appending to RUN_EVENT_LOG.
RUN_EVENT_TICK_QUEUES: dict[str, list[asyncio.Queue[None]]] = defaultdict(list)
