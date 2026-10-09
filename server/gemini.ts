import { GoogleGenAI } from '@google/genai';
import fs from 'node:fs';
import path from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import type { AnalysisResult } from './types.js';

const execAsync = promisify(exec);

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

interface MediaAnalysisInput {
  filePath?: string;
  mimeType?: string;
  textContent?: string;
  sourceLanguage: 'en' | 'ta' | 'auto';
  outputLanguage: 'en' | 'ta';
  title?: string;
}

// Resilient Gemini caller with model fallback and exponential backoff
async function callGeminiWithRetry(contents: any, systemInstruction?: string, responseMimeType?: string): Promise<string> {
  const models = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];
  let lastError: any = null;

  for (const model of models) {
    let attempts = 0;
    const maxAttempts = 2;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        console.log(`[Gemini] Calling ${model} (attempt ${attempts}/${maxAttempts})...`);
        const config: any = {
          temperature: 0.3,
        };
        if (systemInstruction) config.systemInstruction = systemInstruction;
        if (responseMimeType) config.responseMimeType = responseMimeType;

        const response = await ai.models.generateContent({
          model,
          contents,
          config,
        });

        const text = response.text?.trim();
        if (text) {
          console.log(`[Gemini] Success using model ${model}`);
          return text;
        }

        // Check if there are non-text parts (e.g. audioTranscription)
        const parts = response.candidates?.[0]?.content?.parts || [];
        let combinedPartsText = '';
        for (const part of parts) {
          if ((part as any).audioTranscription?.text) {
            combinedPartsText += (part as any).audioTranscription.text + ' ';
          } else if (part.text) {
            combinedPartsText += part.text + ' ';
          }
        }
        if (combinedPartsText.trim()) {
          console.log(`[Gemini] Success extracting parts from model ${model}`);
          return combinedPartsText.trim();
        }

        throw new Error('Model returned empty response content.');
      } catch (err: any) {
        lastError = err;
        const errMsg = err?.message || String(err);
        const isTransient = errMsg.includes('503') || 
                            errMsg.includes('UNAVAILABLE') || 
                            errMsg.includes('429') || 
                            errMsg.includes('RESOURCE_EXHAUSTED') || 
                            errMsg.includes('fetch failed') ||
                            errMsg.includes('ECONNRESET') ||
                            errMsg.includes('ETIMEDOUT');

        console.warn(`[Gemini] Error with ${model} on attempt ${attempts}: ${errMsg}`);

        if (isTransient && attempts < maxAttempts) {
          const delayMs = attempts * 2500;
          console.log(`[Gemini] Waiting ${delayMs}ms before retry...`);
          await new Promise((r) => setTimeout(r, delayMs));
        } else {
          // Break to next fallback model
          break;
        }
      }
    }
  }

  throw new Error(`AI Analysis failed across all fallback models: ${lastError?.message || 'Unknown error'}`);
}

// Extract and normalize audio from video using FFmpeg
async function extractAudioWithFfmpeg(inputPath: string): Promise<string> {
  const tempAudioPath = `/tmp/newsroom_audio_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.mp3`;
  console.log(`[FFmpeg] Extracting speech audio from ${inputPath} to ${tempAudioPath}...`);

  // Downsample to 16kHz mono 32kbps MP3 (optimizes size by ~95% while keeping clear speech intelligibility)
  const cmd = `ffmpeg -i "${inputPath}" -vn -ar 16000 -ac 1 -b:a 32k "${tempAudioPath}" -y`;
  await execAsync(cmd);

  if (!fs.existsSync(tempAudioPath)) {
    throw new Error('FFmpeg audio extraction failed to produce output file.');
  }

  const stat = fs.statSync(tempAudioPath);
  console.log(`[FFmpeg] Extracted audio size: ${(stat.size / (1024 * 1024)).toFixed(2)} MB`);
  return tempAudioPath;
}

