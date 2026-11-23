import AudienceField, { audienceLabel, audiencePayload } from './admin/AudienceField';
import { useEffect, useState } from 'react';
import { curriculum } from '@/data/curriculum';
import { portal } from '@/services/portalApi';
import { Plus, Save, Pencil, FileCheck2, Globe, BookOpen, Bell, BarChart3, RefreshCw, X } from 'lucide-react';

const input = 'hia-management-input w-full rounded-xl border border-[#26364e] bg-[#090d14] px-4 py-3 text-sm text-white placeholder:text-[#8a9db9] focus:border-[#8bb5f4] focus:outline-none';
const btn = 'inline-flex items-center justify-center gap-2 rounded-xl bg-[#244b88] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#315fa6] disabled:opacity-50';
const fields = {
  Teachers: [['name','Teacher name','text',true],['subject','Subject','text'],['email','Email','email'],['bio','Biography','textarea'],['active','Active','checkbox']],
  Lessons: [['learningArea','Learning area','text',true],['title','Lesson title','text',true],['body','Lesson content','textarea'],['resourceUrl','HTTPS resource link','url'],['positionNumber','Display order','number'],['published','Published to enrolled students','checkbox']],
  Notifications: [['title','Notification title','text',true],['message','Message','textarea',true]],
};
const endpoints={Teachers:'teachers',Lessons:'lessons',Notifications:'notifications',Certificates:'certificates','Website Content':'site-content',Reports:'reports'};
const titles={Teachers:'Manage educator profiles',Lessons:'Create and publish learning resources',Notifications:'Send a student notification',Certificates:'Issue a completion certificate','Website Content':'Edit existing website content',Reports:'Academy reports'};
const descriptions={Lessons:'Official programme: Islamic Learning Programme — இஸ்லாமியக் கல்விப் பாடத்திட்டம். Add, edit, reorder, publish or delete lessons within the four learning areas.',Certificates:'Select an enrollment to issue its certificate. The backend validates eligibility.','Website Content':'These are the website text overrides currently supported by your backend. Drafts and version history are not implemented yet.',Notifications:'Send to a batch, all enrolled students, or an individual student. Students with browser push enabled also receive an alert.',Reports:'Numbers are provided by your existing reporting endpoint.'};
export default function ManagementSections({section,enrollments=[],audience,students,studentsError}) {
  const endpoint=endpoints[section];
  const [items,setItems]=useState([]),[form,setForm]=useState({}),[editing,setEditing]=useState(null);
  const [error,setError]=useState(''),[success,setSuccess]=useState(''),[key,setKey]=useState('home.hero_title'),[value,setValue]=useState(''),[enrollmentId,setEnrollmentId]=useState(''),[busy,setBusy]=useState(false);
  const reload=()=>portal(`/admin/${endpoint}`).then(setItems).catch(e=>setError(e.message));
  useEffect(()=>{setForm({});setEditing(null);setError('');setSuccess('');reload();},[section]);
  const set=(name,v)=>setForm(x=>({...x,[name]:v}));
  async function save(e){
    e.preventDefault();setError('');setSuccess('');setBusy(true);
    try {
      let result;
      if(section==='Website Content') result=await portal(`/admin/site-content/${encodeURIComponent(key)}`,{method:'PUT',body:JSON.stringify({value})});
      else if(section==='Certificates') result=await portal('/admin/certificates',{method:'POST',body:JSON.stringify({enrollmentId:Number(enrollmentId)})});
      else {const body={...form};if(section==='Lessons'){delete body.courseId;body.positionNumber=Number(body.positionNumber||0);}if(section==='Notifications'){delete body.audience;delete body.studentId;Object.assign(body,audiencePayload(form.audience,audience.current,form.studentId ?? ''));}result=await portal(`/admin/${endpoint}${editing?`/${editing}`:''}`,{method:editing?'PUT':'POST',body:JSON.stringify(body)});}
      if (section === 'Notifications') {
        const delivery = result.push;
        const summary = delivery.status === 'NOT_CONFIGURED' ? 'Browser push is not configured.'
          : delivery.status === 'NO_DEVICES' ? 'No subscribed devices for this audience.'
          : `${delivery.accepted} device(s) accepted by Firebase, ${delivery.failed} failed.`;
        setSuccess(`Notification published. ${summary}`);
      } else setSuccess(section==='Certificates'?`Issued certificate ${result.certificateCode}`:'Changes saved successfully');setForm({});setEditing(null);await reload();
    }catch(ex){setError(ex.message)}finally{setBusy(false)}
  }
  async function remove(item){
    if(!window.confirm(`Delete “${item.title}”? This also removes it from students' dashboards.`))return;
    setBusy(true);setError('');setSuccess('');
    try{await portal(`/admin/${endpoint}/${item.id}`,{method:'DELETE'});if(editing===item.id){setEditing(null);setForm({});}setSuccess('Deleted successfully');await reload();}catch(e){setError(e.message);}finally{setBusy(false);}
  }
  return <section className="hia-management space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-semibold text-white">{titles[section]}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#a5b4ca]">{descriptions[section]||'Manage academy records securely.'}</p></div><button type="button" onClick={reload} className="flex items-center gap-2 rounded-xl border border-[#30496b] px-4 py-2.5 text-xs font-semibold text-[#c6dcff] hover:bg-white/5"><RefreshCw size={14}/> Refresh</button></div>
    {(error||(section==='Notifications'&&(audience.error||studentsError)))&&<p role="alert" className="rounded-xl border border-red-500/30 bg-red-950/30 p-4 text-sm text-red-200">{error||audience.error||studentsError}</p>}
    {success&&<p role="status" className="rounded-xl border border-blue-500/30 bg-blue-950/30 p-4 text-sm text-blue-200">{success}</p>}
    {section==='Reports'?<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Object.entries(items||{}).map(([k,v])=><div key={k} className="rounded-2xl border border-[#26364e] bg-[#131c2b] p-6"><p className="text-sm capitalize text-[#a5b4ca]">{k.replace(/([A-Z])/g,' $1')}</p><p className="mt-4 break-words text-2xl font-semibold text-white">{typeof v==='object'?JSON.stringify(v):String(v??'—')}</p></div>)}</div>:<div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <form onSubmit={save} className="space-y-5 rounded-2xl border border-[#26364e] bg-[#131c2b] p-5 sm:p-7"><div className="flex items-center gap-3 border-b border-white/10 pb-4"><span className="rounded-xl bg-[#192b48] p-2.5 text-[#c6dcff]">{section==='Website Content'?<Globe size={19}/>:section==='Lessons'?<BookOpen size={19}/>:section==='Certificates'?<FileCheck2 size={19}/>:<Plus size={19}/>}</span><div><h3 className="font-semibold text-white">{editing?'Edit record':section==='Website Content'?'Content editor':section==='Certificates'?'New certificate':'Add new record'}</h3><p className="mt-1 text-xs text-[#a5b4ca]">Changes are saved through the existing backend</p></div></div>
        {section==='Notifications' && <AudienceField {...audience} selection={form.audience} onChange={value=>set('audience',value)}
          students={students} studentId={form.studentId} onStudentChange={value=>set('studentId',value)} />}
        {section==='Website Content'?<><label className="block space-y-2 text-sm font-medium text-[#d9e6f8]">Content field<select className={input} value={key} onChange={e=>{setKey(e.target.value);setValue(items.find(x=>x.contentKey===e.target.value)?.contentValue||'')}}><option value="home.hero_title">Homepage heading</option><option value="home.hero_subtitle">Homepage subtitle</option><option value="home.bismillah">Bismillah</option></select></label><label className="block space-y-2 text-sm font-medium text-[#d9e6f8]">Content<textarea className={input} rows={5} required value={value} onChange={e=>setValue(e.target.value)}/></label></>:
        section==='Certificates'?<label className="block space-y-2 text-sm font-medium text-[#d9e6f8]">Student enrollment<select className={input} required value={enrollmentId} onChange={e=>setEnrollmentId(e.target.value)}><option value="">Select enrollment</option>{enrollments.map(e=><option key={e.id} value={e.id}>{e.student} — {e.course} (#{e.id})</option>)}</select></label>:
        (fields[section]||[]).map(([name,label,type,required])=><label key={name} className="block space-y-2 text-sm font-medium text-[#d9e6f8]">{type==='checkbox'?<span className="flex items-center gap-3"><input className="h-4 w-4 accent-blue-500" type="checkbox" checked={!!form[name]} onChange={e=>set(name,e.target.checked)}/>{label}</span>:<>{label}{type==='textarea'?<textarea className={input} rows={5} required={!!required} value={form[name]??''} onChange={e=>set(name,e.target.value)}/>:name==='learningArea'?<select className={input} required value={form[name]??''} onChange={e=>set(name,e.target.value)}><option value="">Select learning area</option>{curriculum.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select>:<input className={input} type={type} required={!!required} value={form[name]??''} onChange={e=>set(name,e.target.value)}/>}</>}</label>)}
        <div className="flex flex-wrap gap-3 pt-1"><button disabled={busy||(section==='Notifications'&&(!audience.batches||!audience.current||!!audience.error))} className={btn}><Save size={16}/>{busy?'Saving…':editing?'Save changes':section==='Certificates'?'Issue certificate':section==='Notifications'?'Send notification':'Save changes'}</button>{editing&&<button type="button" onClick={()=>{setEditing(null);setForm({})}} className="flex items-center gap-2 rounded-xl border border-[#30496b] px-4 py-2 text-sm text-[#c6dcff]"><X size={15}/> Cancel</button>}</div>
      </form>
      <div className="rounded-2xl border border-[#26364e] bg-[#131c2b] p-5 sm:p-7"><div className="mb-5 flex items-center justify-between gap-2"><div><h3 className="font-semibold text-white">Existing records</h3><p className="mt-1 text-xs text-[#a5b4ca]">{Array.isArray(items)?items.length:0} records</p></div></div><div className="max-h-[620px] space-y-3 overflow-y-auto pr-1">{Array.isArray(items)&&items.map(item=><article key={item.id} className="rounded-xl border border-[#30496b] bg-[#192b48] p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0 flex-1"><p className="break-words text-sm font-semibold text-white">{item.name||item.title||item.contentKey||item.certificateCode||`#${item.id}`}</p><p className="mt-2 break-words text-xs leading-5 text-[#a5b4ca]">{section==='Lessons'?`${curriculum.find(a=>a.id===item.learningArea)?.title||'Select learning area'} · ${item.published?'Published':'Draft'} · ${item.body||''}`:section==='Notifications'?`To: ${item.studentId||(item.userId?`Student record #${item.userId}` : audienceLabel(audience.batches,item.batchId))} · ${item.message}`:section==='Certificates'?`Enrollment #${item.enrollmentId} · ${item.certificateCode}`:section==='Website Content'?item.contentValue:item.subject||item.bio||''}</p></div>{['Teachers','Lessons'].includes(section)&&<button type="button" className="rounded-lg border border-[#30496b] px-3 py-2 text-xs font-semibold text-[#c6dcff] hover:bg-white/5" onClick={()=>{setEditing(item.id);setForm(item);window.scrollTo({top:0,behavior:'smooth'})}}><Pencil size={13} className="mr-1 inline"/> Edit</button>}{['Lessons','Notifications'].includes(section)&&<button type="button" disabled={busy} onClick={()=>remove(item)} className="rounded-lg border border-red-400/40 px-3 py-2 text-xs text-red-300 disabled:opacity-50">Delete</button>}{section==='Website Content'&&<button type="button" className="rounded-lg border border-[#30496b] px-3 py-2 text-xs text-[#c6dcff]" onClick={()=>{setKey(item.contentKey);setValue(item.contentValue)}}>Edit</button>}</div></article>)}{Array.isArray(items)&&items.length===0&&<p className="rounded-xl border border-dashed border-[#30496b] p-6 text-center text-sm text-[#a5b4ca]">No records found yet.</p>}</div></div>
    </div>}
  </section>;
}
