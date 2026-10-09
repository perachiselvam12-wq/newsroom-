import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 py-10 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 text-xs">
          <div>
            <div className="flex items-center gap-2 mb-3 text-white">
              <span className="w-6 h-6 rounded bg-red-600 text-white flex items-center justify-center font-editorial font-bold text-sm">
                N
              </span>
              <span className="font-editorial text-base font-bold">Newsroom AI</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Automated video meeting intelligence, speech transcription, news headline generation, and structured reporting.
            </p>
          </div>

          <div>
            <h4 className="text-slate-200 font-semibold mb-3">Media & Ingestion</h4>
            <ul className="space-y-1.5 text-slate-400">
              <li>Max 1 GiB Chunked Uploads</li>
              <li>MP4, MOV, WebM, WAV, MP3</li>
              <li>Resumable stream processing</li>
              <li>Direct text and meeting notes</li>
            </ul>
          </div>

          <div>
            <h4 className="text-slate-200 font-semibold mb-3">Languages & AI</h4>
            <ul className="space-y-1.5 text-slate-400">
              <li>English (US/UK/International)</li>
              <li>தமிழ் (Tamil Speech & Script)</li>
              <li>Multilingual Cross-Translation</li>
              <li>Gemini Multimodal Processing</li>
            </ul>
          </div>

          <div>
            <h4 className="text-slate-200 font-semibold mb-3">Security & Storage</h4>
            <ul className="space-y-1.5 text-slate-400">
              <li>User-isolated workspace storage</li>
              <li>Zero public file sharing by default</li>
              <li>Verified decision isolation</li>
              <li>One-click secure deletion</li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>© {new Date().getFullYear()} Newsroom AI. All rights reserved.</p>
          <div className="flex items-center gap-6 text-slate-400">
            <span>Server-side Speech & LLM Intelligence</span>
            <span aria-hidden="true">·</span>
            <span>Broadsheet-Grade Analysis</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
