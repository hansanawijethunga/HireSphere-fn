import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useEffect, useState } from 'react';
import { createBooking, fetchSlots } from '../utils/bookingApi';

// ─── Date / time helpers ──────────────────────────────────────────────────────

function toDateParam(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function formatSlotTime(utcIso) {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(utcIso));
}

function formatSelectedDate(date) {
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

// ─── Card helpers ─────────────────────────────────────────────────────────────

function getCardType(number) {
  const d = number.replace(/\s/g, '');
  if (/^4/.test(d)) return 'visa';
  if (/^5[1-5]/.test(d) || /^2(2[2-9][1-9]|[3-6]\d{2}|7[01]\d|720)/.test(d)) return 'mastercard';
  if (/^3[47]/.test(d)) return 'amex';
  return null;
}

function formatCardNumber(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (digits.length > 2) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return digits;
}

function validateCard(card) {
  const errors = {};
  const digits = card.number.replace(/\s/g, '');
  const type = getCardType(card.number);

  if (!card.name.trim()) {
    errors.name = 'Cardholder name is required.';
  }
  if (digits.length < 13) {
    errors.number = 'Enter a valid card number.';
  }

  const parts = card.expiry.split('/');
  const mm = Number(parts[0]);
  const yy = Number(parts[1]);
  if (!parts[1] || isNaN(mm) || mm < 1 || mm > 12) {
    errors.expiry = 'Enter a valid expiry date.';
  } else {
    const expDate = new Date(2000 + yy, mm - 1, 1);
    const now = new Date();
    now.setDate(1); now.setHours(0, 0, 0, 0);
    if (expDate < now) errors.expiry = 'Your card has expired.';
  }

  const cvcLength = type === 'amex' ? 4 : 3;
  if (card.cvc.length < cvcLength) {
    errors.cvc = `CVC must be ${cvcLength} digits.`;
  }

  return errors;
}

// Translate raw server error messages into realistic user-facing copy.
function toPaymentErrorMessage(serverMsg) {
  if (!serverMsg) return 'Something went wrong. Please try again.';
  const lower = serverMsg.toLowerCase();
  if (lower.includes('payment failed')) {
    return 'Your card was declined. Please check your details or use a different card.';
  }
  if (lower.includes('already booked') || lower.includes('slot')) {
    return 'This time slot was just taken by someone else. Please go back and pick a different time.';
  }
  if (lower.includes('session expired') || lower.includes('sign in')) {
    return serverMsg;
  }
  return 'Your payment could not be processed. Please try again or use a different card.';
}

// ─── Card brand badge ─────────────────────────────────────────────────────────

function CardBrandBadge({ type }) {
  if (type === 'visa') {
    return (
      <span className="inline-flex items-center rounded bg-blue-700 px-1.5 py-0.5 font-bold italic tracking-widest text-white" style={{ fontSize: 10 }}>
        VISA
      </span>
    );
  }
  if (type === 'mastercard') {
    return (
      <span className="inline-flex items-center" aria-label="Mastercard">
        <span className="h-5 w-5 rounded-full bg-red-500" />
        <span className="-ml-2 h-5 w-5 rounded-full bg-amber-400 opacity-90" />
      </span>
    );
  }
  if (type === 'amex') {
    return (
      <span className="inline-flex items-center rounded bg-sky-600 px-1.5 py-0.5 font-bold tracking-widest text-white" style={{ fontSize: 9 }}>
        AMEX
      </span>
    );
  }
  return (
    <svg className="h-5 w-5 text-slate-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
    </svg>
  );
}

// ─── Shared UI primitives ─────────────────────────────────────────────────────

function Spinner({ className = 'h-4 w-4' }) {
  return (
    <div
      className={`animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
      aria-hidden="true"
    />
  );
}

function FieldError({ message }) {
  if (!message) return null;
  return (
    <p className="mt-1 flex items-center gap-1 text-xs text-rose-600" role="alert">
      <svg className="h-3 w-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
      </svg>
      {message}
    </p>
  );
}

function AlertBanner({ variant, title, message }) {
  const styles = {
    error: {
      wrapper: 'border-rose-200 bg-rose-50',
      icon: 'text-rose-500',
      title: 'text-rose-700',
      body: 'text-rose-600',
      path: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z',
    },
    success: {
      wrapper: 'border-emerald-200 bg-emerald-50',
      icon: 'text-emerald-500',
      title: 'text-emerald-700',
      body: 'text-emerald-600',
      path: 'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    },
  };
  const s = styles[variant];
  return (
    <div role={variant === 'error' ? 'alert' : 'status'} className={`rounded-lg border px-4 py-3 ${s.wrapper}`}>
      <div className="flex gap-2.5">
        <svg className={`mt-0.5 h-5 w-5 shrink-0 ${s.icon}`} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d={s.path} />
        </svg>
        <div>
          <p className={`text-sm font-semibold ${s.title}`}>{title}</p>
          <p className={`mt-0.5 text-sm ${s.body}`}>{message}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const EMPTY_CARD = { name: '', number: '', expiry: '', cvc: '' };

export function BookingModal({ isOpen, onClose, interviewer }) {
  const [selectedDate, setSelectedDate] = useState(null);
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);

  const [card, setCard] = useState(EMPTY_CARD);
  const [cardErrors, setCardErrors] = useState({});

  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const cardType = getCardType(card.number);

  // Reset all state when modal opens for a (possibly different) interviewer
  useEffect(() => {
    if (!isOpen) return;
    setSelectedDate(null);
    setSlots([]);
    setSlotsError('');
    setSelectedSlot(null);
    setCard(EMPTY_CARD);
    setCardErrors({});
    setIsProcessing(false);
    setPaymentError(null);
    setBookingSuccess(false);
  }, [isOpen, interviewer?.id]);

  // Fetch slots whenever the selected date changes
  useEffect(() => {
    if (!selectedDate || !interviewer?.id) return;

    let cancelled = false;
    setSelectedSlot(null);
    setSlots([]);
    setSlotsError('');
    setSlotsLoading(true);

    fetchSlots(interviewer.id, toDateParam(selectedDate))
      .then((data) => {
        if (!cancelled) {
          setSlots(Array.isArray(data) ? data : []);
          setSlotsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setSlotsError(err.message || 'Failed to load available times.');
          setSlotsLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [selectedDate, interviewer?.id]);

  // Lock background scroll while open
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  function updateCard(field, value) {
    setCard((prev) => ({ ...prev, [field]: value }));
    if (cardErrors[field]) setCardErrors((prev) => ({ ...prev, [field]: '' }));
  }

  async function handleConfirm() {
    if (!selectedSlot || isProcessing || bookingSuccess) return;

    const errors = validateCard(card);
    if (Object.keys(errors).length > 0) {
      setCardErrors(errors);
      return;
    }

    setCardErrors({});
    setPaymentError(null);
    setIsProcessing(true);

    try {
      // Card details are validated locally but never sent to the backend.
      await createBooking({
        interviewerId: interviewer.id,
        scheduledAt: selectedSlot,
        paymentMethodId: 'tok_visa_simulated',
      });
      setBookingSuccess(true);
      setTimeout(onClose, 2500);
    } catch (err) {
      setPaymentError(toPaymentErrorMessage(err.message));
      setIsProcessing(false);
    }
  }

  if (!isOpen) return null;

  const price = interviewer?.sessionPrice ?? interviewer?.price ?? 0;
  const name = interviewer?.name ?? interviewer?.email?.split('@')[0] ?? 'Interviewer';
  const initials = name.slice(0, 2).toUpperCase();
  const cvcMaxLength = cardType === 'amex' ? 4 : 3;
  const cardIsComplete = selectedSlot && !bookingSuccess;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-modal-title"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      {/* Panel */}
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">

        {/* ── Header ── */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 id="booking-modal-title" className="text-base font-bold text-slate-900">Book a Session</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close booking modal"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Interviewer strip ── */}
        <div className="flex shrink-0 items-center gap-3 border-b border-slate-100 bg-slate-50/70 px-6 py-3">
          <div className="flex h-9 w-9 shrink-0 select-none items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-xs font-bold text-white" aria-hidden="true">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{name}</p>
            <p className="text-xs text-slate-500">
              {interviewer?.domain}{interviewer?.experienceLevel ? ` · ${interviewer.experienceLevel}` : ''}
            </p>
          </div>
          <div className="ml-auto shrink-0 text-right">
            <p className="text-base font-bold text-slate-900">${price}</p>
            <p className="text-xs text-slate-400">per session</p>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Split pane ── */}
          <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] sm:divide-x sm:divide-slate-100">

            {/* Left: Calendar */}
            <div className="border-b border-slate-100 p-5 sm:border-0">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Select a Date</p>
              <div className="[&_.react-datepicker]:rounded-xl [&_.react-datepicker]:border-slate-200 [&_.react-datepicker]:font-sans [&_.react-datepicker]:shadow-none [&_.react-datepicker__header]:rounded-t-xl [&_.react-datepicker__header]:border-slate-100 [&_.react-datepicker__header]:bg-white [&_.react-datepicker__current-month]:text-sm [&_.react-datepicker__current-month]:font-semibold [&_.react-datepicker__current-month]:text-slate-900 [&_.react-datepicker__day-name]:text-xs [&_.react-datepicker__day-name]:font-medium [&_.react-datepicker__day-name]:text-slate-400 [&_.react-datepicker__day]:rounded-lg [&_.react-datepicker__day]:text-sm [&_.react-datepicker__day]:text-slate-700 [&_.react-datepicker__day--today]:font-bold [&_.react-datepicker__day--today]:text-brand-600 [&_.react-datepicker__day:hover]:bg-brand-50 [&_.react-datepicker__day:hover]:text-brand-700 [&_.react-datepicker__day--selected]:!bg-brand-600 [&_.react-datepicker__day--selected]:!text-white [&_.react-datepicker__day--selected:hover]:!bg-brand-500 [&_.react-datepicker__day--keyboard-selected]:!bg-brand-100 [&_.react-datepicker__day--keyboard-selected]:!text-brand-800 [&_.react-datepicker__day--disabled]:!text-slate-300 [&_.react-datepicker__day--disabled:hover]:bg-transparent [&_.react-datepicker__navigation-icon::before]:border-slate-400">
                <DatePicker selected={selectedDate} onChange={(date) => setSelectedDate(date)} inline minDate={new Date()} />
              </div>
            </div>

            {/* Right: Time slots */}
            <div className="flex min-h-[260px] flex-col p-5">
              <div className="mb-3 shrink-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Available Times</p>
                {selectedDate && (
                  <p className="mt-0.5 text-xs text-slate-500">
                    {formatSelectedDate(selectedDate)}{' · '}
                    <span className="font-medium text-slate-600">{userTz}</span>
                  </p>
                )}
              </div>

              {!selectedDate && (
                <div className="flex flex-1 flex-col items-center justify-center py-6 text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                    <svg className="h-6 w-6 text-slate-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-slate-700">Pick a date</p>
                  <p className="mt-1 text-xs text-slate-400">Available times will appear here</p>
                </div>
              )}

              {selectedDate && slotsLoading && (
                <div className="flex flex-1 items-center justify-center gap-2.5 py-6">
                  <Spinner className="h-4 w-4 text-brand-600" />
                  <span className="text-sm text-slate-500">Loading times…</span>
                </div>
              )}

              {selectedDate && !slotsLoading && slotsError && (
                <div className="mt-1"><AlertBanner variant="error" title="Could not load times" message={slotsError} /></div>
              )}

              {selectedDate && !slotsLoading && !slotsError && slots.length === 0 && (
                <div className="flex flex-1 flex-col items-center justify-center py-6 text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                    <svg className="h-6 w-6 text-slate-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-slate-700">No times available</p>
                  <p className="mt-1 text-xs text-slate-400">Try selecting a different date</p>
                </div>
              )}

              {selectedDate && !slotsLoading && !slotsError && slots.length > 0 && (
                <div className="flex-1 space-y-2 overflow-y-auto pr-0.5">
                  {slots.map((slot) => {
                    const isSelected = selectedSlot === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setSelectedSlot(slot)}
                        disabled={bookingSuccess}
                        className={`w-full rounded-lg px-4 py-2.5 text-left text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1 disabled:cursor-not-allowed ${
                          isSelected
                            ? 'bg-brand-600 text-white shadow-sm'
                            : 'border border-slate-200 bg-white text-slate-700 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700'
                        }`}
                      >
                        {formatSlotTime(slot)}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── Payment form ── */}
          {cardIsComplete && (
            <div className="border-t border-slate-100 px-6 py-5">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Payment Details</p>
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <svg className="h-3.5 w-3.5 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                  <span>256-bit SSL</span>
                </div>
              </div>

              <div className="space-y-4">

                {/* Cardholder name */}
                <div>
                  <label htmlFor="bm-name" className="mb-1.5 block text-xs font-medium text-slate-600">
                    Cardholder Name
                  </label>
                  <input
                    id="bm-name"
                    type="text"
                    autoComplete="cc-name"
                    placeholder="Name as it appears on card"
                    value={card.name}
                    onChange={(e) => updateCard('name', e.target.value)}
                    disabled={isProcessing}
                    className={`w-full rounded-lg border px-3 py-2.5 text-sm text-slate-800 shadow-sm transition placeholder:text-slate-400 focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${
                      cardErrors.name
                        ? 'border-rose-400 bg-rose-50 focus:border-rose-400 focus:ring-rose-300/30'
                        : 'border-slate-200 bg-white focus:border-brand-500 focus:ring-brand-500/20'
                    }`}
                  />
                  <FieldError message={cardErrors.name} />
                </div>

                {/* Card number */}
                <div>
                  <label htmlFor="bm-card-number" className="mb-1.5 block text-xs font-medium text-slate-600">
                    Card Number
                  </label>
                  <div className="relative">
                    <input
                      id="bm-card-number"
                      type="text"
                      autoComplete="cc-number"
                      inputMode="numeric"
                      placeholder="1234 5678 9012 3456"
                      value={card.number}
                      onChange={(e) => updateCard('number', formatCardNumber(e.target.value))}
                      maxLength={19}
                      disabled={isProcessing}
                      className={`w-full rounded-lg border py-2.5 pl-3 pr-12 font-mono text-sm text-slate-800 shadow-sm transition placeholder:font-sans placeholder:text-slate-400 focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${
                        cardErrors.number
                          ? 'border-rose-400 bg-rose-50 focus:border-rose-400 focus:ring-rose-300/30'
                          : 'border-slate-200 bg-white focus:border-brand-500 focus:ring-brand-500/20'
                      }`}
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                      <CardBrandBadge type={cardType} />
                    </span>
                  </div>
                  <FieldError message={cardErrors.number} />
                </div>

                {/* Expiry + CVC */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="bm-expiry" className="mb-1.5 block text-xs font-medium text-slate-600">
                      Expiry Date
                    </label>
                    <input
                      id="bm-expiry"
                      type="text"
                      autoComplete="cc-exp"
                      inputMode="numeric"
                      placeholder="MM/YY"
                      value={card.expiry}
                      onChange={(e) => updateCard('expiry', formatExpiry(e.target.value))}
                      maxLength={5}
                      disabled={isProcessing}
                      className={`w-full rounded-lg border px-3 py-2.5 font-mono text-sm text-slate-800 shadow-sm transition placeholder:font-sans placeholder:text-slate-400 focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${
                        cardErrors.expiry
                          ? 'border-rose-400 bg-rose-50 focus:border-rose-400 focus:ring-rose-300/30'
                          : 'border-slate-200 bg-white focus:border-brand-500 focus:ring-brand-500/20'
                      }`}
                    />
                    <FieldError message={cardErrors.expiry} />
                  </div>

                  <div>
                    <label htmlFor="bm-cvc" className="mb-1.5 flex items-center gap-1 text-xs font-medium text-slate-600">
                      CVC
                      <span title={`${cvcMaxLength}-digit security code on the ${cardType === 'amex' ? 'front' : 'back'} of your card`}>
                        <svg className="h-3.5 w-3.5 cursor-help text-slate-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                        </svg>
                      </span>
                    </label>
                    <input
                      id="bm-cvc"
                      type="text"
                      autoComplete="cc-csc"
                      inputMode="numeric"
                      placeholder={'•'.repeat(cvcMaxLength)}
                      value={card.cvc}
                      onChange={(e) => updateCard('cvc', e.target.value.replace(/\D/g, '').slice(0, cvcMaxLength))}
                      maxLength={cvcMaxLength}
                      disabled={isProcessing}
                      className={`w-full rounded-lg border px-3 py-2.5 font-mono text-sm text-slate-800 shadow-sm transition placeholder:text-slate-400 focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${
                        cardErrors.cvc
                          ? 'border-rose-400 bg-rose-50 focus:border-rose-400 focus:ring-rose-300/30'
                          : 'border-slate-200 bg-white focus:border-brand-500 focus:ring-brand-500/20'
                      }`}
                    />
                    <FieldError message={cardErrors.cvc} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Status banners ── */}
          {(paymentError || bookingSuccess) && (
            <div className="px-6 pb-5">
              {paymentError && (
                <AlertBanner variant="error" title="Payment declined" message={paymentError} />
              )}
              {bookingSuccess && (
                <AlertBanner variant="success" title="Payment successful!" message="Your session has been booked. A confirmation will close this window shortly…" />
              )}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        {!bookingSuccess && (
          <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-100 px-6 py-4">
            <p className="truncate text-xs text-slate-400">
              {selectedSlot ? `${formatSlotTime(selectedSlot)} · $${price}` : 'Select a date and time to continue'}
            </p>
            <div className="flex shrink-0 items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isProcessing}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!selectedSlot || isProcessing}
                className="flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Spinner />
                    Processing payment…
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                    Pay ${price} securely
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
