import PageShell from '@/components/PageShell';
import { Mail, Phone } from 'lucide-react';
export default function Contact() {
    return (<PageShell title="Contact Hajara Ilm Academy" wide>
      <section className="relative overflow-hidden rounded-[1.8rem] bg-[#172d43] px-6 py-10 text-white sm:px-10 sm:py-14">
        <div className="pointer-events-none absolute -right-12 -top-16 h-64 w-64 rounded-full border border-[#d9bf85]/20"/>
        <p className="text-xs font-bold uppercase tracking-[.24em] text-[#e7cc91]">We are here to help</p>
        <h2 className="mt-3 max-w-2xl font-heading text-3xl font-semibold leading-tight sm:text-4xl">Get in touch with Hajara Ilm Academy.</h2>
        <p className="mt-4 max-w-xl leading-7 text-[#dce5ed]">For information about the six-month Islamic learning programme, please contact us using the details below.</p>
      </section>
      <div className="grid gap-4 md:grid-cols-2">
        <a href="tel:+918015580602" className="group flex items-center gap-5 rounded-[1.5rem] border border-[#e7e0d4] bg-white p-6 transition hover:-translate-y-1 hover:border-[#c5a66a] hover:shadow-lg hover:shadow-[#172d43]/5 sm:p-8">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#f1eadc] text-[#8e7040]"><Phone className="h-6 w-6"/></span>
          <span className="min-w-0"><span className="block text-sm text-[#7b8792]">Call us</span><span className="mt-1 block break-words text-lg font-semibold text-[#172d43] group-hover:text-[#8e7040]">+91 80155 80602</span></span>
        </a>
        <a href="mailto:hajarailmacademy@gmail.com" className="group flex items-center gap-5 rounded-[1.5rem] border border-[#e7e0d4] bg-white p-6 transition hover:-translate-y-1 hover:border-[#c5a66a] hover:shadow-lg hover:shadow-[#172d43]/5 sm:p-8">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#f1eadc] text-[#8e7040]"><Mail className="h-6 w-6"/></span>
          <span className="min-w-0"><span className="block text-sm text-[#7b8792]">Email us</span><span className="mt-1 block break-all text-lg font-semibold text-[#172d43] group-hover:text-[#8e7040]">hajarailmacademy@gmail.com</span></span>
        </a>
      </div>
    </PageShell>);
}
