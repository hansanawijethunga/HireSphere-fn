const INPUT_BASE =
  'mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm ' +
  'text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500';

function SelectField({ field, value, onChange }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700" htmlFor={field.name}>
        {field.label}
      </label>
      <select
        className={INPUT_BASE}
        id={field.name}
        name={field.name}
        onChange={onChange}
        required={field.required}
        value={value}
      >
        <option value="">Select…</option>
        {field.options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

function TextField({ field, value, onChange }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700" htmlFor={field.name}>
        {field.label}
      </label>
      <input
        className={INPUT_BASE}
        id={field.name}
        min={field.min}
        name={field.name}
        onChange={onChange}
        required={field.required}
        type={field.type}
        value={value}
      />
    </div>
  );
}

export function FormField({ field, value, onChange }) {
  if (field.type === 'select') {
    return <SelectField field={field} onChange={onChange} value={value} />;
  }
  return <TextField field={field} onChange={onChange} value={value} />;
}
