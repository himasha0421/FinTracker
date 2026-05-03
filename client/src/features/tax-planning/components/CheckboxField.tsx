interface CheckboxFieldProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}

export function CheckboxField({ id, label, checked, onChange }: CheckboxFieldProps) {
  return (
    <label htmlFor={id} className="flex items-center gap-3 rounded-md border px-3 py-2">
      <input
        id={id}
        type="checkbox"
        className="h-4 w-4"
        checked={checked}
        onChange={event => onChange(event.target.checked)}
      />
      <span className="text-sm">{label}</span>
    </label>
  );
}
