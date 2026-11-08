"use client";

import { useEffect, useRef } from "react";
import {
  blogSearchTerm,
  shouldTrackBlogSearch,
  trackBlogSearch,
} from "@/lib/seo/analytics";

const SEARCH_IDLE_MS = 800;

/**
 * Sends view_search_results once a query has settled for 800ms, or immediately
 * when the reader submits the form. Keystrokes and unchanged terms do not send.
 */
export function useBlogSearchTracking(query: string, pagePath: string) {
  const last = useRef("");
  const queryRef = useRef(query);
  const pageRef = useRef(pagePath);
  queryRef.current = query;
  pageRef.current = pagePath;

  const commit = () => {
    const term = blogSearchTerm(queryRef.current);
    if (!shouldTrackBlogSearch(last.current, term)) return;
    last.current = term;
    trackBlogSearch(term, pageRef.current);
  };

  useEffect(() => {
    const term = blogSearchTerm(query);
    if (term.length < 2) return;
    const timer = window.setTimeout(commit, SEARCH_IDLE_MS);
    return () => window.clearTimeout(timer);
  }, [query, pagePath]);

  return commit;
}
