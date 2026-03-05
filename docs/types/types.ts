
export type ExerciseCategory = 
  | 'Upper Body' 
  | 'Lower Body' 
  | 'Plyometrics' 
  | 'Football Specific' 
  | 'Change of Direction' 
  | 'Core' 
  | 'Conditioning' 
  | 'Power'
  | 'Strength';

export type TrackingType = '1RM' | 'Highest Weight' | 'Time' | 'Distance' | 'Reps only' | '--';

export interface WorkoutOptions {
  completionOnly: boolean;
  barSpeed: boolean;
  bodyWeight: boolean;
  peakPower: boolean;
  coachComp: boolean;
  trackRepCount: boolean;
  eachSide: boolean;
  trackVolumeLoad: boolean;
}

export interface Exercise {
  id: string;
  name: string;
  description: string;
  equipment: string[];
  bodyParts: string[];
  categories: ExerciseCategory[];
  videoUrl?: string;
  trackingType: TrackingType;
  tags: string[];
  options: WorkoutOptions;
}

export interface WellnessMetrics {
  sleep: number;
  stress: number;
  soreness: number;
  mood: number;
  readinessScore: number;
}

export interface DailyTelemetry {
  date: string;
  kms: number;
  rpe: number;
  wellness?: WellnessMetrics;
}

export interface Biometrics {
  weight: number;
  height: number;
  lastUpdated: string;
}

export interface PerformanceHistoryRecord {
  date: string;
  metric: string;
  value: number;
}

export interface Player {
  id: string;
  name: string;
  subsection: string;
  gender?: 'Male' | 'Female' | 'Other';
  age?: number;
  oneRM: { [exerciseId: string]: number };
  telemetry: DailyTelemetry[];
  performanceHistory: PerformanceHistoryRecord[];
  adherence: number;
}

export interface Team {
  id: string;
  name: string;
  sport: string;
  players: Player[];
  status: 'Active' | 'Off-Season' | 'Pre-Season';
  description?: string;
}

export interface IndividualClient extends Player {
  sport: string;
}

export type LoadLevel = 'Low' | 'Medium' | 'High' | 'Maximal';
export type TrainingPhase = 
  | 'General Preparation' 
  | 'Specific Preparation' 
  | 'Pre-Competition' 
  | 'Competition' 
  | 'Tapering' 
  | 'Active Recovery' 
  | 'Return to Play';

export type BlockType = 'Low Intensity' | 'Medium Intensity' | 'Maximal Load' | 'Anthropometrics' | 'General' | 'Recovery';

export interface PlanBlock {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  color: string;
  row: number;
  blockType?: BlockType;
  notes?: string;
}

export interface ScheduledSession {
  id: string;
  date: string; 
  targetId: string; 
  targetType: 'Team' | 'Individual';
  load: LoadLevel;
  trainingPhase: TrainingPhase;
  title: string;
  notes: string;
  exerciseIds: string[];
  plannedDuration: number;
  actualDuration?: number;
  actualRPE?: number;
  postSessionNotes?: string;
  status: 'Scheduled' | 'Completed' | 'Missed' | 'Modified';
}

// --- CALENDAR EVENT TYPES ---

export interface CalendarEvent {
  id: string;
  title: string;
  event_type: string;
  color: string;
  description?: string;
  location?: string;
  all_day: boolean;
  start_date: string;
  end_date?: string;
  start_time?: string;
  end_time?: string;
  created_at?: string;
}

export interface CustomEventType {
  label: string;
  color: string;
}