export async function transcribeAndAnalyzeMeeting(input: MediaAnalysisInput): Promise<AnalysisResult> {
  const isTamilOutput = input.outputLanguage === 'ta';
  const languageDirective = isTamilOutput 
    ? 'IMPORTANT: All headlines, summaries, points, decisions, and action items MUST be written in natural, fluent, professional Tamil (தமிழ்). Keep entity names, numbers, and dates accurate. Do not use awkward word-for-word translation; write as a senior Tamil newsroom journalist.'
    : 'IMPORTANT: All headlines, summaries, points, decisions, and action items MUST be written in crisp, objective, professional journalistic English.';

  const systemInstruction = `You are an elite newsroom editor and senior investigative journalist specializing in business, tech, and governance meetings.
Your duty is to transform raw meeting audio/video/text into high-impact, accurate journalistic intelligence.

${languageDirective}

Distinguish strictly between CONFIRMED decisions and mere suggestions or brainstormed ideas.
Never invent names, deadlines, numbers, or facts. If a deadline or task owner is not explicitly stated in the source, use "Not specified".

Output your findings as a strict JSON object with this exact schema:
{
  "primaryHeadline": "Single most impactful, truthful, and newsworthy headline",
  "alternativeHeadlines": {
    "breaking": "Punchy breaking news alert style headline",
    "newspaper": "Formal broadsheet editorial style headline",
    "formal": "Corporate / boardroom formal briefing headline",
    "digital": "Engaging web journalism headline",
    "social": "Crisp social media briefing hook headline"
  },
  "quickSummary": "3 to 5 sentences providing an essential overview of what transpired.",
  "detailedSummary": "A comprehensive narrative detailing the agenda, debate, agreements, context, and forward outlook.",
  "executiveSummary": "A concise executive briefing tailored for C-suite decision makers and chief editors.",
  "importantPoints": [
    {
      "id": "pt_1",
      "category": "Main Announcements" | "Important Facts & Figures" | "Key Discussions" | "Decisions Made" | "Problems Identified" | "Proposed Solutions" | "Future Plans" | "Action Items" | "Pending Issues",
      "title": "Clear concise point heading",
      "explanation": "Detailed explanation of the point and its implications",
      "importance": "High" | "Medium" | "Low",
      "speaker": "Speaker name if identified or 'Speaker'",
      "timestamp": "e.g. 02:15 or transcript section",
      "excerpt": "Verbatim quote or source excerpt"
    }
  ],
  "decisions": [
    {
      "id": "dec_1",
      "decision": "Concrete confirmed decision statement",
      "context": "Why this decision was made and what led to it",
      "isConfirmed": true,
      "decidedBy": "Leader or committee name if known",
      "timestamp": "05:40"
    }
  ],
  "actionItems": [
    {
      "id": "act_1",
      "task": "Specific actionable responsibility",
      "assignedTo": "Responsible person name or 'Not specified'",
      "deadline": "Explicit stated date/time or 'Not specified'",
      "status": "Pending",
      "timestamp": "08:12"
    }
  ],
  "keyFacts": [
    {
      "id": "kf_1",
      "category": "Number" | "Date" | "Name" | "Organization" | "Claim",
      "item": "Specific metric, entity, or claim",
      "context": "Context from the meeting"
    }
  ],
  "pendingQuestions": [
    "Unresolved question or pending debate that requires follow-up"
  ],
  "transcriptSegments": [
    {
      "id": "tr_1",
      "speaker": "Speaker 1",
      "timestamp": "00:00",
      "text": "Spoken sentence or paragraph in original spoken language."
    }
  ],
  "detectedLanguage": "en" | "ta" | "other"
}`;

  let tempAudioFile: string | null = null;
  let tempChunkDir: string | null = null;

  try {
    let transcriptText = '';

    // Step A: Ingest or transcribe media
    if (input.filePath && fs.existsSync(input.filePath)) {
      // 1. Extract audio with FFmpeg to lightweight mono MP3
      tempAudioFile = await extractAudioWithFfmpeg(input.filePath);
      const audioStats = fs.statSync(tempAudioFile);

      // If audio is <= 8 MB, we can transcribe it directly in one pass
      if (audioStats.size <= 8 * 1024 * 1024) {
        console.log(`[Gemini] Transcribing audio file (${audioStats.size} bytes)...`);
        const audioBuffer = fs.readFileSync(tempAudioFile);
        const base64Audio = audioBuffer.toString('base64');

        const transcribePrompt = `Listen to this audio recording (${input.title || 'Meeting'}).
Spoken language: ${input.sourceLanguage === 'ta' ? 'Tamil (தமிழ்)' : input.sourceLanguage === 'en' ? 'English' : 'Auto-detect'}.
Transcribe all spoken dialogue verbatim into sequential dialogue with speaker labels and timestamps:
[00:00] Speaker: ...
Provide the full dialogue transcription accurately.`;

        const transcriptionRes = await callGeminiWithRetry({
          parts: [
            {
              inlineData: {
                mimeType: 'audio/mp3',
                data: base64Audio,
              },
            },
            {
              text: transcribePrompt,
            },
          ],
        });

        transcriptText = transcriptionRes;
      } else {
        // For long audio (> 8 MB, e.g. 1-2 hours), segment into 4-minute chunks
        tempChunkDir = `/tmp/newsroom_chunks_${Date.now()}`;
        fs.mkdirSync(tempChunkDir, { recursive: true });
        console.log(`[FFmpeg] Segmenting long audio into 4-minute chunks...`);

        await execAsync(`ffmpeg -i "${tempAudioFile}" -f segment -segment_time 240 -c copy "${tempChunkDir}/seg_%03d.mp3" -y`);
        const chunkFiles = fs.readdirSync(tempChunkDir).filter((f) => f.endsWith('.mp3')).sort();
        console.log(`[FFmpeg] Generated ${chunkFiles.length} audio chunks for transcription.`);

        const transcribedChunks: string[] = [];
        for (let i = 0; i < chunkFiles.length; i++) {
          const chunkPath = path.join(tempChunkDir, chunkFiles[i]);
          const cBuf = fs.readFileSync(chunkPath);
          const cBase64 = cBuf.toString('base64');

          const startMin = i * 4;
          const endMin = (i + 1) * 4;
          console.log(`[Gemini] Transcribing chunk ${i + 1}/${chunkFiles.length} (${startMin}:00 - ${endMin}:00)...`);

          const cText = await callGeminiWithRetry({
            parts: [
              {
                inlineData: {
                  mimeType: 'audio/mp3',
                  data: cBase64,
                },
              },
              {
                text: `Transcribe this audio chunk (${startMin}:00 to ${endMin}:00). Provide dialogue verbatim.`,
              },
            ],
          });

          transcribedChunks.push(`[${String(startMin).padStart(2, '0')}:00] ${cText.trim()}`);
          // Small pause between chunks to respect rate limits
          if (i < chunkFiles.length - 1) {
            await new Promise((r) => setTimeout(r, 1200));
          }
        }

        transcriptText = transcribedChunks.join('\n\n');
      }
    } else if (input.textContent && input.textContent.trim()) {
      transcriptText = input.textContent.trim();
    } else {
      throw new Error('No media file or transcript content provided for analysis.');
    }

    console.log(`[Gemini] Transcript ready (${transcriptText.length} chars). Generating editorial report...`);

    // Step B: Generate structured editorial analysis from the transcript
    const analysisPrompt = `Analyze the following meeting transcript / notes:

"""
${transcriptText}
"""

Subject Title: ${input.title || 'Meeting Intelligence Briefing'}
Source Spoken Language: ${input.sourceLanguage}
Target Output Language: ${input.outputLanguage} (${input.outputLanguage === 'ta' ? 'தமிழ்' : 'English'})

Perform a deep editorial and journalistic analysis.
Generate the complete structured JSON response matching the schema. Return pure JSON.`;

    const reportJsonRaw = await callGeminiWithRetry(
      analysisPrompt,
      systemInstruction,
      'application/json'
    );

    // Parse JSON cleanly, stripping any accidental markdown fences
    let cleaned = reportJsonRaw.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    }

    let parsed: AnalysisResult;
    try {
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      // Attempt substring extraction if model added preamble
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        parsed = JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
      } else {
        throw new Error('Failed to parse model output as valid JSON.');
      }
    }

    // Ensure fallback defaults for fields
    if (!parsed.primaryHeadline) {
      parsed.primaryHeadline = input.title ? `Briefing: ${input.title}` : 'Meeting Intelligence Briefing';
    }
    if (!parsed.alternativeHeadlines) {
      parsed.alternativeHeadlines = {
        breaking: `ALERT: ${parsed.primaryHeadline}`,
        newspaper: `${parsed.primaryHeadline}: Key Developments Unveiled`,
        formal: `Official Report: ${parsed.primaryHeadline}`,
        digital: `${parsed.primaryHeadline} — Full Analysis`,
        social: `Key highlights: ${parsed.primaryHeadline}`,
      };
    }
    if (!Array.isArray(parsed.importantPoints)) parsed.importantPoints = [];
    if (!Array.isArray(parsed.decisions)) parsed.decisions = [];
    if (!Array.isArray(parsed.actionItems)) parsed.actionItems = [];
    if (!Array.isArray(parsed.keyFacts)) parsed.keyFacts = [];
    if (!Array.isArray(parsed.pendingQuestions)) parsed.pendingQuestions = [];
    if (!Array.isArray(parsed.transcriptSegments) || parsed.transcriptSegments.length === 0) {
      // If transcriptSegments was not populated by the analysis pass, generate from transcriptText
      parsed.transcriptSegments = [
        {
          id: 'tr_1',
          speaker: 'Speaker',
          timestamp: '00:00',
          text: transcriptText.slice(0, 3000),
        },
      ];
    }

    return parsed;
  } catch (err: any) {
    console.error('[Gemini] Analysis failed:', err?.message || err);
    throw new Error(`AI Analysis failed: ${err?.message || 'Unknown Gemini error'}`);
  } finally {
    // Clean up temporary files
    if (tempAudioFile && fs.existsSync(tempAudioFile)) {
      try {
        fs.unlinkSync(tempAudioFile);
      } catch {}
    }
    if (tempChunkDir && fs.existsSync(tempChunkDir)) {
      try {
        fs.rmSync(tempChunkDir, { recursive: true, force: true });
      } catch {}
    }
  }
}
