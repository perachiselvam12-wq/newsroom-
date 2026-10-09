import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import { db } from './db.js';
import type { User } from './types.js';

const JWT_SECRET = process.env.JWT_SECRET || 'newsroom_ai_secure_session_key_2026';

export interface AuthRequest extends Request {
  user?: User;
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function comparePassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export function generateToken(user: User): string {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyToken(token: string): { id: string; email: string; role: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { id: string; email: string; role: string };
  } catch {
    return null;
  }
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
    return;
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  if (!decoded) {
    res.status(401).json({ error: 'Unauthorized: Session expired or invalid' });
    return;
  }

  const user = db.getUserById(decoded.id);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized: User not found' });
    return;
  }

  req.user = user;
  next();
}

// Seed a starter editor account if not exists
export function seedDefaultUser(): void {
  const existing = db.getUserByEmail('editor@newsroom.ai');
  if (!existing) {
    const defaultUser: User = {
      id: 'usr_default_editor',
      name: 'Elena Rostova',
      email: 'editor@newsroom.ai',
      passwordHash: hashPassword('newsroom123'),
      role: 'editor',
      preferredLanguage: 'en',
      theme: 'light',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.createUser(defaultUser);
    console.log('[Auth] Seeded default newsroom editor account: editor@newsroom.ai');
  }

  // Also seed initial demonstration analysis for editor if empty
  const analyses = db.getAnalysesByUserId('usr_default_editor');
  if (analyses.length === 0) {
    db.createAnalysis({
      id: 'ans_seed_demo_1',
      userId: 'usr_default_editor',
      title: 'Global Autonomous Systems Council & Commercial Rollout Ratification',
      sourceType: 'video',
      fileName: 'autonomous_drone_council_session.mp4',
      fileSize: 485000000,
      sourceLanguage: 'en',
      outputLanguage: 'en',
      uploadStatus: 'completed',
      processingStatus: 'completed',
      headline: 'Autonomous Robotics Council Ratifies Commercial Falcon-X Deployment for Q4',
      isSaved: true,
      analysisResult: {
        primaryHeadline: 'Autonomous Robotics Council Ratifies Commercial Falcon-X Deployment for Q4',
        alternativeHeadlines: {
          breaking: 'ALERT: Commercial Falcon-X Drone Rollout Set for November 15 Following FAA BVLOS Clearance',
          newspaper: 'Engineering Leadership Greenlights High-Density Battery Architecture for Next-Gen Fleet',
          formal: 'Executive Council Resolution: Commercial Aviation Rollout Protocol and Safety Verification',
          digital: 'Falcon-X Passes Crucial High-Temperature Stress Tests as Council Confirms 5,000-Unit Run',
          social: 'Falcon-X deployment ratified for Nov 15! 64-minute flight endurance under full sensor payload confirmed.'
        },
        quickSummary: 'The Global Autonomous Systems Council held a decisive briefing to evaluate commercial deployment readiness for the Falcon-X autonomous drone platform. VP of Hardware Marcus Sterling verified that revised lithium-silicon battery cells achieved 420 Wh/kg, delivering 64 minutes of continuous flight duration with thermal operating limits maintained below 52°C. Dr. Evelyn Vance officially ratified the November 15 commercial launch date, directing manufacturing to deliver 5,000 production units by December 1.',
        detailedSummary: `The Council convened with senior leadership from Systems Architecture, Hardware Engineering, and Aviation Regulatory Affairs. 

Technical Benchmarking:
Marcus Sterling detailed extensive multi-day endurance testing conducted at the Nevada testing grounds. Under 45°C ambient desert conditions, thermal envelopes peaked safely at 52°C, well below the mandatory 60°C emergency threshold. Cell energy density reached 420 Wh/kg, expanding operational flight windows to 64 minutes under full sensor and payload suites.

Regulatory Compliance:
Liam Davis confirmed receipt of the FAA Part 107 Beyond Visual Line of Sight (BVLOS) commercial waiver across designated regional corridors in Nevada and Arizona, clearing the final administrative obstacle.

Firmware & Safety Directives:
Lead Architect Priya Sundaram reported low-probability optical edge-case reflections in dense marine fog. Chief Technology Officer Dr. Evelyn Vance directed immediate deployment of firmware revision 4.2 integrating LiDAR sensor fusion, mandating full test suite sign-off by October 30 before flight authorization.`,
        executiveSummary: 'Executive council ratified the November 15 commercial rollout of the Falcon-X platform. Crucial milestones met: FAA BVLOS waiver secured, thermal operating limits verified under 52°C, and battery endurance expanded to 64 minutes. Manufacturing committed to deliver 5,000 units by December 1, with firmware validation due by October 30.',
        importantPoints: [
          {
            id: 'pt_1',
            category: 'Main Announcements',
            title: 'Official Falcon-X Launch Date Set for November 15',
            explanation: 'Council executive leadership established November 15 as the immutable public unveiling date.',
            importance: 'High',
            speaker: 'Dr. Evelyn Vance',
            timestamp: '06:45',
            excerpt: 'We officially ratify the November 15 launch date for Falcon-X.'
          },
          {
            id: 'pt_2',
            category: 'Important Facts & Figures',
            title: 'Battery Energy Density Achieves 420 Wh/kg',
            explanation: 'Lithium-silicon cell architecture completed testing, securing 64 minutes sustained flight time.',
            importance: 'High',
            speaker: 'Marcus Sterling',
            timestamp: '01:30',
            excerpt: 'It yields 420 Watt-hours per kilogram, which gives the Falcon-X drone a flight duration of 64 minutes.'
          },
          {
            id: 'pt_3',
            category: 'Decisions Made',
            title: 'FAA Part 107 BVLOS Waiver Formally Secured',
            explanation: 'Federal aviation waiver authorizes autonomous operations in Nevada and Arizona commercial corridors.',
            importance: 'High',
            speaker: 'Liam Davis',
            timestamp: '05:15',
            excerpt: 'The Federal Aviation Administration granted our Part 107 BVLOS waiver on Tuesday.'
          },
          {
            id: 'pt_4',
            category: 'Problems Identified',
            title: 'Optical Reflection Edge Cases in Marine Fog',
            explanation: 'Neural network obstacle detection exhibited minor false positives under high-humidity marine conditions.',
            importance: 'Medium',
            speaker: 'Priya Sundaram',
            timestamp: '08:20',
            excerpt: 'We are still seeing edge-case reflections in foggy conditions.'
          },
          {
            id: 'pt_5',
            category: 'Proposed Solutions',
            title: 'Sensor Fusion Firmware 4.2 Integration',
            explanation: 'Engineers directed to couple LiDAR distance mapping with computer vision to filter fog artifacts.',
            importance: 'High',
            speaker: 'Dr. Evelyn Vance',
            timestamp: '09:10',
            excerpt: 'Deploy model version 4.2 with LiDAR sensor fusion to address fog reflections.'
          }
        ],
        decisions: [
          {
            id: 'dec_1',
            decision: 'Falcon-X commercial announcement and press briefing officially locked for November 15, 2026.',
            context: 'All regulatory and thermal performance criteria met or exceeded expectations.',
            isConfirmed: true,
            decidedBy: 'Dr. Evelyn Vance (CTO)',
            timestamp: '06:45'
          },
          {
            id: 'dec_2',
            decision: 'Production production ramp of 5,000 units authorized for completion by December 1, 2026.',
            context: 'Supply chain contracts and Nevada manufacturing cell capacity verified.',
            isConfirmed: true,
            decidedBy: 'Marcus Sterling (VP Hardware)',
            timestamp: '07:15'
          }
        ],
        actionItems: [
          {
            id: 'act_1',
            task: 'Complete manufacturing and hardware production sign-off for first 500 units',
            assignedTo: 'Marcus Sterling',
            deadline: 'October 25, 2026',
            status: 'Pending',
            timestamp: '07:20'
          },
          {
            id: 'act_2',
            task: 'Deploy and validate sensor fusion firmware 4.2 with LiDAR fog filtering',
            assignedTo: 'Priya Sundaram',
            deadline: 'October 30, 2026',
            status: 'Pending',
            timestamp: '09:20'
          },
          {
            id: 'act_3',
            task: 'Finalize press briefing press kits and technical specification sheets',
            assignedTo: 'Liam Davis',
            deadline: 'November 8, 2026',
            status: 'Pending',
            timestamp: '10:15'
          }
        ],
        keyFacts: [
          {
            id: 'kf_1',
            category: 'Number',
            item: '420 Wh/kg',
            context: 'Battery energy density achieved on lithium-silicon cells.'
          },
          {
            id: 'kf_2',
            category: 'Number',
            item: '64 Minutes',
            context: 'Maximum sustained flight duration under full operational sensor payload.'
          },
          {
            id: 'kf_3',
            category: 'Organization',
            item: 'Federal Aviation Administration (FAA)',
            context: 'Regulatory body granting the Part 107 BVLOS waiver.'
          },
          {
            id: 'kf_4',
            category: 'Date',
            item: 'November 15, 2026',
            context: 'Official launch date ratified by council.'
          }
        ],
        pendingQuestions: [
          'Will international aerospace regulatory approvals (EASA) follow the same timeline as the FAA BVLOS waiver?',
          'What is the thermal degradation coefficient after 500 charge-discharge cycles in sub-zero winter deployments?'
        ],
        transcriptSegments: [
          {
            id: 'tr_1',
            speaker: 'Dr. Evelyn Vance',
            timestamp: '00:00',
            text: 'Good morning team. Today our sole agenda is finalizing our commercial drone deployment timeline and resolving the battery density bottleneck before our public press conference on November 15.'
          },
          {
            id: 'tr_2',
            speaker: 'Marcus Sterling',
            timestamp: '01:30',
            text: 'The revised lithium-silicon cell test completed yesterday at our Nevada testing facility. It yields 420 Watt-hours per kilogram, which gives the Falcon-X drone a flight duration of 64 minutes under full sensor payload.'
          },
          {
            id: 'tr_3',
            speaker: 'Liam Davis',
            timestamp: '05:15',
            text: 'From a regulatory standpoint, the Federal Aviation Administration granted our Part 107 BVLOS waiver on Tuesday for commercial corridors in Nevada and Arizona.'
          },
          {
            id: 'tr_4',
            speaker: 'Dr. Evelyn Vance',
            timestamp: '06:45',
            text: 'This is decisive. We officially ratify the November 15 launch date for Falcon-X. Let us make sure production reaches 5,000 units by December 1.'
          }
        ],
        detectedLanguage: 'en'
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    console.log('[Auth] Seeded starter editorial analysis for default editor.');
  }
}
