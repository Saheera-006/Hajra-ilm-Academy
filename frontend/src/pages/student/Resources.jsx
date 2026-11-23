import { Link } from 'react-router-dom';
import { useApi } from './useStudentData';
import { Button, Card, PageHeader, StatusMessage } from '@/components/kit';
const API=import.meta.env.VITE_API_BASE_URL??'';
export function Notes(){
 const notes=useApi('/my-notes');
 return <div className="space-y-5"><PageHeader title="Notes" description="PDF, images and PowerPoint files shared by your academy."/><Button variant="secondary" onClick={notes.reload}>Refresh</Button><StatusMessage error={notes.error}/>{notes.loading?<p>Loading notes…</p>:notes.data?.length?<div className="grid gap-4 sm:grid-cols-2">{notes.data.map(n=><Card key={n.id}><h2 className="font-semibold">{n.title}</h2><p className="mt-2 break-all text-sm text-[var(--p-muted)]">{n.file_name}</p><a className="mt-4 inline-block font-semibold text-[var(--p-accent)]" href={`${API}/api/portal/notes/${n.id}/file`}>Download file ↓</a></Card>)}</div>:!notes.error&&<Card>No notes have been shared yet.</Card>}</div>;
}
export function Meetings({compact=false}){
 const meetings=useApi('/my-meetings');
 return <section className="space-y-4">{compact?<div className="flex justify-between"><h2 className="text-lg font-semibold">Google Meet classes</h2><Link to="/student/notes" className="text-[var(--p-accent)]">Open Notes →</Link></div>:<PageHeader title="Google Meet" description="Join the classes shared with you by the academy."/>}<Button variant="secondary" onClick={meetings.reload}>Refresh class links</Button><StatusMessage error={meetings.error}/>{meetings.loading?<p>Loading class links…</p>:meetings.data?.length?<div className="grid gap-4 sm:grid-cols-2">{meetings.data.map(m=><Card key={m.id}><h3 className="font-semibold">{m.title}</h3><a href={m.meet_url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block rounded-xl bg-[var(--p-accent)] px-4 py-3 text-sm font-semibold text-[var(--p-accent-fg)]">Join Google Meet ↗</a></Card>)}</div>:!meetings.error&&<Card>No class links shared yet.</Card>}</section>;
}
