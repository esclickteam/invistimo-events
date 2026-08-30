"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  RSVP_COPY,
  buildRespondByTokenPayload,
  cleanStr,
  formStateFromGuest,
  getActiveMenuOptions,
  isStaffPreviewFromSearchParams,
  nextArrivedCount,
  resolvePublicEventNote,
  type GiftOptions,
  type GuestRsvpFormState,
  type MenuOption,
  type PublicEventNote,
  type RsvpValue,
} from "./guestRsvpLogic";

export type GuestRsvpSuccessMode = "personal" | "inline";

export type GuestRsvpController = {
  loading: boolean;
  sent: boolean;
  isSubmitting: boolean;
  isStaffPreview: boolean;
  invite: any;
  event: any;
  selectedGuest: any;
  token: string | null;
  shareId: string | null;
  form: GuestRsvpFormState;
  activeMenuOptions: MenuOption[];
  giftOptions: GiftOptions | undefined;
  publicEventNote: PublicEventNote;
  heartTrigger: number;
  errorMessage: string;
  chooseYes: () => void;
  chooseNo: () => void;
  decrementCount: () => void;
  incrementCount: () => void;
  toggleNote: (label: string, checked: boolean) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  resetSent: () => void;
};

type Options = {
  shareId?: string | null;
  token?: string | null;
  params?: Promise<{ shareId?: string; id?: string }> | { shareId?: string; id?: string };
  successMode?: GuestRsvpSuccessMode;
  enabled?: boolean;
  onError?: (message: string) => void;
};

