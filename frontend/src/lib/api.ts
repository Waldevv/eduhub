const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers ?? {}),
    },
  });

  if (res.status === 401) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
    throw new Error(error.error ?? 'Erro na requisição');
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export interface Course {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  objectives: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  invite_code: string | null;
  created_at: string;
  _count: { units: number; enrollments: number };
}

export interface CoursePublic {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  objectives: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  invite_code: string | null;
  teacher: { id: string; name: string; avatar: string | null };
  enrollments: number;
}

export interface CreateCourseInput {
  title: string;
  description?: string;
  category?: string;
  objectives?: string;
  start_date?: string;
  end_date?: string;
  teacher_id?: string;
}

export interface UpdateCourseInput extends Partial<CreateCourseInput> {
  status?: string;
}

export interface Unit {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  pedagogical_guidance: string | null;
  sequence_order: number;
  status: string;
  is_published: boolean;
  created_at: string;
  _count: { blocks: number };
}

export interface CreateUnitInput {
  title: string;
  description?: string;
  pedagogical_guidance?: string;
}

export interface UpdateUnitInput extends Partial<CreateUnitInput> {
  status?: string;
  is_published?: boolean;
}

export const unitsApi = {
  listByCourse: (courseId: string) =>
    request<Unit[]>(`/api/units/course/${courseId}`),

  get: (id: string) => request<Unit>(`/api/units/${id}`),

  create: (courseId: string, data: CreateUnitInput) =>
    request<Unit>('/api/units', {
      method: 'POST',
      body: JSON.stringify({ ...data, course_id: courseId }),
    }),

  update: (id: string, data: UpdateUnitInput) =>
    request<Unit>(`/api/units/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  reorder: (items: { id: string; sequence_order: number }[]) =>
    request<void>('/api/units/reorder', {
      method: 'PATCH',
      body: JSON.stringify({ items }),
    }),

  delete: (id: string) =>
    request<void>(`/api/units/${id}`, { method: 'DELETE' }),
};

export interface ApiBlock {
  id: string;
  unit_id: string;
  title: string;
  block_type: string;
  sequence_order: number;
  is_required: boolean;
  status: string;
  completion_mode: string;
  config_json: Record<string, unknown> | null;
}

export const blocksApi = {
  listByUnit: (unitId: string) =>
    request<ApiBlock[]>(`/api/blocks/unit/${unitId}`),

  create: (data: { unit_id: string; title: string; block_type: string; is_required?: boolean; config_json?: Record<string, unknown> }) =>
    request<ApiBlock>('/api/blocks', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: { title?: string; is_required?: boolean; status?: string; config_json?: Record<string, unknown> }) =>
    request<ApiBlock>(`/api/blocks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  reorder: (items: { id: string; sequence_order: number }[]) =>
    request<{ ok: boolean }>('/api/blocks/reorder', { method: 'PATCH', body: JSON.stringify(items) }),

  delete: (id: string) =>
    request<void>(`/api/blocks/${id}`, { method: 'DELETE' }),
};

export interface QuizOption {
  id: string;
  question_id: string;
  option_text: string;
  is_correct: boolean;
  sequence_order: number;
}

export interface QuizQuestion {
  id: string;
  quiz_id: string;
  statement: string;
  question_type: string;
  sequence_order: number;
  score: number;
  options: QuizOption[];
}

export interface Quiz {
  id: string;
  title: string;
  description: string | null;
  created_by: string;
  created_at: string;
  _count?: { questions: number };
  questions?: QuizQuestion[];
}

export const quizzesApi = {
  list: () => request<Quiz[]>('/api/quizzes'),

  get: (id: string) => request<Quiz>(`/api/quizzes/${id}`),

  create: (data: { title: string; description?: string }) =>
    request<Quiz>('/api/quizzes', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: { title?: string; description?: string }) =>
    request<Quiz>(`/api/quizzes/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  delete: (id: string) =>
    request<void>(`/api/quizzes/${id}`, { method: 'DELETE' }),

  addQuestion: (quizId: string, data: { statement: string; score?: number }) =>
    request<QuizQuestion>(`/api/quizzes/${quizId}/questions`, { method: 'POST', body: JSON.stringify(data) }),

  updateQuestion: (id: string, data: { statement?: string; score?: number }) =>
    request<QuizQuestion>(`/api/quizzes/questions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  deleteQuestion: (id: string) =>
    request<void>(`/api/quizzes/questions/${id}`, { method: 'DELETE' }),

  reorderQuestions: (quizId: string, items: { id: string; sequence_order: number }[]) =>
    request<void>(`/api/quizzes/${quizId}/questions/reorder`, { method: 'PATCH', body: JSON.stringify({ items }) }),

  addOption: (questionId: string, data: { option_text: string; is_correct?: boolean }) =>
    request<QuizOption>(`/api/quizzes/questions/${questionId}/options`, { method: 'POST', body: JSON.stringify(data) }),

  updateOption: (id: string, data: { option_text?: string; is_correct?: boolean }) =>
    request<QuizOption>(`/api/quizzes/options/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  deleteOption: (id: string) =>
    request<void>(`/api/quizzes/options/${id}`, { method: 'DELETE' }),
};

export interface DiscordServer {
  id: string;
  course_id: string;
  teacher_id: string;
  discord_guild_id: string;
  server_name: string;
  is_active: boolean;
  channels: DiscordChannel[];
}

export interface DiscordChannel {
  id: string;
  server_id: string;
  discord_channel_id: string;
  name: string;
  channel_type: string;
  is_active: boolean;
}

export const discordApi = {
  getServer: (courseId: string) =>
    request<DiscordServer>(`/api/discord/server/${courseId}`),

  linkServer: (data: { course_id: string; teacher_id?: string; discord_guild_id: string; server_name: string }) =>
    request<DiscordServer>('/api/discord/server', { method: 'POST', body: JSON.stringify(data) }),

  unlinkServer: (courseId: string) =>
    request<void>(`/api/discord/server/${courseId}`, { method: 'DELETE' }),

  getUserGuilds: () =>
    request<{ id: string; name: string; icon: string | null; owner: boolean }[]>('/api/discord/user-guilds'),

  checkBotStatus: (guildId: string) =>
    request<{ inGuild: boolean; hasCommunity: boolean }>(`/api/discord/bot-status/${guildId}`),

  getChannels: (guildId: string) =>
    request<{ id: string; name: string; type: number }[]>(`/api/discord/channels/${guildId}`),

  publishLesson: (unitId: string, body?: { newBlockTypes?: string[] }) =>
    request<{ ok: boolean; created: number }>(`/api/discord/publish-lesson/${unitId}`, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),
};

export const coursesApi = {
  list: () => request<Course[]>('/api/courses'),

  get: (id: string) => request<Course>(`/api/courses/${id}`),

  create: (data: CreateCourseInput) =>
    request<Course>('/api/courses', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: UpdateCourseInput) =>
    request<Course>(`/api/courses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<void>(`/api/courses/${id}`, { method: 'DELETE' }),

  getByInviteCode: (code: string) =>
    request<CoursePublic>(`/api/courses/join/${code}`),

  joinByCode: (code: string) =>
    request<{ ok: boolean }>(`/api/courses/join/${code}`, { method: 'POST' }),
};

export const authApi = {
  completeProfile: (role: 'teacher' | 'student') =>
    request<{ token: string }>('/api/auth/complete-profile', {
      method: 'POST',
      body: JSON.stringify({ role }),
    }),
};

export interface StudentCourse {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  status: string;
  teacher: { id: string; name: string; avatar: string | null };
  enrolled_at: string;
  total_units: number;
  progress: number;
}

export interface StudentUnit {
  id: string;
  title: string;
  description: string | null;
  sequence_order: number;
  is_published: boolean;
  total_blocks: number;
  countable_blocks: number;
  completed_blocks: number;
  progress: number;
  is_complete: boolean;
  is_locked: boolean;
}

export interface StudentDiscordServer {
  id: string;
  server_name: string;
  discord_guild_id: string;
  is_active: boolean;
  discord_invite_url?: string | null;
}

export interface StudentCourseDetail extends Omit<StudentCourse, 'total_units'> {
  units: StudentUnit[];
  objectives: string | null;
  start_date: string | null;
  end_date: string | null;
  invite_code: string | null;
  discord_server: StudentDiscordServer | null;
}

export interface StudentBlockContent {
  id: string;
  content_type: string;
  body_text: string | null;
  url: string | null;
  open_in_new_tab: boolean;
  require_full_watch: boolean;
}

export interface StudentBlockQuizOption {
  id: string;
  option_text: string;
  sequence_order: number;
}

export interface StudentBlockQuizQuestion {
  id: string;
  statement: string;
  score: number;
  sequence_order: number;
  options: StudentBlockQuizOption[];
}

export interface StudentBlockActivity {
  id: string;
  activity_type: string;
  passing_score: number | null;
  max_attempts: number | null;
  time_limit_minutes: number | null;
  description: string | null;
  quiz: {
    id: string;
    title: string;
    questions: StudentBlockQuizQuestion[];
  } | null;
}

export interface StudentBlockInteraction {
  id: string;
  interaction_type: string;
  title: string | null;
  initial_message: string | null;
  channel: { id: string; name: string; channel_type: string; discord_channel_id: string } | null;
}

export interface StudentBlockConsolidation {
  id: string;
  consolidation_type: string;
  title: string | null;
  summary_text: string | null;
}

export interface StudentBlock {
  id: string;
  title: string;
  block_type: string;
  sequence_order: number;
  is_required: boolean;
  completion_mode: string;
  config_json: Record<string, unknown> | null;
  student_status: 'completed' | 'available' | 'locked';
  attempts_done: number;
  latest_score: number | null;
  latest_passed: boolean | null;
  content: StudentBlockContent | null;
  activity: StudentBlockActivity | null;
  interaction: StudentBlockInteraction | null;
  consolidation: StudentBlockConsolidation | null;
}

export interface StudentUnitDetail {
  id: string;
  title: string;
  description: string | null;
  pedagogical_guidance: string | null;
  course: { id: string; title: string };
  blocks: StudentBlock[];
}

export interface QuizSubmitResult {
  score: number;
  total_score: number;
  score_percent: number;
  passed: boolean;
  attempt_number: number;
  max_attempts: number;
  responses: { question_id: string; is_correct: boolean }[];
}

export const studentApi = {
  getCourses: () => request<StudentCourse[]>('/api/student/courses'),

  getCourse: (id: string) => request<StudentCourseDetail>(`/api/student/courses/${id}`),

  getUnit: (id: string) => request<StudentUnitDetail>(`/api/student/units/${id}`),

  completeBlock: (blockId: string) =>
    request<{ ok: boolean }>(`/api/student/blocks/${blockId}/complete`, { method: 'POST' }),

  syncDiscord: (unitId: string) =>
    request<{ ok: boolean }>(`/api/student/units/${unitId}/sync-discord`, { method: 'POST' }).catch(() => {}),

  submitQuiz: (blockId: string, answers: { question_id: string; option_id: string }[]) =>
    request<QuizSubmitResult>(`/api/student/blocks/${blockId}/quiz`, {
      method: 'POST',
      body: JSON.stringify({ answers }),
    }),

  submitAssignment: (blockId: string, data: {
    file_url?: string;
    text_content?: string;
    link_url?: string;
    submission_type: string;
  }) =>
    request<{ ok: boolean; attempt_number: number }>(`/api/student/blocks/${blockId}/assignment`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

export interface TeacherBlock {
  id: string;
  title: string;
  block_type: string;
  sequence_order: number;
}

export interface TeacherStudentRow {
  id: string;
  name: string;
  avatar: string | null;
  email: string;
  completed_blocks: number;
  countable_blocks: number;
  progress: number;
  status: 'not_started' | 'in_progress' | 'at_risk' | 'completed';
  last_access: string | null;
  block_completions: Record<string, boolean>;
}

export interface UnitProgressData {
  unit: { id: string; title: string; course_id: string };
  blocks: TeacherBlock[];
  students: TeacherStudentRow[];
}

export interface TeacherQuizResponse {
  question_id: string;
  statement: string;
  is_correct: boolean;
  selected_option_text: string | null;
}

export interface TeacherSubmission {
  id: string;
  submitted_at: string;
  score: number | null;
  total_score: number;
  is_approved: boolean | null;
  feedback_text: string | null;
  submission_data: Record<string, unknown> | null;
  responses: TeacherQuizResponse[];
}

export interface TeacherBlockDetail {
  id: string;
  title: string;
  block_type: string;
  sequence_order: number;
  is_completed: boolean;
  completed_at: string | null;
  latest_score: number | null;
  latest_passed: boolean | null;
  attempts: number;
  activity_type: string | null;
  content_info: { content_type: string; url: string | null; body_text: string | null } | null;
  interaction_info: { interaction_type: string; min_messages: number } | null;
  consolidation_type: string | null;
  evaluation_type: string | null;
  submission: TeacherSubmission | null;
}

export interface StudentProgressDetail {
  student: { id: string; name: string; email: string; avatar: string | null };
  unit: { id: string; title: string };
  progress: number;
  completed_blocks: number;
  countable_blocks: number;
  status: 'not_started' | 'in_progress' | 'at_risk' | 'completed';
  last_access: string | null;
  started_at: string | null;
  completed_at: string | null;
  blocks: TeacherBlockDetail[];
}

export interface CourseUnitSummary {
  id: string;
  title: string;
  sequence_order: number;
}

export interface CourseStudentRow {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  overall_status: 'not_started' | 'in_progress' | 'at_risk' | 'completed';
  overall_progress: number;
  last_access: string | null;
  unit_statuses: Record<string, {
    status: string;
    progress: number;
    completed_blocks: number;
    countable_blocks: number;
    last_access: string | null;
  }>;
}

export interface CourseStudentsProgress {
  course: { id: string; title: string };
  units: CourseUnitSummary[];
  students: CourseStudentRow[];
}

export const teacherApi = {
  getUnitProgress: (unitId: string) =>
    request<UnitProgressData>(`/api/teacher/units/${unitId}/progress`),

  getStudentProgress: (unitId: string, studentId: string) =>
    request<StudentProgressDetail>(`/api/teacher/units/${unitId}/students/${studentId}`),

  getCourseStudentsProgress: (courseId: string) =>
    request<CourseStudentsProgress>(`/api/teacher/courses/${courseId}/students-progress`),

  gradeSubmission: (submissionId: string, data: { score: number; feedback_text?: string; is_approved: boolean }) =>
    request<{ ok: boolean }>(`/api/teacher/submissions/${submissionId}/grade`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  setBlockGrade: (blockId: string, studentId: string, data: { score: number; is_approved: boolean }) =>
    request<{ ok: boolean }>(`/api/teacher/blocks/${blockId}/students/${studentId}/grade`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
