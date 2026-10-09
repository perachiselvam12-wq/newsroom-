import React from 'react';
import { ArrowRight, Video, FileText, CheckCircle2, Shield, Languages, Sparkles, Volume2, Award, Download } from 'lucide-react';
import heroImage from '../assets/images/newsroom_hero_editorial_1791534962129.jpg';

interface LandingPageProps {
  onGetStarted: () => void;
  onLogin: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, onLogin }) => {
  return (
    <div className="bg-slate-50 text-slate-900">
      {/* HERO SECTION */}
      <section className="relative overflow-hidden bg-slate-900 text-white border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-red-400">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                <span>AI Meeting Intelligence & Headline Engine</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-editorial font-bold tracking-tight text-white leading-[1.12]">
                Turn Every Meeting into Newsworthy Insights.
              </h1>

              <p className="text-lg sm:text-xl text-slate-300 font-normal leading-relaxed max-w-2xl">
                Upload up to 1 GiB meeting recordings or paste discussion transcripts. 
                Newsroom AI transcribes spoken dialogue, isolates confirmed decisions from suggestions, 
                and crafts journalistic headlines and actionable executive briefings in English and Tamil.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-4">
                <button
                  onClick={onGetStarted}
                  className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-semibold text-white bg-red-600 rounded hover:bg-red-700 transition-colors shadow-md"
                >
                  <span>Start Free Analysis</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={onLogin}
                  className="inline-flex items-center gap-2 px-5 py-3.5 text-sm font-medium text-slate-200 bg-slate-800/80 border border-slate-700 rounded hover:bg-slate-800 hover:text-white transition-colors"
                >
                  <span>Journalist Sign In</span>
                </button>
              </div>

              {/* Trust Indicators */}
              <div className="pt-6 border-t border-slate-800/80 grid grid-cols-3 gap-6 text-xs text-slate-400">
                <div>
                  <div className="font-semibold text-white text-sm font-mono-num">1 GiB Limit</div>
                  <div>Chunked video uploads</div>
                </div>
                <div>
                  <div className="font-semibold text-white text-sm">EN + தமிழ்</div>
                  <div>Native bilingual output</div>
                </div>
                <div>
                  <div className="font-semibold text-white text-sm">Strict Integrity</div>
                  <div>Zero invented facts</div>
                </div>
              </div>
            </div>

            {/* Visual Media Slot */}
            <div className="lg:col-span-5 relative">
              <div className="relative rounded-lg overflow-hidden border border-slate-700/80 shadow-2xl bg-slate-800">
                <img
                  src={heroImage}
                  alt="Newsroom editorial studio"
                  className="w-full h-[380px] object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent flex flex-col justify-end p-6">
                  <div className="inline-flex items-center gap-2 text-xs font-medium text-red-400 mb-1">
                    <span>LIVE REPORT SAMPLE</span>
                  </div>
                  <h3 className="text-white font-editorial font-bold text-lg leading-snug">
                    "Quarterly Engineering Council Ratifies Microservices Migration by Q4"
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-slate-300 mt-2">
                    <span>3 Decisions Ratified</span>
                    <span>·</span>
                    <span>8 Action Items</span>
                    <span>·</span>
                    <span>Audio Verified</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CORE CAPABILITIES SECTION */}
      <section id="features" className="py-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mb-14">
            <span className="text-xs font-semibold tracking-wider uppercase text-red-600">Editorial Methodology</span>
            <h2 className="text-3xl font-editorial font-bold tracking-tight text-slate-900 mt-2">
              Transforming Spoken Hours into Verified Executive Intelligence
            </h2>
            <p className="text-slate-600 mt-3 text-base">
              Standard transcription tools produce walls of raw text. Newsroom AI applies rigorous journalism logic to separate signal from noise.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-lg border border-slate-200 bg-slate-50/50 hover:border-slate-300 transition-all">
              <div className="w-10 h-10 rounded bg-red-100 text-red-700 flex items-center justify-center mb-4">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Multi-Angle Headline Station</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Generates 1 primary headline plus 5 stylistic variations: Breaking news alert, formal broadsheet, corporate boardroom briefing, digital web story, and social hook.
              </p>
            </div>

            <div className="p-6 rounded-lg border border-slate-200 bg-slate-50/50 hover:border-slate-300 transition-all">
              <div className="w-10 h-10 rounded bg-slate-900 text-white flex items-center justify-center mb-4">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Decisions vs. Brainstorming</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Strict editorial discrimination: confirmed commitments are isolated into definitive resolutions, keeping tentative suggestions and unfinished debates segregated.
              </p>
            </div>

            <div className="p-6 rounded-lg border border-slate-200 bg-slate-50/50 hover:border-slate-300 transition-all">
              <div className="w-10 h-10 rounded bg-red-100 text-red-700 flex items-center justify-center mb-4">
                <Languages className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Native English & Tamil (தமிழ்)</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Full dual-language capabilities. Transcribes and analyzes Tamil speech into natural literary Tamil newsroom prose, or provides cross-lingual translation into English.
              </p>
            </div>

            <div className="p-6 rounded-lg border border-slate-200 bg-slate-50/50 hover:border-slate-300 transition-all">
              <div className="w-10 h-10 rounded bg-slate-900 text-white flex items-center justify-center mb-4">
                <Award className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Important Points Extraction</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Categorized key points with High, Medium, and Low priority tags. Grouped into Main Announcements, Facts & Figures, Key Discussions, Solutions, and Unresolved Issues.
              </p>
            </div>

            <div className="p-6 rounded-lg border border-slate-200 bg-slate-50/50 hover:border-slate-300 transition-all">
              <div className="w-10 h-10 rounded bg-red-100 text-red-700 flex items-center justify-center mb-4">
                <Video className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">1 GiB Resumable Video Pipeline</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Engineered for substantial boardroom recordings. High-throughput chunked stream upload with pause, resume, progress percentage, and speed tracking in MiB/s.
              </p>
            </div>

            <div className="p-6 rounded-lg border border-slate-200 bg-slate-50/50 hover:border-slate-300 transition-all">
              <div className="w-10 h-10 rounded bg-slate-900 text-white flex items-center justify-center mb-4">
                <Download className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">PDF, Markdown & Text Export</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Download formatted reports in printable PDF, structured Markdown, or clean plain text ready to distribute to stakeholders, editors, and executives.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS / PIPELINE SECTION */}
      <section id="workflow" className="py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-semibold tracking-wider uppercase text-red-600">Automated Workflow</span>
            <h2 className="text-3xl font-editorial font-bold tracking-tight text-slate-900 mt-2">
              Four Stages from Media Upload to Broadsheet Report
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm relative">
              <div className="text-xs font-mono font-bold text-red-600 mb-2">STAGE 01</div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Ingestion & Validation</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Upload up to 1 GiB MP4, MOV, WebM video, or audio files via chunked streams. Alternatively, paste meeting notes directly.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm relative">
              <div className="text-xs font-mono font-bold text-red-600 mb-2">STAGE 02</div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Speech Recognition</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Acoustic speech models isolate vocal channels, identify speakers, and produce synchronized multilingual transcript segments.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm relative">
              <div className="text-xs font-mono font-bold text-red-600 mb-2">STAGE 03</div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Journalistic Analysis</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Gemini AI performs deep structural analysis: extracts lead events, parses key metrics, isolates resolutions, and tags action items.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm relative">
              <div className="text-xs font-mono font-bold text-red-600 mb-2">STAGE 04</div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Editorial Dispatch</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Review interactive headline choices, executive briefing, action tables, and export to PDF, Markdown, or download full transcript.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* LANGUAGE SUPPORT & SECURITY DUAL STRIP */}
      <section id="languages" className="py-16 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-red-600 uppercase tracking-wider">
                <Languages className="w-4 h-4" />
                <span>Bilingual Newsroom Processing</span>
              </div>
              <h3 className="text-2xl font-editorial font-bold text-slate-900">
                English & தமிழ் Language Specialization
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Newsroom AI provides full linguistic parity. Whether your executive committee speaks in English or Tamil, the engine generates authentic vocabulary, accurate corporate terminology, and culturally fluent reports.
              </p>
              <div className="p-4 bg-slate-50 rounded border border-slate-200 text-xs space-y-2">
                <div className="font-semibold text-slate-800">Supported Language Workflows:</div>
                <div className="text-slate-600">· Tamil Speech → High-Impact Tamil News Report (தமிழ்)</div>
                <div className="text-slate-600">· Tamil Speech → Cross-Translated English Executive Brief</div>
                <div className="text-slate-600">· English Speech → Broadsheet English News Summary</div>
                <div className="text-slate-600">· English Speech → Accurate Tamil Translation (தமிழ்)</div>
              </div>
            </div>

            <div id="security" className="space-y-4">
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-800 uppercase tracking-wider">
                <Shield className="w-4 h-4" />
                <span>Enterprise Data Privacy & Security</span>
              </div>
              <h3 className="text-2xl font-editorial font-bold text-slate-900">
                Private, Isolated Workspace Storage
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Meeting recordings and transcripts contain sensitive commercial discussions. Every upload and analysis is strictly tied to your authenticated user account.
              </p>
              <div className="p-4 bg-slate-50 rounded border border-slate-200 text-xs space-y-2">
                <div className="font-semibold text-slate-800">Security Invariants:</div>
                <div className="text-slate-600">· No public file URLs; all media streaming is authorized</div>
                <div className="text-slate-600">· Passwords hashed with industry-standard bcrypt</div>
                <div className="text-slate-600">· Permanent media deletion on analysis removal</div>
                <div className="text-slate-600">· Zero client-side API keys exposed in browser code</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BOTTOM CTA BANNER */}
      <section className="py-16 bg-slate-900 text-white">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-6">
          <h2 className="text-3xl font-editorial font-bold text-white">
            Ready to Accelerate Your Meeting Reporting?
          </h2>
          <p className="text-slate-300 text-sm max-w-xl mx-auto">
            Upload your first video meeting now. Get verified headlines, confirmed decisions, and action matrices in minutes.
          </p>
          <div className="pt-2">
            <button
              onClick={onGetStarted}
              className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-semibold text-white bg-red-600 rounded hover:bg-red-700 transition-colors shadow-md"
            >
              <span>Launch Newsroom AI</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