export function useGuestRsvpController(options: Options = {}): GuestRsvpController {
  const router = useRouter();
  const successMode = options.successMode || "personal";
  const enabled = options.enabled !== false;
  const reportError =
    options.onError ||
    ((message: string) => {
      if (typeof window !== "undefined") alert(message);
    });

  const [shareId, setShareId] = useState<string | null>(options.shareId || null);
  const [token, setToken] = useState<string | null>(options.token || null);
  const [routeReady, setRouteReady] = useState(!options.params);
  const [invite, setInvite] = useState<any>(null);
  const [event, setEvent] = useState<any>(null);
  const [selectedGuest, setSelectedGuest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sent, setSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStaffPreview, setIsStaffPreview] = useState(false);
  const [heartTrigger, setHeartTrigger] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [form, setForm] = useState<GuestRsvpFormState>({
    rsvp: "pending",
    arrivedCount: 1,
    notes: [],
  });

  useEffect(() => {
    if (options.shareId) setShareId(options.shareId);
    if (options.token !== undefined) setToken(options.token || null);
  }, [options.shareId, options.token]);

  useEffect(() => {
    if (!options.params) return;

    (async () => {
      const resolved = await options.params;
      const nextShareId = resolved?.shareId || resolved?.id || "";
      const sp = new URLSearchParams(window.location.search);
      const nextIsStaffPreview = isStaffPreviewFromSearchParams(sp);
      const nextToken = cleanStr(sp.get("token"));

      setShareId(nextShareId);
      setIsStaffPreview(nextIsStaffPreview);
      setToken(nextIsStaffPreview ? null : nextToken || null);
      setRouteReady(true);
    })();
  }, [options.params]);

  useEffect(() => {
    if (!enabled || !routeReady || !shareId) {
      if (!enabled) setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchInvite() {
      try {
        setLoading(true);

        const query = new URLSearchParams();
        if (isStaffPreview) {
          query.set("preview", "staff");
        } else if (token) {
          query.set("token", token);
        }

        const queryString = query.toString();
        const res = await fetch(
          `/api/invite/${shareId}${queryString ? `?${queryString}` : ""}`,
          { cache: "no-store" }
        );
        const data = await res.json().catch(() => ({}));

        if (cancelled) return;

        if (data.success) {
          const nextIsStaffPreview = Boolean(
            data.isStaffPreview ||
              data.preview?.type === "staff" ||
              data.preview?.enabled === true ||
              isStaffPreview
          );

          setInvite(data.invitation);
          setEvent(data.event);
          setIsStaffPreview(nextIsStaffPreview);

          if (nextIsStaffPreview) {
            setSelectedGuest(null);
            return;
          }

          if (data.guest) {
            const guest = data.guest;
            setSelectedGuest(guest);
            setForm(formStateFromGuest(guest));
          } else {
            setSelectedGuest(null);
          }
        } else {
          setInvite(null);
          setEvent(null);
          setSelectedGuest(null);
        }
      } catch {
        if (!cancelled) {
          setInvite(null);
          setEvent(null);
          setSelectedGuest(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchInvite();

    return () => {
      cancelled = true;
    };
  }, [enabled, routeReady, shareId, token, isStaffPreview]);

  const activeMenuOptions = useMemo(
    () => getActiveMenuOptions(invite?.invitationSettings?.menuOptions),
    [invite]
  );

  const giftOptions = useMemo(() => invite?.giftOptions as GiftOptions | undefined, [invite]);
  const publicEventNote = useMemo(
    () => resolvePublicEventNote(invite, event),
    [invite, event]
  );

  const chooseYes = useCallback(() => {
    setSent(false);
    setErrorMessage("");
    setForm((prev) => ({
      ...prev,
      rsvp: "yes",
      arrivedCount: Math.max(1, prev.arrivedCount || 1),
    }));
    setHeartTrigger(Date.now());
  }, []);

  const chooseNo = useCallback(() => {
    setSent(false);
    setErrorMessage("");
    setForm((prev) => ({
      ...prev,
      rsvp: "no",
      arrivedCount: 0,
    }));
  }, []);

  const decrementCount = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      arrivedCount: Math.max(1, prev.arrivedCount - 1),
    }));
  }, []);

  const incrementCount = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      arrivedCount: prev.arrivedCount + 1,
    }));
  }, []);

  const toggleNote = useCallback((label: string, checked: boolean) => {
    setForm((prev) => ({
      ...prev,
      notes: checked
        ? Array.from(new Set([...prev.notes, label]))
        : prev.notes.filter((item) => item !== label),
    }));
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (isSubmitting) return;

      if (isStaffPreview) {
        reportError(RSVP_COPY.staffBlocked);
        setErrorMessage(RSVP_COPY.staffBlocked);
        return;
      }

      if (form.rsvp !== "yes" && form.rsvp !== "no") {
        reportError(RSVP_COPY.chooseRequired);
        setErrorMessage(RSVP_COPY.chooseRequired);
        return;
      }

      const guestToken = cleanStr(selectedGuest?.token || token);
      if (!guestToken) {
        reportError(RSVP_COPY.guestIdentityError);
        setErrorMessage(RSVP_COPY.guestIdentityError);
        return;
      }

      try {
        setIsSubmitting(true);
        setErrorMessage("");

        const payload = buildRespondByTokenPayload({
          ...form,
          arrivedCount: nextArrivedCount(form.rsvp, form.arrivedCount),
        });

        const res = await fetch(
          `/api/invitationGuests/respondByToken/${guestToken}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );

        const data = await res.json().catch(() => ({}));

        if (!res.ok || !data.success) {
          const message = data?.error || data?.message || RSVP_COPY.saveFailed;
          reportError(message);
          setErrorMessage(message);
          return;
        }

        if (data.guest) {
          setSelectedGuest(data.guest);
        }

        if (successMode === "personal" && form.rsvp === "yes") {
          router.push("/thank-you");
        } else {
          setSent(true);
        }
      } catch {
        reportError(RSVP_COPY.sendFailed);
        setErrorMessage(RSVP_COPY.sendFailed);
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      form,
      isStaffPreview,
      isSubmitting,
      reportError,
      router,
      selectedGuest,
      successMode,
      token,
    ]
  );

  return {
    loading,
    sent,
    isSubmitting,
    isStaffPreview,
    invite,
    event,
    selectedGuest,
    token,
    shareId,
    form,
    activeMenuOptions,
    giftOptions,
    publicEventNote,
    heartTrigger,
    errorMessage,
    chooseYes,
    chooseNo,
    decrementCount,
    incrementCount,
    toggleNote,
    handleSubmit,
    resetSent: () => setSent(false),
  };
}

export function useGuestRsvpDemoController(): GuestRsvpController {
  const [sent, setSent] = useState(false);
  const [heartTrigger, setHeartTrigger] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [form, setForm] = useState<GuestRsvpFormState>({
    rsvp: "yes",
    arrivedCount: 1,
    notes: [],
  });

  return {
    loading: false,
    sent,
    isSubmitting: false,
    isStaffPreview: false,
    invite: null,
    event: null,
    selectedGuest: null,
    token: null,
    shareId: null,
    form,
    activeMenuOptions: [],
    giftOptions: undefined,
    publicEventNote: { enabled: false, text: "" },
    heartTrigger,
    errorMessage,
    chooseYes: () => {
      setSent(false);
      setErrorMessage("");
      setForm((prev) => ({
        ...prev,
        rsvp: "yes" as RsvpValue,
        arrivedCount: Math.max(1, prev.arrivedCount || 1),
      }));
      setHeartTrigger(Date.now());
    },
    chooseNo: () => {
      setSent(false);
      setErrorMessage("");
      setForm((prev) => ({ ...prev, rsvp: "no", arrivedCount: 0 }));
    },
    decrementCount: () => {
      setForm((prev) => ({ ...prev, arrivedCount: Math.max(1, prev.arrivedCount - 1) }));
    },
    incrementCount: () => {
      setForm((prev) => ({ ...prev, arrivedCount: prev.arrivedCount + 1 }));
    },
    toggleNote: (label, checked) => {
      setForm((prev) => ({
        ...prev,
        notes: checked
          ? Array.from(new Set([...prev.notes, label]))
          : prev.notes.filter((item) => item !== label),
      }));
    },
    handleSubmit: async (e) => {
      e.preventDefault();
      if (form.rsvp !== "yes" && form.rsvp !== "no") {
        setErrorMessage(RSVP_COPY.chooseRequired);
        return;
      }
      setSent(true);
    },
    resetSent: () => setSent(false),
  };
}
