import React from 'react';
import { 
  X, 
  HelpCircle, 
  Smartphone, 
  Timer, 
  Flag, 
  FileText, 
  CheckCircle2, 
  Sparkles,
  Camera,
  Layers
} from 'lucide-react';
import { soundManager } from '../utils/soundEffects';

export default function UserGuideModal({ isOpen, onClose, theme = 'dark' }) {
  if (!isOpen) return null;

  const steps = [
    {
      step: '১',
      title: 'মোবাইল ক্যামেরা কানেক্ট করা (Connect Camera)',
      desc: 'ক্যামেরা সেকশনে "ADD CAM" বাটনে ক্লিক করুন। প্রদর্শিত QR কোডটি স্মার্টফোনের ক্যামেরা দিয়ে স্ক্যান করুন এবং ব্রাউজারে Camera Permission "Allow" দিন। সাথে সাথে লাইভ ভিডিও ড্যাশবোর্ডে চলে আসবে!',
      tip: 'একাধিক ফোন দিয়ে CAM 1 (Drive) ও CAM 2 (Arm) একসাথে কানেক্ট করে DUAL SPLIT ভিউ দেখা যাবে।',
      icon: Smartphone,
      color: 'text-[#00c2cb] bg-[#00c2cb]/15 border-[#00c2cb]/30'
    },
    {
      step: '২',
      title: 'ম্যাচ টাইমার চালানো (Match Timer)',
      desc: 'ম্যাচ শুরু হলে কীবোর্ডের Space বাটন বা হেডারে থাকা Play বাটনে চাপ দিন। সময় ৩ মিনিটের নিচে নামলে হলুদ সতর্কতা এবং ১ মিনিটের নিচে নামলে লাল অ্যালার্ম বেজে উঠবে।',
      tip: 'ড্রপডাউন থেকে ৮ মিনিট (অফিসিয়াল), ৫ মিনিট বা ১০ মিনিট বেছে নেওয়া যায়।',
      icon: Timer,
      color: 'text-amber-400 bg-amber-500/15 border-amber-500/30'
    },
    {
      step: '৩',
      title: 'ভিকটিম ও হ্যাজার্ড লগ করা (Log Incidents)',
      desc: 'রোভার এরেনায় ঘোরার সময় ভিকটিম দেখতে পেলে সবুজ "+ VICTIM SIGHTED" বাটনে ক্লিক করুন (বা "S" চেপে ছবি তুলুন)। বাধা বা ধ্বংসস্তূপ দেখলে "+ HAZARD / DEBRIS" চাপুন।',
      tip: 'প্রতিটি লগে টাইমারের অবশিষ্ট সময় এবং বর্তমান তাপমাত্রা স্বয়ংক্রিয়ভাবে সেভ হয়।',
      icon: Flag,
      color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30'
    },
    {
      step: '৪',
      title: 'বিচারকদের রিপোর্ট তৈরি (Export & Debrief)',
      desc: 'ম্যাচ শেষে হেডারের "DEBRIEF" বাটনে চাপ দিলে বিচারকদের জন্য সুন্দর সামারি সার্টিফিকেট ওপেন হবে। সেখান থেকে "PRINT / PDF" চেপে ১-ক্লিকেই প্রিন্ট বা PDF ডাউনলোড করা যাবে।',
      tip: 'লগবুক থেকে "EXPORT LOG" চাপলে এক্সেল (.csv) ফাইল হিসেবে সব ডেটা সেভ হবে।',
      icon: FileText,
      color: 'text-purple-400 bg-purple-500/15 border-purple-500/30'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className={`w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border transition-all ${
          theme === 'light' ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#0a0f18] border-[#00c2cb]/40 text-white'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${
          theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-[#06090e] border-[#162338]'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#00c2cb]/15 border border-[#00c2cb]/30 text-[#00c2cb]">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold font-tech tracking-wider">
                UIU RESCUE ROVER - সহজ নির্দেশিকা (QUICK GUIDE)
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                যে কেউ এই ৪টি ধাপে সহজেই পুরো ড্যাশবোর্ড পরিচালনা করতে পারবেন
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-black/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps List */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto font-mono text-xs">
          {steps.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div 
                key={idx}
                className={`p-4 rounded-xl border transition-all ${
                  theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-[#0f1624] border-[#162338]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm border flex-shrink-0 ${item.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className={`text-xs sm:text-sm font-bold font-tech ${
                        theme === 'light' ? 'text-slate-900' : 'text-white'
                      }`}>
                        {item.title}
                      </h4>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#00c2cb]/10 text-[#00c2cb] font-bold">
                        STEP {item.step}
                      </span>
                    </div>
                    <p className={`text-xs leading-relaxed ${theme === 'light' ? 'text-slate-600' : 'text-slate-300'}`}>
                      {item.desc}
                    </p>
                    <div className="pt-1 flex items-center gap-1.5 text-[11px] text-[#00c2cb]">
                      <Sparkles className="w-3 h-3 flex-shrink-0" />
                      <span className="font-semibold">{item.tip}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className={`px-6 py-3.5 border-t flex items-center justify-between font-mono text-xs ${
          theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-[#06090e] border-[#162338]'
        }`}>
          <span className="text-slate-400">
            UIU Rescue Rover Team (#URRT) • Mission Control
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#00c2cb] hover:bg-[#00e5ff] text-black font-bold shadow-md shadow-cyan-500/20 transition-all"
          >
            বুঝেছি / GOT IT
          </button>
        </div>

      </div>
    </div>
  );
}
