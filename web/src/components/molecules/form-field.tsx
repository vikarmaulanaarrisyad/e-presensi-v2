import * as React from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input, type InputProps } from "@/components/atoms/input";

export interface FormFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
  htmlFor?: string;
  required?: boolean;
  description?: string;
  error?: string;
  children?: React.ReactNode;
}

/**
 * FormField (Molecule)
 * Combines Label, Helper Text, Form Control (Atom), and Error Messages.
 */
export const FormField = React.forwardRef<HTMLDivElement, FormFieldProps>(
  (
    {
      className,
      label,
      htmlFor,
      required = false,
      description,
      error,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <div ref={ref} className={cn("flex w-full flex-col gap-1.5", className)} {...props}>
        {label && (
          <div className="flex items-center justify-between">
            <label
              htmlFor={htmlFor}
              className="text-sm font-medium leading-none text-foreground select-none flex items-center gap-1"
            >
              <span>{label}</span>
              {required && <span className="text-destructive font-semibold" title="Wajib Diisi">*</span>}
            </label>
          </div>
        )}

        {children}

        {description && !error && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}

        {error && (
          <div className="flex items-center gap-1 text-xs text-destructive animate-in fade-in slide-in-from-top-1 duration-150">
            <AlertCircle className="size-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>
    );
  }
);

FormField.displayName = "FormField";

export interface FormInputProps extends InputProps {
  label?: string;
  required?: boolean;
  description?: string;
  error?: string;
  containerClassName?: string;
}

/**
 * FormInput (Molecule Composite)
 * A ready-to-use FormField with an atomic Input inside.
 */
export const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  (
    {
      id,
      name,
      label,
      required,
      description,
      error,
      containerClassName,
      ...inputProps
    },
    ref
  ) => {
    const inputId = id || name;

    return (
      <FormField
        label={label}
        htmlFor={inputId}
        required={required}
        description={description}
        error={error}
        className={containerClassName}
      >
        <Input
          id={inputId}
          name={name}
          ref={ref}
          hasError={Boolean(error)}
          {...inputProps}
        />
      </FormField>
    );
  }
);

FormInput.displayName = "FormInput";
