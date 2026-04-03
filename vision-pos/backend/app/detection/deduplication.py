from __future__ import annotations

import time


class DeduplicationBuffer:
    """Sliding window deduplication buffer.

    Menyimpan {class_id: last_seen_timestamp}. `should_add` return True
    jika class_id belum pernah terlihat ATAU sudah lebih dari window_seconds
    sejak terakhir terlihat.
    """

    def __init__(self, window_seconds: float = 2.0) -> None:
        self._window = window_seconds
        self._seen: dict[int, float] = {}

    def should_add(self, class_id: int) -> bool:
        """Return True jika class_id boleh ditambahkan (bukan duplikat dalam window)."""
        now = time.monotonic()
        last_seen = self._seen.get(class_id)

        if last_seen is None or (now - last_seen) > self._window:
            self._seen[class_id] = now
            return True

        return False

    def reset(self) -> None:
        """Hapus semua entri buffer."""
        self._seen.clear()
