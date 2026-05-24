-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'teacher',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Curso" (
    "id" TEXT NOT NULL,
    "teacher_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "objectives" TEXT,
    "estimated_hours" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Curso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Unidade" (
    "id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "pedagogical_guidance" TEXT,
    "sequence_order" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Unidade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bloco" (
    "id" TEXT NOT NULL,
    "unit_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "block_type" TEXT NOT NULL,
    "sequence_order" INTEGER NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "completion_mode" TEXT NOT NULL DEFAULT 'manual',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bloco_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlocoConteudo" (
    "id" TEXT NOT NULL,
    "block_id" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "body_text" TEXT,
    "url" TEXT,
    "stored_name" TEXT,
    "open_in_new_tab" BOOLEAN NOT NULL DEFAULT false,
    "require_full_watch" BOOLEAN NOT NULL DEFAULT false,
    "file_id" TEXT,

    CONSTRAINT "BlocoConteudo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlocoAtividade" (
    "id" TEXT NOT NULL,
    "block_id" TEXT NOT NULL,
    "activity_type" TEXT NOT NULL,
    "completion_criteria" TEXT NOT NULL DEFAULT 'submission',
    "approval_criteria" TEXT,
    "max_score" DECIMAL(65,30),
    "passing_score" DECIMAL(65,30),
    "due_date" TIMESTAMP(3),
    "time_limit_minutes" INTEGER,
    "max_attempts" INTEGER,
    "question_order_mode" TEXT NOT NULL DEFAULT 'sequential',
    "attempt_rule" TEXT NOT NULL DEFAULT 'best',
    "allow_late_submission" BOOLEAN NOT NULL DEFAULT false,
    "late_penalty_percent" DECIMAL(65,30),
    "validation_mode" TEXT,
    "url" TEXT,
    "uses_rubric" BOOLEAN NOT NULL DEFAULT false,
    "quiz_id" TEXT,
    "description" TEXT,

    CONSTRAINT "BlocoAtividade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlocoInteracao" (
    "id" TEXT NOT NULL,
    "block_id" TEXT NOT NULL,
    "interaction_type" TEXT NOT NULL,
    "completion_criteria" TEXT NOT NULL DEFAULT 'access',
    "title" TEXT,
    "initial_message" TEXT,
    "scheduled_at" TIMESTAMP(3),
    "channel_id" TEXT,

    CONSTRAINT "BlocoInteracao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlocoConsolidacao" (
    "id" TEXT NOT NULL,
    "block_id" TEXT NOT NULL,
    "consolidation_type" TEXT NOT NULL,
    "completion_criteria" TEXT NOT NULL DEFAULT 'access',
    "title" TEXT,
    "summary_text" TEXT,
    "scheduled_at" TIMESTAMP(3),
    "max_attempts" INTEGER,
    "time_limit_minutes" INTEGER,
    "question_order_mode" TEXT NOT NULL DEFAULT 'sequential',
    "passing_score" DECIMAL(65,30),
    "quiz_id" TEXT,
    "channel_id" TEXT,
    "file_id" TEXT,

    CONSTRAINT "BlocoConsolidacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegraBloco" (
    "id" TEXT NOT NULL,
    "unit_id" TEXT NOT NULL,
    "source_block_id" TEXT NOT NULL,
    "target_block_id" TEXT NOT NULL,
    "rule_type" TEXT NOT NULL DEFAULT 'completion',
    "condition_value" TEXT,
    "description" TEXT,

    CONSTRAINT "RegraBloco_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegraConclusaoUnidade" (
    "id" TEXT NOT NULL,
    "unit_id" TEXT NOT NULL,
    "rule_type" TEXT NOT NULL DEFAULT 'all_required',
    "required_percentage" DECIMAL(65,30),
    "requires_all_required_blocks" BOOLEAN NOT NULL DEFAULT true,
    "requires_activity_approval" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,

    CONSTRAINT "RegraConclusaoUnidade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Questionario" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Questionario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestaoQuestionario" (
    "id" TEXT NOT NULL,
    "quiz_id" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "question_type" TEXT NOT NULL DEFAULT 'multiple_choice',
    "sequence_order" INTEGER NOT NULL,
    "score" DECIMAL(65,30) NOT NULL DEFAULT 1,

    CONSTRAINT "QuestaoQuestionario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpcaoQuestionario" (
    "id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "option_text" TEXT NOT NULL,
    "is_correct" BOOLEAN NOT NULL DEFAULT false,
    "sequence_order" INTEGER NOT NULL,

    CONSTRAINT "OpcaoQuestionario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rubrica" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "rubric_type" TEXT NOT NULL DEFAULT 'activity',
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Rubrica_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CriterioRubrica" (
    "id" TEXT NOT NULL,
    "rubric_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sequence_order" INTEGER NOT NULL,

    CONSTRAINT "CriterioRubrica_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NivelRubrica" (
    "id" TEXT NOT NULL,
    "criterion_id" TEXT NOT NULL,
    "level_name" TEXT NOT NULL,
    "score_value" DECIMAL(65,30) NOT NULL,
    "sequence_order" INTEGER NOT NULL,

    CONSTRAINT "NivelRubrica_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RubricaAtividade" (
    "id" TEXT NOT NULL,
    "activity_block_id" TEXT NOT NULL,
    "rubric_id" TEXT NOT NULL,

    CONSTRAINT "RubricaAtividade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RubricaInteracao" (
    "id" TEXT NOT NULL,
    "interaction_block_id" TEXT NOT NULL,
    "rubric_id" TEXT NOT NULL,

    CONSTRAINT "RubricaInteracao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Matricula" (
    "id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "enrolled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Matricula_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgressoUnidade" (
    "id" TEXT NOT NULL,
    "unit_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'not_started',
    "completion_percentage" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "is_approved" BOOLEAN NOT NULL DEFAULT false,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "ProgressoUnidade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgressoBloco" (
    "id" TEXT NOT NULL,
    "block_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'locked',
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "is_approved" BOOLEAN NOT NULL DEFAULT false,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "ProgressoBloco_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Submissao" (
    "id" TEXT NOT NULL,
    "activity_block_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "attempt_number" INTEGER NOT NULL DEFAULT 1,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "score" DECIMAL(65,30),
    "is_late" BOOLEAN NOT NULL DEFAULT false,
    "is_approved" BOOLEAN NOT NULL DEFAULT false,
    "feedback_text" TEXT,
    "graded_by" TEXT,
    "graded_at" TIMESTAMP(3),

    CONSTRAINT "Submissao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RespostaQuestionario" (
    "id" TEXT NOT NULL,
    "submission_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "selected_option_id" TEXT,
    "answer_text" TEXT,
    "is_correct" BOOLEAN NOT NULL DEFAULT false,
    "sequence_order" INTEGER NOT NULL,
    "score_obtained" DECIMAL(65,30) NOT NULL DEFAULT 0,

    CONSTRAINT "RespostaQuestionario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvaliacaoRubrica" (
    "id" TEXT NOT NULL,
    "submission_id" TEXT NOT NULL,
    "rubric_id" TEXT NOT NULL,
    "total_score" DECIMAL(65,30) NOT NULL,
    "final_comment" TEXT,

    CONSTRAINT "AvaliacaoRubrica_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Arquivo" (
    "id" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "stored_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "storage_url" TEXT NOT NULL,
    "uploaded_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Arquivo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServidorDiscord" (
    "id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "teacher_id" TEXT NOT NULL,
    "discord_guild_id" TEXT NOT NULL,
    "server_name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ServidorDiscord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CanalDiscord" (
    "id" TEXT NOT NULL,
    "server_id" TEXT NOT NULL,
    "discord_channel_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "channel_type" TEXT NOT NULL,
    "created_by_platform" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CanalDiscord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "BlocoConteudo_block_id_key" ON "BlocoConteudo"("block_id");

-- CreateIndex
CREATE UNIQUE INDEX "BlocoAtividade_block_id_key" ON "BlocoAtividade"("block_id");

-- CreateIndex
CREATE UNIQUE INDEX "BlocoInteracao_block_id_key" ON "BlocoInteracao"("block_id");

-- CreateIndex
CREATE UNIQUE INDEX "BlocoConsolidacao_block_id_key" ON "BlocoConsolidacao"("block_id");

-- CreateIndex
CREATE UNIQUE INDEX "RegraConclusaoUnidade_unit_id_key" ON "RegraConclusaoUnidade"("unit_id");

-- CreateIndex
CREATE UNIQUE INDEX "Matricula_course_id_student_id_key" ON "Matricula"("course_id", "student_id");

-- CreateIndex
CREATE UNIQUE INDEX "ProgressoUnidade_unit_id_student_id_key" ON "ProgressoUnidade"("unit_id", "student_id");

-- CreateIndex
CREATE UNIQUE INDEX "ProgressoBloco_block_id_student_id_key" ON "ProgressoBloco"("block_id", "student_id");

-- CreateIndex
CREATE UNIQUE INDEX "ServidorDiscord_course_id_key" ON "ServidorDiscord"("course_id");

-- CreateIndex
CREATE UNIQUE INDEX "ServidorDiscord_discord_guild_id_key" ON "ServidorDiscord"("discord_guild_id");

-- AddForeignKey
ALTER TABLE "Curso" ADD CONSTRAINT "Curso_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Unidade" ADD CONSTRAINT "Unidade_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "Curso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bloco" ADD CONSTRAINT "Bloco_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "Unidade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlocoConteudo" ADD CONSTRAINT "BlocoConteudo_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "Bloco"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlocoConteudo" ADD CONSTRAINT "BlocoConteudo_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "Arquivo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlocoAtividade" ADD CONSTRAINT "BlocoAtividade_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "Bloco"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlocoAtividade" ADD CONSTRAINT "BlocoAtividade_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "Questionario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlocoInteracao" ADD CONSTRAINT "BlocoInteracao_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "Bloco"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlocoInteracao" ADD CONSTRAINT "BlocoInteracao_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "CanalDiscord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlocoConsolidacao" ADD CONSTRAINT "BlocoConsolidacao_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "Bloco"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegraBloco" ADD CONSTRAINT "RegraBloco_source_block_id_fkey" FOREIGN KEY ("source_block_id") REFERENCES "Bloco"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegraBloco" ADD CONSTRAINT "RegraBloco_target_block_id_fkey" FOREIGN KEY ("target_block_id") REFERENCES "Bloco"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegraConclusaoUnidade" ADD CONSTRAINT "RegraConclusaoUnidade_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "Unidade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestaoQuestionario" ADD CONSTRAINT "QuestaoQuestionario_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "Questionario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpcaoQuestionario" ADD CONSTRAINT "OpcaoQuestionario_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "QuestaoQuestionario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CriterioRubrica" ADD CONSTRAINT "CriterioRubrica_rubric_id_fkey" FOREIGN KEY ("rubric_id") REFERENCES "Rubrica"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NivelRubrica" ADD CONSTRAINT "NivelRubrica_criterion_id_fkey" FOREIGN KEY ("criterion_id") REFERENCES "CriterioRubrica"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RubricaAtividade" ADD CONSTRAINT "RubricaAtividade_activity_block_id_fkey" FOREIGN KEY ("activity_block_id") REFERENCES "BlocoAtividade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RubricaAtividade" ADD CONSTRAINT "RubricaAtividade_rubric_id_fkey" FOREIGN KEY ("rubric_id") REFERENCES "Rubrica"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RubricaInteracao" ADD CONSTRAINT "RubricaInteracao_interaction_block_id_fkey" FOREIGN KEY ("interaction_block_id") REFERENCES "BlocoInteracao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RubricaInteracao" ADD CONSTRAINT "RubricaInteracao_rubric_id_fkey" FOREIGN KEY ("rubric_id") REFERENCES "Rubrica"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Matricula" ADD CONSTRAINT "Matricula_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "Curso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Matricula" ADD CONSTRAINT "Matricula_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressoUnidade" ADD CONSTRAINT "ProgressoUnidade_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "Unidade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressoBloco" ADD CONSTRAINT "ProgressoBloco_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "Bloco"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submissao" ADD CONSTRAINT "Submissao_activity_block_id_fkey" FOREIGN KEY ("activity_block_id") REFERENCES "BlocoAtividade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RespostaQuestionario" ADD CONSTRAINT "RespostaQuestionario_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "Submissao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvaliacaoRubrica" ADD CONSTRAINT "AvaliacaoRubrica_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "Submissao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServidorDiscord" ADD CONSTRAINT "ServidorDiscord_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "Curso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CanalDiscord" ADD CONSTRAINT "CanalDiscord_server_id_fkey" FOREIGN KEY ("server_id") REFERENCES "ServidorDiscord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
