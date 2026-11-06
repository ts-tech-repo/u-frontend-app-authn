import { useMemo } from "react";
import { Check, X } from "lucide-react";

import { KEYBOARD_ROWS } from "../data/constants";

const getPersonalTokens = (info) => [
  ...new Set(
    info
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length >= 3),
  ),
];

const hasKeyboardPattern = (pwd, minLen = 4) => {
  const lower = pwd.toLowerCase();
  for (const row of KEYBOARD_ROWS) {
    const rev = row.split("").reverse().join("");
    for (let i = 0; i <= lower.length - minLen; i++) {
      const chunk = lower.slice(i, i + minLen);
      if (row.includes(chunk) || rev.includes(chunk)) return true;
    }
  }
  return false;
};

export const checkPassword = (pwd, confirm, info) => {
  const empty = pwd.length === 0;

  const categories = [
    /[a-z]/.test(pwd),
    /[A-Z]/.test(pwd),
    /[0-9]/.test(pwd),
    /[^A-Za-z0-9]/.test(pwd),
  ].filter(Boolean).length;

  const counts = {};
  for (const ch of pwd) counts[ch] = (counts[ch] || 0) + 1;
  const maxRepeat = Math.max(0, ...Object.values(counts));

  const lower = pwd.toLowerCase();
  const containsPersonalInfo = getPersonalTokens(info).some((t) =>
    lower.includes(t),
  );

  return {
    notEmpty: !empty,
    match: !empty && pwd === confirm,
    categories: !empty && categories >= 3,
    unique: !empty && new Set(pwd).size >= 4,
    personal: !empty && !containsPersonalInfo,
    repeats: !empty && maxRepeat <= 4,
    keyboard: !empty && !hasKeyboardPattern(pwd),
    characters: !empty && pwd.length >= 8
  };
};

const Rule = ({ ok, children }) => (
  <li style={{ listStyle: "none", display: "flex", alignItems: "center",  }}>
    <span aria-hidden="true" style={{ marginRight: 8, fontWeight: "bold", marginTop: "2px" }}>
      {ok ? (
        <Check style={{ color: "#198754" }} />
      ) : (
        <X style={{ color: "#dc3545" }} />
      )}
    </span>
    {children}
  </li>
);

export const PasswordRequirements = ({
  password,
  confirmPassword,
  personalInfo,
}) => {
  const result = useMemo(
    () => checkPassword(password || "", confirmPassword || "", personalInfo),
    [password, confirmPassword],
  );

  return (
    <ul
      className="password-requirements"
      style={{ fontSize: "0.875rem", paddingLeft: 0 }}
      aria-live="polite"
    >
      <Rule ok={result.notEmpty}>Password cannot be empty</Rule>
      <Rule ok={result.characters}>Password must contain at least 8 characters.</Rule>
      <Rule ok={result.match}>Passwords must match</Rule>
      <Rule ok={result.categories}>
        Should contain at least three of the four categories: lowercase,
        uppercase, numeric, and special characters.
      </Rule>
      <Rule ok={result.unique}>
        Your password must contain at least 4 unique characters.
      </Rule>
      <Rule ok={result.personal}>Must not contain personal info.</Rule>
      <Rule ok={result.repeats}>
        Must not contain any character more than 4 times.
      </Rule>
      <Rule ok={result.keyboard}>
        Must not include keyboard patterns of more than three (3) characters.
      </Rule>

      <li className="text-muted" style={{ listStyle: "none" }}>
        Sample Passwords:{" "}
        <strong>
          <i>{`{95745@F_S_d`}</i>
        </strong>{" "}
        or{" "}
        <strong>
          <i>{`_DQYU_@2789`}</i>
        </strong>{" "}
        or{" "}
        <strong>
          <i>{`Lm3!Xe4r`}</i>
        </strong>
      </li>
    </ul>
  );
};