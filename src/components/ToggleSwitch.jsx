import React, { useCallback, useId, useMemo, useState } from "react";
import "./ToggleSwitch.css";

function ToggleSwitch({
  checked,
  defaultChecked = false,
  onChange,
  disabled = false,
  size = "md",
  id,
  name,
  className = "",
  label,
  onLabel = "On",
  offLabel = "Off",
  ariaLabel,
}) {
  const autoId = useId();
  const inputId = id || `ts-${autoId}`;
  const isControlled = typeof checked === "boolean";
  const [uncontrolled, setUncontrolled] = useState(defaultChecked);
  const value = isControlled ? checked : uncontrolled;

  const cls = useMemo(() => {
    const sizeClass = size === "sm" || size === "lg" ? size : "md";
    const disabledClass = disabled ? "disabled" : "";
    return ["ts-toggle", sizeClass, disabledClass, className].filter(Boolean).join(" ");
  }, [size, disabled, className]);

  const handleChange = useCallback(
    (e) => {
      if (!isControlled) setUncontrolled(e.target.checked);
      if (onChange) onChange(e.target.checked, e);
    },
    [isControlled, onChange]
  );

  return (
    <label className={cls} htmlFor={inputId}>
      {label ? <span className="ts-label">{label}</span> : null}
      <input
        id={inputId}
        name={name}
        type="checkbox"
        role="switch"
        aria-checked={value}
        aria-label={ariaLabel || (label ? undefined : "Toggle")}
        checked={isControlled ? checked : undefined}
        defaultChecked={!isControlled ? defaultChecked : undefined}
        onChange={handleChange}
        disabled={disabled}
      />
      <span className="ts-track" aria-hidden>
        <span className="ts-thumb" />
        <span className="ts-icon off">{offLabel}</span>
        <span className="ts-icon on">{onLabel}</span>
      </span>
    </label>
  );
}

export default ToggleSwitch;
