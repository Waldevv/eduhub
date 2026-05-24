export type BlockType = 'content' | 'activity' | 'exam' | 'interaction' | 'consolidation' | 'evaluation';

export interface Block {
  id: string;
  type: BlockType;
  title: string;
  enabled: boolean;
  required?: boolean;
  order: number;
  config?: {
    contentType?: 'video' | 'text' | 'file' | 'external';
    videoUrl?: string;
    text?: string;
    fileUrl?: string;
    externalUrl?: string;
    activityType?: 'quiz' | 'assignment' | 'link';
    quizId?: string;
    maxScore?: string | number;
    timeLimit?: string | number;
    allowMultipleAttempts?: boolean;
    maxAttempts?: string | number;
    description?: string;
    materialType?: 'none' | 'file' | 'link';
    materialUrl?: string;
    deadline?: string | number;
    submissionType?: 'file_upload' | 'text' | 'link' | 'file_text';
    allowLateSubmission?: boolean;
    estimatedTime?: string | number;
    openInNewTab?: boolean;
    interactionType?: 'channel' | 'forum' | 'thread' | 'stage' | 'text' | 'voice' | string;
    discordChannel?: string;
    discordThread?: string;
    discordForum?: string;
    discordStage?: string;
    consolidationType?: 'quiz' | 'review' | 'summary' | 'guided_stage';
    evaluationType?: 'simple_average' | 'weighted_average' | 'sum' | 'custom';
    selectedBlocks?: string[];
    weights?: { [blockId: string]: number };
    customFormula?: string;
    topicName?: string;
    callType?: 'voice' | 'stage';
    scheduledAt?: string;
    eventDescription?: string;
    channelName?: string;
    channelSource?: 'new' | 'existing';
    existingChannelId?: string;
    completionCriteria?: string;
    initialMessage?: string;
    voiceMode?: string;
    summaryType?: 'text' | 'file';
    summaryText?: string;
    summaryFileUrl?: string;
    studentDescription?: string;
  };
  dependencies?: string[];
}

export interface Lesson {
  id: string;
  title: string;
  description: string;
  pedagogicalGuidance?: string;
  courseId: string;
  blocks: Block[];
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Course {
  id: string;
  name: string;
  lessonsCount: number;
  studentsCount: number;
  progress: number;
}

export interface Student {
  id: string;
  name: string;
  avatar?: string;
  progress: number;
  completedBlocks: string[];
  lastAccess?: Date;
}
