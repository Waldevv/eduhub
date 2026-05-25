<div align="center">
  <img width=100% src="https://capsule-render.vercel.app/api?type=waving&color=0:7C3AED,25:6D28D9,50:A78BFA,75:4F46E5,100:7C3AED&height=140&section=header&text=&fontSize=30&fontColor=fff&animation=twinkling&fontAlignY=35"/>
</div>

<div align="center">
  <img src="https://imgur.com/xFfNeaT.png" alt="EduHub Logo" width="250px" />
</div>

<div align="center">
  
[![Typing SVG](https://readme-typing-svg.demolab.com?font=Fira+Code&size=20&pause=1000&color=FFFFFF&center=true&vCenter=true&width=900&lines=Plataforma+Educacional+com+Integra%C3%A7%C3%A3o+Discord;Professores+%7C+Estudantes+%7C+Blocos+de+Aula;Cursos+%7C+Atividades+%7C+Quizzes+%7C+Eventos;Gest%C3%A3o+de+Progresso+em+Tempo+Real)](https://git.io/typing-svg)

</div> 

<div align="center">
  <a href="https://eduhub.site">
    <img src="https://img.shields.io/badge/Acessar-eduhub.site-7C3AED?style=for-the-badge&logo=vercel&logoColor=white"/>
  </a>
</div>

<br/>

<!-- <div align="center">
   <h1>📊 Repository Stats</h1>

   <p>Plataforma de aprendizado que integra gestão de cursos com canais, eventos e fóruns do Discord — conectando professores e estudantes em uma experiência educacional completa.</p>

   <p align="center">
<a href="https://github.com/Waldevv/eduhub/stargazers">
<img alt="Stars" src="https://img.shields.io/github/stars/Waldevv/eduhub?style=for-the-badge&logo=github&color=FFD54F&logoColor=D9E0EE&labelColor=302D41"/></a>
<a href="https://github.com/Waldevv/eduhub/network/members">
<img alt="Forks" src="https://img.shields.io/github/forks/Waldevv/eduhub?style=for-the-badge&logo=github&color=81C784&logoColor=D9E0EE&labelColor=302D41"/></a>
<a href="https://github.com/Waldevv/eduhub/issues">
<img alt="Issues" src="https://img.shields.io/github/issues/Waldevv/eduhub?style=for-the-badge&logo=github&color=E57373&logoColor=D9E0EE&labelColor=302D41"/></a>
<a href="https://github.com/Waldevv/eduhub/commits/main">
<img alt="Last Commit" src="https://img.shields.io/github/last-commit/Waldevv/eduhub?style=for-the-badge&logo=git&color=64B5F6&logoColor=D9E0EE&labelColor=302D41"/></a>
   </p>
</div> -->

<br/>

<div align="left">
  <h2>🛠 Tecnologias</h2>
  <p align="center">
    <a href="https://nodejs.org"><img width="55" src="https://img.icons8.com/color/48/nodejs.png" alt="Node.js"/></a>
    <a href="https://expressjs.com"><img width="55" src="https://img.icons8.com/ios/50/ffffff/express-js.png" alt="Express"/></a>
    <a href="https://www.typescriptlang.org"><img width="55" src="https://img.icons8.com/color/48/typescript.png" alt="TypeScript"/></a>
    <a href="https://nextjs.org"><img width="55" src="https://img.icons8.com/color/48/nextjs.png" alt="Next.js"/></a>
    <a href="https://react.dev"><img width="55" src="https://img.icons8.com/color/48/react-native.png" alt="React"/></a>
    <a href="https://www.postgresql.org"><img width="55" src="https://img.icons8.com/color/48/postgreesql.png" alt="PostgreSQL"/></a>
    <a href="https://www.prisma.io"><img width="55" src="https://img.icons8.com/color/48/prisma-orm.png" alt="Prisma"/></a>
    <a href="https://discord.js.org"><img width="55" src="https://img.icons8.com/color/48/discord-logo.png" alt="Discord.js"/></a>
    <a href="https://tailwindcss.com"><img width="55" src="https://img.icons8.com/color/48/tailwind_css.png" alt="Tailwind CSS"/></a>
  </p>

| Camada | Stack |
|--------|-------|
| **Backend** | Node.js · Express · TypeScript · Prisma ORM |
| **Frontend** | Next.js 15 · React 18 · TypeScript · Tailwind CSS · shadcn/ui |
| **Banco de dados** | PostgreSQL (Neon) |
| **Bot** | Discord.js v14 |
| **Deploy** | Railway (backend) · Vercel (frontend) |
</div>

<br/>

<div align="left">
  <h2>Como rodar localmente</h2>

### Pré-requisitos

- Node.js 18+
- PostgreSQL (ou conta no [Neon](https://neon.tech))
- Aplicação Discord criada no [Discord Developer Portal](https://discord.com/developers/applications)

---

### 1. Clone o repositório

```bash
git clone https://github.com/Waldevv/eduhub.git
cd eduhub
```

---

### 2. Configure o Backend

```bash
cd backend
cp .env.example .env
```

Edite o `.env` com suas variáveis (veja a seção [Variáveis de Ambiente](#-variáveis-de-ambiente)).

```bash
npm install
npx prisma migrate dev   # cria as tabelas no banco
npm run dev              # inicia em http://localhost:3001
```

---

### 3. Configure o Frontend

```bash
cd ../frontend
```

Crie um arquivo `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

```bash
npm install
npm run dev              # inicia em http://localhost:3000
```

</div>

<br/>

<div align="left">
  <h2>Variáveis de Ambiente</h2>

### Backend (`backend/.env`)

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `DATABASE_URL` | String de conexão PostgreSQL | `postgresql://user:pass@host/eduhub?sslmode=require` |
| `PORT` | Porta do servidor | `3001` |
| `JWT_SECRET` | Segredo para assinatura dos tokens JWT | `uma_string_aleatoria_longa` |
| `DISCORD_CLIENT_ID` | ID do cliente OAuth da aplicação Discord | `123456789012345678` |
| `DISCORD_CLIENT_SECRET` | Secret do cliente OAuth | `abc123...` |
| `DISCORD_REDIRECT_URI` | URI de callback OAuth | `http://localhost:3001/api/auth/discord/callback` |
| `DISCORD_BOT_TOKEN` | Token do bot Discord | `Bot abc123...` |
| `FRONTEND_URL` | URL do frontend (usado em redirects e anúncios) | `http://localhost:3000` |

### Frontend (`frontend/.env.local`)

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `NEXT_PUBLIC_API_URL` | URL base da API backend | `http://localhost:3001` |

</div>

<br/>

<div align="left">
  <h2>Endpoints da API</h2>

> Base URL: `http://localhost:3001`
>
> Todos os endpoints (exceto os marcados como **público**) exigem header `Authorization: Bearer <token>`.

---

### Auth — `/api/auth`

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| `GET` | `/discord` | Redireciona para login OAuth do Discord | Público |
| `GET` | `/discord/callback` | Callback OAuth — gera o JWT da sessão | Público |
| `POST` | `/complete-profile` | Completa perfil após primeiro login (define papel: professor/estudante) | Sim |
| `GET` | `/me` | Retorna dados do usuário autenticado | Sim |

---

### Cursos — `/api/courses`

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| `GET` | `/join/:code` | Busca informações de um curso pelo código de convite | Público |
| `POST` | `/join/:code` | Estudante entra no curso com código de convite | Sim |
| `GET` | `/` | Lista cursos do professor autenticado | Sim |
| `GET` | `/:id` | Retorna detalhes de um curso | Sim |
| `POST` | `/` | Cria um novo curso | Sim |
| `PATCH` | `/:id` | Atualiza dados de um curso | Sim |
| `DELETE` | `/:id` | Remove um curso | Sim |

---

### Unidades (Aulas) — `/api/units`

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| `GET` | `/course/:courseId` | Lista unidades de um curso | Sim |
| `GET` | `/:id` | Retorna detalhes de uma unidade com blocos | Sim |
| `POST` | `/` | Cria uma nova unidade | Sim |
| `PATCH` | `/reorder` | Reordena unidades em lote | Sim |
| `PATCH` | `/:id` | Atualiza dados de uma unidade | Sim |
| `DELETE` | `/:id` | Remove uma unidade (e canais Discord vinculados) | Sim |

---

### Blocos — `/api/blocks`

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| `GET` | `/unit/:unitId` | Lista blocos de uma unidade | Sim |
| `POST` | `/` | Cria um novo bloco | Sim |
| `PATCH` | `/reorder` | Reordena blocos em lote | Sim |
| `PATCH` | `/:id` | Atualiza configurações de um bloco | Sim |
| `DELETE` | `/:id` | Remove um bloco | Sim |

**Tipos de bloco:** `content` · `activity` · `exam` · `interaction` · `consolidation` · `evaluation`

---

### Quizzes — `/api/quizzes`

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| `GET` | `/` | Lista quizzes criados pelo professor | Sim |
| `GET` | `/:id` | Retorna quiz com questões e opções | Sim |
| `POST` | `/` | Cria um quiz | Sim |
| `PATCH` | `/:id` | Atualiza título/descrição do quiz | Sim |
| `DELETE` | `/:id` | Remove um quiz | Sim |
| `POST` | `/:quizId/questions` | Adiciona questão ao quiz | Sim |
| `PATCH` | `/questions/:id` | Atualiza uma questão | Sim |
| `DELETE` | `/questions/:id` | Remove uma questão | Sim |
| `PATCH` | `/:quizId/questions/reorder` | Reordena questões | Sim |
| `POST` | `/questions/:questionId/options` | Adiciona opção a uma questão | Sim |
| `PATCH` | `/options/:id` | Atualiza uma opção | Sim |

---

### Estudante — `/api/student`

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| `GET` | `/courses` | Lista cursos nos quais o estudante está matriculado | Sim |
| `GET` | `/courses/:id` | Detalhes do curso com progresso das unidades | Sim |
| `GET` | `/units/:id` | Unidade com blocos e status de progresso/desbloqueio | Sim |
| `POST` | `/units/:id/sync-discord` | Ressincroniza permissões Discord do estudante na unidade | Sim |
| `GET` | `/discord-membership/:courseId` | Verifica se o estudante está no servidor Discord do curso | Sim |
| `POST` | `/discord-leave/:courseId` | Remove o estudante do servidor Discord do curso | Sim |
| `POST` | `/blocks/:id/complete` | Marca um bloco como concluído manualmente | Sim |
| `POST` | `/blocks/:id/quiz` | Envia respostas de quiz e registra progresso | Sim |
| `POST` | `/blocks/:id/assignment` | Envia tarefa (arquivo, texto ou link) | Sim |

---

### Professor — `/api/teacher`

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| `GET` | `/units/:unitId/progress` | Visão geral do progresso de todos os estudantes na unidade | Sim |
| `GET` | `/units/:unitId/students/:studentId` | Progresso detalhado de um estudante em uma unidade | Sim |
| `GET` | `/courses/:courseId/students-progress` | Progresso de todos os estudantes em todas as unidades do curso | Sim |
| `POST` | `/submissions/:id/grade` | Corrige uma submissão (atribui nota e aprovação) | Sim |
| `POST` | `/blocks/:blockId/students/:studentId/grade` | Atribui nota manual a um estudante em um bloco | Sim |

---

### Discord — `/api/discord`

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| `GET` | `/user-guilds` | Lista servidores Discord que o professor administra | Sim |
| `GET` | `/bot-status/:guildId` | Verifica se o bot está no servidor e se tem Community ativo | Sim |
| `GET` | `/channels/:guildId` | Lista canais do servidor Discord | Sim |
| `GET` | `/server/:courseId` | Retorna servidor Discord vinculado ao curso | Sim |
| `POST` | `/server` | Vincula um servidor Discord a um curso | Sim |
| `DELETE` | `/server/:courseId` | Desvincula o servidor Discord do curso | Sim |
| `POST` | `/server/:courseId/regenerate-invite` | Gera novo link de convite permanente para o servidor | Sim |
| `POST` | `/publish-lesson/:unitId` | Cria canais Discord para uma unidade (texto, fórum, voz, anúncios) | Sim |

---

</div>

<br/>

<div align="left">
  <h2>🗂 Estrutura do Projeto</h2>

```
eduhub/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma       # Modelos do banco de dados
│   └── src/
│       ├── lib/
│       │   ├── discord-bot.ts  # Bot Discord (canais, eventos, permissões)
│       │   └── prisma.ts       # Cliente Prisma singleton
│       ├── middleware/
│       │   └── auth.ts         # Middleware JWT
│       └── routes/             # Rotas da API
└── frontend/
    └── src/
        ├── app/
        │   ├── student/        # Páginas do estudante
        │   └── teacher/        # Páginas do professor
        ├── modules/lessons/    # Componentes de aula
        └── lib/api.ts          # Cliente HTTP para o backend
```

</div>

<div align="left">
<img width=100% src="https://capsule-render.vercel.app/api?type=waving&color=0:7C3AED,25:6D28D9,50:A78BFA,75:4F46E5,100:7C3AED&height=120&section=footer"/>
</div>
