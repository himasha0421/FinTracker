import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toNumber } from '../utils';

interface NumberFieldProps {
  id: string;
  label: string;
  value: number;
  onChange: (next: number) => void;
  step?: string;
  min?: string;
  max?: string;
}

export function NumberField({ id, label, value, onChange, step = '100', min = '0', max }: NumberFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        min={min}
        max={max}
        step={step}
        value={Number.isFinite(value) ? value : 0}
        onChange={event => onChange(toNumber(event.target.value))}
      />
    </div>
  );
}
