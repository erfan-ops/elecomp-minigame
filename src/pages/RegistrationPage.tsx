import { useState } from "react";
import { useAppSession } from "../app/AppSession";
import { VirtualKeyboard } from "../components/VirtualKeyboard";
import { VirtualNumericKeyboard } from "../components/VirtualNumericKeyboard";
import {
  formatMobileDigits,
  isValidMobileDigits,
  makeUserId,
  NAME_MAX_LENGTH,
  toCanonicalMobile,
} from "../domain/user";
import type { User } from "../domain/user";

type FieldId = "mobile" | "firstName" | "lastName";
type FieldErrors = Partial<Record<FieldId, string>>;

const MOBILE_ERROR = "شماره موبایل باید ۱۰ رقم باشد.";
const FIRST_NAME_ERROR = "لطفاً نام خود را وارد کنید.";
const LAST_NAME_ERROR = "لطفاً نام خانوادگی خود را وارد کنید.";

interface FormFieldProps {
  label: string;
  value: string;
  placeholder: string;
  active: boolean;
  error?: string;
  /** Fixed, non-editable part of the control (the +98 prefix). */
  prefix?: string;
  /** Renders the field content left-to-right (mobile number); text fields stay RTL. */
  ltr?: boolean;
  onActivate: () => void;
}

/**
 * Kiosk form field: rendered as a tappable surface instead of a real
 * <input>, so no browser/OS keyboard ever appears — input comes from the
 * on-screen keyboards only.
 */
function FormField({ label, value, placeholder, active, error, prefix, ltr = false, onActivate }: FormFieldProps) {
  return (
    <div
      className={`field${ltr ? " field--ltr" : ""}${active ? " field--active" : ""}${error ? " field--error" : ""}`}
    >
      <span className="field__label">{label}</span>
      <div
        className="field__control"
        role="textbox"
        aria-label={`${label}${value ? `: ${value}` : ""}`}
        onClick={onActivate}
      >
        {prefix && (
          <span className="field__prefix" aria-hidden="true">
            {prefix}
          </span>
        )}
        {value ? (
          <span className="field__value">{value}</span>
        ) : (
          <span className="field__placeholder">{placeholder}</span>
        )}
        {active && <span className="field__caret" aria-hidden="true" />}
      </div>
      {error && (
        <span className="field__error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

export function RegistrationPage() {
  const { register } = useAppSession();

  // The mobile field is focused on arrival so the player can start typing
  // immediately — no physical keyboard is involved.
  const [activeField, setActiveField] = useState<FieldId>("mobile");
  const [mobileDigits, setMobileDigits] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});

  const fieldValue = (field: FieldId): string =>
    field === "mobile" ? mobileDigits : field === "firstName" ? firstName : lastName;

  const setFieldValue = (field: FieldId, value: string) => {
    if (field === "mobile") setMobileDigits(value);
    else if (field === "firstName") setFirstName(value);
    else setLastName(value);
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  };

  const appendDigit = (digit: string) => {
    if (activeField !== "mobile") return;
    if (mobileDigits.length >= 10) return; // exactly 10 digits, no more
    setFieldValue("mobile", mobileDigits + digit);
  };

  const appendChar = (char: string) => {
    if (activeField === "mobile") return;
    const value = fieldValue(activeField);
    if (value.length >= NAME_MAX_LENGTH) return;
    setFieldValue(activeField, value + char);
  };

  const backspace = () => {
    const value = fieldValue(activeField);
    setFieldValue(activeField, value.slice(0, -1));
  };

  const validateAll = (): FieldErrors => {
    const next: FieldErrors = {};
    if (!isValidMobileDigits(mobileDigits)) next.mobile = MOBILE_ERROR;
    if (!firstName.trim()) next.firstName = FIRST_NAME_ERROR;
    if (!lastName.trim()) next.lastName = LAST_NAME_ERROR;
    return next;
  };

  /** Submit if everything is valid; otherwise show errors and focus the first invalid field. */
  const handleSubmit = () => {
    const next = validateAll();
    setErrors(next);
    if (next.mobile) setActiveField("mobile");
    else if (next.firstName) setActiveField("firstName");
    else if (next.lastName) setActiveField("lastName");
    else submit();
  };

  const submit = () => {
    const user: User = {
      id: makeUserId(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      mobile: toCanonicalMobile(mobileDigits),
    };
    register(user);
  };

  /** The keyboard's confirm key advances to the next field; on the last field it submits. */
  const confirm = () => {
    if (activeField === "mobile") {
      if (!isValidMobileDigits(mobileDigits)) {
        setErrors({ mobile: MOBILE_ERROR });
        return;
      }
      setActiveField("firstName");
      return;
    }
    if (activeField === "firstName") {
      if (!firstName.trim()) {
        setErrors({ firstName: FIRST_NAME_ERROR });
        return;
      }
      setActiveField("lastName");
      return;
    }
    handleSubmit();
  };

  return (
    <div className="page page--registration">
      <header className="registration__header">
        <h1 className="page__title">خوش آمدید</h1>
        <p className="registration__subtitle">برای شرکت در مسابقه اطلاعات خود را وارد کنید</p>
      </header>

      <div className="registration__form">
        <FormField
          label="شماره موبایل"
          value={formatMobileDigits(mobileDigits)}
          placeholder="912 123 4567"
          active={activeField === "mobile"}
          error={errors.mobile}
          prefix="+98"
          ltr
          onActivate={() => setActiveField("mobile")}
        />
        <FormField
          label="نام"
          value={firstName}
          placeholder="نام خود را بنویسید"
          active={activeField === "firstName"}
          error={errors.firstName}
          onActivate={() => setActiveField("firstName")}
        />
        <FormField
          label="نام خانوادگی"
          value={lastName}
          placeholder="نام خانوادگی خود را بنویسید"
          active={activeField === "lastName"}
          error={errors.lastName}
          onActivate={() => setActiveField("lastName")}
        />
        <button type="button" className="btn btn--primary" onClick={handleSubmit}>
          ورود
        </button>
      </div>

      <div className="keyboard-dock">
        {activeField === "mobile" ? (
          <VirtualNumericKeyboard onDigit={appendDigit} onBackspace={backspace} onConfirm={confirm} />
        ) : (
          <VirtualKeyboard
            onKey={appendChar}
            onSpace={() => appendChar(" ")}
            onBackspace={backspace}
            onConfirm={confirm}
          />
        )}
      </div>
    </div>
  );
}
