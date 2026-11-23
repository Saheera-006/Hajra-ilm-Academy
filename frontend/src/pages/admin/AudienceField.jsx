import { useState } from 'react';
import { inputClass } from '@/components/kit';
import { useApi } from '@/pages/student/useStudentData';

const ALL = 'all';
const STUDENT = 'student';

// A missing selection uses the open batch, if one exists.
export const defaultAudience = (selection, current) =>
  selection ?? (current?.id ? String(current.id) : '');

export function audiencePayload(selection, current, studentId) {
  const value = defaultAudience(selection, current);
  if (!value) throw new Error("Select an audience.");
  return value === STUDENT
    ? { studentId: studentId.trim(), batchId: null }
    : { batchId: value === ALL ? null : Number(value) };
}

export function audienceLabel(batches, id) {
  return id == null ? 'All enrolled students' :
    batches?.find(batch => String(batch.id) === String(id))?.name ?? `Batch #${id}`;
}

export default function AudienceField({ batches, current, selection, onChange, students, studentId = '', onStudentChange }) {
  const value = defaultAudience(selection, current);
  return <>
    <label className="block space-y-2 text-sm font-medium">Audience
      <select required className={inputClass} value={value} onChange={e => onChange(e.target.value)}>
        <option value="" disabled>Select an audience</option>
        <option value={ALL}>All enrolled students</option>
        {(batches ?? []).map(batch => <option key={batch.id} value={batch.id}>
          {batch.name}{String(batch.id) === String(current?.id) ? ' (registration open)' : ''}
        </option>)}
        {students && <option value={STUDENT}>Individual student</option>}
      </select>
    </label>
    {value === STUDENT && students && <StudentPicker students={students} value={studentId} onChange={onStudentChange} />}
  </>;
}

function StudentPicker({ students, value, onChange }) {
  const [open, setOpen] = useState(false);
  const query = value.trim().toLowerCase();
  const choices = students.filter(student => student.studentId &&
    `${student.studentId} ${student.name}`.toLowerCase().includes(query));
  const selected = students.some(student => student.studentId?.toLowerCase() === query);
  return <div className="relative" onBlur={e => {
    if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
  }} onKeyDown={e => { if (e.key === 'Escape') setOpen(false); }}>
    <label className="block space-y-2 text-sm font-medium">Student ID
      <input className={inputClass} required autoComplete="off" aria-expanded={open}
        aria-controls={open ? 'notification-student-options' : undefined} role="combobox"
        placeholder="Search by student ID or name" value={value} onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)} onChange={e => { onChange(e.target.value); setOpen(true); }}
        ref={node => node?.setCustomValidity(value && !selected ? 'Choose an available student ID.' : '')} />
    </label>
    {open && <div id="notification-student-options" role="listbox" aria-label="Available student IDs"
      className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-[var(--p-border)] bg-[var(--p-surface-2)] p-1 shadow-lg">
      {choices.length ? choices.map(student => <button type="button" key={student.id} role="option"
        aria-selected={student.studentId.toLowerCase() === query}
        className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-[var(--p-surface-3)]"
        onClick={() => { onChange(student.studentId); setOpen(false); }}>
        <span className="font-mono">{student.studentId}</span> · {student.name}
      </button>) : <p className="p-2 text-sm text-[var(--p-muted)]">No matching student IDs.</p>}
    </div>}
  </div>;
}

export function useAudienceBatches() {
  const batches = useApi('/admin/batches');
  const current = useApi('/batches/current');
  return {
    batches: batches.data,
    current: current.data,
    loading: batches.loading || current.loading,
    error: batches.error || current.error,
  };
}
