# WordLex Memory and Latency Results

Measurements taken on Ubuntu (Wayland) using `./scripts/measure-memory.sh` and `./scripts/benchmark-cli-latency.sh`.

## Memory (idle app in tray, window hidden)

| Metric | Before (v1.5 baseline) | After (v1.6 optimizations) | Change |
|--------|------------------------|------------------------------|--------|
| Total RSS | 444.6 MB | 225.8 MB | −49% |
| Total PSS | 193.6 MB | 126.6 MB | −35% |

Per-process PSS:

| Process | Before | After |
|---------|--------|-------|
| wordlex | 74.8 MB | 37.3 MB |
| WebKit network | 26.8 MB | 6.3 MB |
| WebKit web | 92.0 MB | 83.0 MB |

Note: system monitor RSS totals can over-count shared WebKit pages; PSS is a better estimate of real memory pressure.

## CLI latency (`/usr/bin/wordlex`, word: ephemeral)

| Command | Latency |
|---------|---------|
| `--cli` | ~0.03s |
| `--cli-json` | ~0.04s |
| `--search-json` | ~0.03s |
| `--random-json` | ~0.29s |

No noticeable regression after `PRAGMA temp_store=FILE` and reduced SQLite cache sizes.

## Vicinae endpoint

`GET http://127.0.0.1:17432/health` returns `{"status":"ok",...}` while WordLex is running.