export interface ProgramTemplate {
  id: string;
  name: string;
  category: string;
  exercises: string[];
  notes: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

// --- WELLNESS / QUESTIONNAIRE TYPES ---

export type QuestionType =
  | 'scale'
  | 'scale_1_5'
  | 'scale_1_10'
  | 'scale_0_3'
  | 'multiple_choice'
  | 'checklist'
  | 'text'
  | 'yes_no'
  | 'body_map'
  | 'buttons';

export interface QuestionOption {
  label: string;
  value?: number; // numeric equivalent for charting
}

export interface WellnessQuestion {
  id: string;
  type: QuestionType;
  text: string;
  category: 'readiness' | 'wellness' | 'health' | 'injury';
  required: boolean;
  options?: string[];          // for multiple_choice / checklist
  numericMap?: number[];       // parallel to options — numeric value for each choice
  labels?: [string, string];   // [min_label, max_label] for scale types
  scaleMin?: number;           // custom range for 'scale' type
  scaleMax?: number;
  imageUrl?: string;           // reference image URL (any question type)
  bodyMapConfig?: BodyMapConfig; // per-question body map configuration
  conditional?: {
    questionId: string;
    notEmpty?: boolean;        // show when target question has any value
    value?: any;               // show when target question equals this value
  };
}

export interface BodyMapAreaDef {
  key: string;
  label: string;
  view: 'front' | 'back';
  color: string;
  hasSeverity?: boolean; // true = cycle severity levels, false = simple on/off toggle
}

export interface SeverityLevel {
  value: number;
  label: string;
  shortLabel: string;
  style: string;         // Tailwind classes
  legendColor: string;   // hex color for legend dot
}

// Sub-input types available below the reference image
export type ImageRefInputType = 'buttons' | 'scale' | 'multiple_choice' | 'checklist' | 'yes_no' | 'text' | 'none';

export interface BodyMapConfig {
  areas: BodyMapAreaDef[];
  severityLevels: SeverityLevel[];
  referenceImageUrl?: string;
  instructionText?: string;
  subInputType?: ImageRefInputType;       // what input renders below the image (default: 'area_buttons')
  subInputOptions?: string[];             // options for choice/checklist sub-inputs
  subInputNumericMap?: number[];          // numeric values for choice sub-inputs
  subInputLabels?: [string, string];     // min/max labels for scale sub-input
  subInputScaleMin?: number;
  subInputScaleMax?: number;
}

export interface QuestionnaireTemplate {
  id: string;
  user_id: string;
  team_id: string | null;
  name: string;
  description?: string;
  questions: WellnessQuestion[];
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface BodyMapArea {
  area: string;       // e.g. 'hamstrings', 'quads', 'lower_back'
  side?: 'left' | 'right' | 'both';
  severity: 0 | 1 | 2 | 3;  // 0=none, 1=mild, 2=moderate, 3=severe
}

export interface WellnessInjuryData {
  areas: BodyMapArea[];
  type?: string;                // nature of pain
  mechanism?: string;           // contact / non-contact / overuse
  side?: string;
  timing?: string;              // when during session
  training_interruption?: boolean;
}

export interface WellnessResponse {
  id: string;
  athlete_id: string;
  team_id: string;
  questionnaire_template_id?: string;
  session_date: string;
  responses: Record<string, any>;  // { question_id: answer_value }
  rpe?: number;
  availability?: 'available' | 'modified' | 'unavailable';
  injury_report?: WellnessInjuryData;
  submitted_at: string;
}

// --- INJURY REPORT TYPES (Physio) ---

export type InjuryClassification = 'Muscle Strain' | 'Ligament Sprain' | 'Fracture' | 'Contusion' | 'Tendinopathy' | 'Dislocation' | 'Overuse' | 'Concussion' | 'Laceration' | 'Nerve Injury' | 'Other';
export type SeverityGrade = 1 | 2 | 3;
export type Laterality = 'Left' | 'Right' | 'Bilateral' | 'Central';
export type PainKind = 'Sharp' | 'Dull' | 'Burning' | 'Throbbing' | 'Radiating';
export type InjuryTrainingStatus = 'Full Training' | 'Modified Training' | 'Rehab Only' | 'Complete Rest';
export type TreatmentOption = 'Ice' | 'Physio' | 'Massage' | 'Strapping' | 'Medication' | 'Surgery Referral' | 'Imaging Referral';
export type ReturnToPlayPhase = 'Phase 1 - Rest' | 'Phase 2 - Rehab' | 'Phase 3 - Modified Training' | 'Phase 4 - Full Return';

export interface InjuryReport {
  id: string;
  athleteId: string;
  athleteName: string;
  teamId?: string;
  areas: BodyMapArea[];
  // Classification & Context
  classification?: InjuryClassification;
  severityGrade?: SeverityGrade;
  laterality?: Laterality;
  recurrence?: 'New' | 'Recurrence';
  activity?: 'Training' | 'Match' | 'Warm-up' | 'Gym' | 'Other';
  // Clinical
  dateOfInjury: string;
  mechanism?: string;
  painLevel?: number;
  painKinds?: PainKind[];
  hasSwelling?: boolean;
  swellingSeverity?: 'Mild' | 'Moderate' | 'Severe';
  hasBruising?: boolean;
  bruisingSeverity?: 'Mild' | 'Moderate' | 'Severe';
  rangeOfMotion?: 'Full' | 'Limited' | 'None';
  weightBearing?: 'Full' | 'Partial' | 'Non-weight-bearing';
  stoppedTraining?: boolean;
  // Management
  currentStatus?: InjuryTrainingStatus;
  treatmentPrescribed?: TreatmentOption[];
  treatmentRecommendations?: string;
  followUpDate?: string;
  returnToPlayPhase?: ReturnToPlayPhase;
  expectedTimeOut?: string;
  // Evaluation
  comments?: string;
  // Attachments
  attachmentUrls?: string[];
  // Meta
  createdAt: string;
  updatedAt?: string;
}
