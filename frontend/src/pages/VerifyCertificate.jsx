import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
export default function VerifyCertificate(){
 const {code}=useParams();const [state,setState]=useState({loading:true});
 useEffect(()=>{let active=true;fetch(`/api/public/certificates/${encodeURIComponent(code)}`).then(async r=>{if(!r.ok)throw Error('Certificate not found or invalid');return r.json()}).then(data=>active&&setState({data})).catch(e=>active&&setState({error:e.message}));return()=>{active=false}},[code]);
 return <main className="mx-auto max-w-2xl px-5 py-20"><section className="rounded-3xl border border-amber-300 bg-white p-8 text-center shadow-lg"><img src="/logo-480.webp" alt="Hajara Ilm Academy" className="mx-auto mb-5 h-24 w-24 object-contain"/><h1 className="text-3xl font-bold text-slate-900">Certificate Verification</h1>{state.loading?<p className="mt-6">Checking certificate…</p>:state.error?<p role="alert" className="mt-6 text-red-700">{state.error}</p>:<div className="mt-6 space-y-3 text-slate-800"><p className="font-bold text-green-700">✓ Verified certificate</p><p className="text-2xl font-semibold">{state.data.studentName}</p><p>{state.data.programme}</p><p>Certificate: {state.data.certificateCode}</p><p>Issued: {String(state.data.issuedAt).slice(0,10)}</p></div>}</section></main>
}
