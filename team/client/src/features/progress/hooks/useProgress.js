import { useCallback, useEffect, useRef, useState } from 'react';
import { getOverview, getHistory } from '../services/progressService';
import { toDateKey } from '../../../utils/helpers';

function isAbortError(error) {
  // AbortController membuang AbortError (DOM) atau ERR_CANCELED (axios).
  return error?.name === 'AbortError' || error?.code === 'ERR_CANCELED';
}

/** Ringkasan progres per periode (7d | 30d | all). Tanpa redux. */
export function useProgress(period = '7d') {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    setLoading(true);
    setError(null);
    getOverview(period, { signal: controller.signal })
      .then((data) => {
        if (!active) return;
        setOverview(data);
        setError(null);
      })
      .catch((err) => {
        if (!active || isAbortError(err)) return;
        setError(err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [period, reloadToken]);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  return { overview, loading, error, reload };
}

/**
 * Daftar riwayat check-in/out dengan pagination cursor.
 * `reload` selalu mulai dari halaman pertama, `loadMore` memakai page.next_cursor.
 */
export function useProgressHistory({ filter = 'all', limit = 20 } = {}) {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState({ next_cursor: null, has_more: false });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);
  const loadMoreControllerRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    setLoading(true);
    setError(null);
    getHistory({ filter, limit }, { signal: controller.signal })
      .then((data) => {
        if (!active) return;
        setItems(data?.items ?? []);
        setPage(data?.page ?? { next_cursor: null, has_more: false });
        setError(null);
      })
      .catch((err) => {
        if (!active || isAbortError(err)) return;
        setError(err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [filter, limit, reloadToken]);

  const loadMore = useCallback(() => {
    if (loading || loadingMore || !page?.has_more || !page?.next_cursor) return;

    const controller = new AbortController();
    loadMoreControllerRef.current = controller;
    setLoadingMore(true);
    setError(null);
    getHistory(
      { filter, limit, cursor: page.next_cursor },
      { signal: controller.signal }
    )
      .then((data) => {
        setItems((prev) => [...prev, ...(data?.items ?? [])]);
        setPage(data?.page ?? { next_cursor: null, has_more: false });
        setError(null);
      })
      .catch((err) => {
        if (isAbortError(err)) return;
        setError(err);
      })
      .finally(() => {
        if (loadMoreControllerRef.current === controller) {
          loadMoreControllerRef.current = null;
        }
        setLoadingMore(false);
      });
  }, [filter, limit, loading, loadingMore, page]);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  // Batalkan request loadMore yang masih melayang saat unmount.
  useEffect(() => () => loadMoreControllerRef.current?.abort(), []);

  return { items, page, loading, error, loadingMore, reload, loadMore };
}

const CHECK_IN_STORAGE_KEY = 'lastCheckIn';

/**
 * SEMENTARA: belum ada endpoint status check-in harian di BE,
 * jadi status dibaca dari localStorage.lastCheckIn milik CheckInGateway.
 * Ganti dengan fetch ke endpoint status begitu tersedia di server.
 */
export function hasCheckedInToday() {
  try {
    return localStorage.getItem(CHECK_IN_STORAGE_KEY) === toDateKey(new Date());
  } catch {
    // localStorage tidak tersedia (private mode / SSR)
    return false;
  }
}

/** Menandai check-in hari ini, kompatibel dengan key yang ditulis CheckInGateway. */
export function markCheckedInToday() {
  try {
    localStorage.setItem(CHECK_IN_STORAGE_KEY, toDateKey(new Date()));
  } catch {
    // localStorage tidak tersedia
  }
}

export function useCheckInStatus() {
  return { checkedInToday: hasCheckedInToday(), hasCheckedInToday, markCheckedInToday };
}

export default useProgress;
