# 01deck — Complete Project Specification
**Version:** As of March 30, 2026  
**Purpose:** Full technical spec for Codex to continue development  
**Brand:** 01AI · 01 Protocol · 01deck Agent Viewer

---

## 1. Project Overview

**01deck** is a React + TypeScript web application serving as an AI Agent Viewer for the 01AI brand. It functions as a collector/manager/launcher for AI agents modeled after trading card mechanics (rarity tiers, flip cards, holographic effects). The app integrates a separate music collaboration plugin called **01maestro**, procedural avatar generation via Canvas API, an Arcade Lab with mini-games, and multi-step onboarding + agent creation flows.

### Core Concepts
- **Agents** are persistent AI entities with identity, memory mode, stats, tools, rarity tier, and a visual portrait
- **01 Protocol** is the fictional standard (v3.0) that governs agent creation (`PRO-XXX-NAME` IDs, `.01ai` identity files, `.01bundle` portability)
- **Rarity System** (common → uncommon → rare → epic → legend → mythic) drives visual treatment of cards
- **01maestro** is an extension/plugin for music creation — treated as a separately branded VST-style panel inside the app
- **Procedural Avatars** are Canvas-drawn portraits generated deterministically from agent attributes (name, role, goal, seed, style, hue)

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18.3.1 |
| Language | TypeScript |
| Styling | Tailwind CSS v4 (utility-first, no tailwind.config.js) |
| Animation | `motion` package (`motion/react` subpath) — import as `{ motion, AnimatePresence } from 'motion/react'` |
| Drag & Drop | `react-dnd` + `react-dnd-html5-backend` (DndProvider wraps entire app) |
| State | React Context (`AppContext`) — no Redux, no Zustand |
| Routing | `react-router` v7 (not react-router-dom) |
| Icons | `lucide-react` |
| Canvas | Raw Canvas API (no Konva) for procedural avatar generation |
| Build | Vite 6 |
| Asset imports | Figma assets via `figma:asset/[hash].png` virtual scheme |

---

## 3. Directory Structure

```
/src
  /app
    App.tsx                          # Root layout, wraps AppProvider + DndProvider
    /context
      AppContext.tsx                 # Global state, themes, all setters
    /data
      agents.ts                     # Agent type, Rarity type, rarityConfig, 16 seed agents
      categories.ts                 # 7 category definitions with roles
      musicAgents.ts                # 6 01maestro music agents (HARMONY, RHYTHM, MELODY, BASS, SYNTH, VOCAL)
    /components
      TopBar.tsx                    # Fixed top nav: logo, search, create, social, online toggle, maestro, arcade, theme
      LeftRail.tsx                  # Fixed left icon rail (64px) + hover slide-out submenu (220px)
      AgentList.tsx                 # Main content list header + renders AgentBar rows
      AgentBar.tsx                  # Single agent row: portrait, name, rarity, last used, hover actions, drag
      AgentCardModal.tsx            # Full trading card modal: flip animation, CardFront + CardBack
      ChatWindow.tsx                # Floating draggable chat window with agent DnD drop support
      ThemePickerPanel.tsx          # Right-side slide panel: 5 themes, density, accent, card frame
      ArcadePanel.tsx               # Bottom sheet: 3 mini-games (Protocol Match, Agent Chess, Agent Choice)
      AgentCreatorModal.tsx         # Full Skyrim-style agent creation: 6 tabs, split panel, avatar preview, generation flow
      AgentImportFlow.tsx           # First-run import wizard: scan → results → convert existing AI agents to 01Protocol
      OnboardingFlow.tsx            # Full-screen 6-screen onboarding: welcome → protocol explainer → create agent → generate → avatar review → success
      MaestroPanel.tsx              # 01maestro VST floating panel (bottom-right): transport, agent slots, drag-drop
      ProceduralAvatar.tsx          # Canvas wrapper component for avatarUtils renderer
      RarityBadge.tsx               # Rarity indicator pill with logo mark, rarity color, tooltip
      RarityInfoModal.tsx           # Modal showing protocol ID, edition number, rarity tier detail
      /games
        ProtocolMatch.tsx           # Memory card match game (01Protocol symbols, 30s timer)
        AgentChess.tsx              # Simple chess game vs agent
        AgentChoice.tsx             # Agent-designed custom game
      /ui                           # Full shadcn/ui component library (accordion, badge, button, card, dialog, etc.)
      /figma
        ImageWithFallback.tsx       # Protected component — never modify
    /plugins
      /01maestro
        MaestroVSTPlugin.tsx        # useMaestroVSTPlugin hook: VSTPluginData, processData, simulateMemoryActivity
    /utils
      avatarUtils.ts                # Canvas avatar renderer: renderAvatarToCanvas, generateAvatarDataUrl
  /styles
    fonts.css                       # Font imports only (top of file)
    index.css                       # Base styles
    tailwind.css                    # Tailwind directives
    theme.css                       # CSS custom properties / design tokens
  /imports                          # SVG imports from Figma
```

---

## 4. Data Models

### 4.1 Agent Interface (`/src/app/data/agents.ts`)

```typescript
interface Agent {
  // Core
  id: string;                         // 'a001' | 'user-{timestamp}' | 'm001' | 'imported-{ts}'
  name: string;                       // ALL CAPS preferred (ARIA, NEXUS...)
  category: string;                   // matches Category.id
  role: string;                       // matches Category.roles[]
  description: string;
  specialization: string;
  lastUsed: Date;
  rarity: Rarity;                     // 'common'|'uncommon'|'rare'|'epic'|'legend'|'mythic'
  rarityCount: string;                // '1/1' | '3/10' | 'Unlimited'
  portrait: string;                   // URL or data:image/png (procedural)
  tools: string[];
  memoryNotes: string;
  online: boolean;
  tags: string[];
  stats: AgentStat[];                 // { label: string; value: number (0-100) }[]
  protocolVersion: string;            // '01P v3.0'
  protocolId: string;                 // 'PRO-001-ARIA'
  chatOpening: string;

  // 01 Protocol extended
  isUserCreated?: boolean;
  goal?: string;                      // Secondary directive
  memoryMode?: 'always_on' | 'session_only' | 'manual';
  serial?: number;
  totalSupply?: number;
  systemPrompt?: string;

  // 01maestro extension
  maestroEnabled?: boolean;
  musicGenres?: string[];
  theoryDepth?: 'basic' | 'intermediate' | 'advanced' | 'expert';
  productionSpecialty?: string[];
  primaryDAWs?: string[];
  midiSpecialty?: string[];
  pluginSpecialty?: string[];
  livePerformanceSupport?: boolean;
  outputFormats?: string[];
  collaborationTone?: 'technical' | 'creative' | 'balanced' | 'minimal';
  allowedReferencesPolicy?: 'none' | 'abstract-only' | 'with-permission';
  bpm?: number;
  timeSignature?: string;

  // Verification
  isVerified?: boolean;

  // Memory file management
  memoryFilePath?: string;
  defaultMemoryPath?: string;

  // Memory activity (for real-time color change — NOT YET IMPLEMENTED)
  memoryActivity?: {
    isReading?: boolean;
    isWriting?: boolean;
    readIntensity?: number;           // 0-1
    writeIntensity?: number;          // 0-1
  };
}
```

### 4.2 Rarity Config (`rarityConfig`)
```typescript
type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legend' | 'mythic';

rarityConfig[rarity] = {
  label: string;
  color: string;       // Primary color hex
  borderColor: string;
  glowColor: string;   // rgba string for box-shadow
  textColor: string;
  cardBg: string;      // linear-gradient for card background
}
```

**Rarity visual hierarchy:**
- `common` — Slate gray
- `uncommon` — Light slate blue
- `rare` — Amber/gold (`#f59e0b`)
- `epic` — Purple (`#a855f7`)
- `legend` — Animated rainbow gradient border + shimmer sweep + particle effects
- `mythic` — Electric blue (`#3b82f6`) + radial glow + pulsing ring

### 4.3 Categories (`/src/app/data/categories.ts`)
7 categories: `research`, `creative`, `code`, `strategy`, `comms`, `finance`, `data`  
Each has: `id`, `icon` (emoji), `label`, `roles[]` (5 roles per category)

### 4.4 Seed Agents
16 pre-defined agents in `/src/app/data/agents.ts`:
`ARIA` (legend), `NEXUS` (mythic), `LYRA` (epic), `ORION` (rare), `VELA` (rare), `KOVA` (uncommon), `SOLANA` (epic), `ECHO` (common), `NOVA` (mythic), `SAGE` (uncommon), `FLUX` (common), `ATLAS` (rare), `CIPHER` (epic), `LUMEN` (uncommon), `VECTOR` (common), `PRISM` (rare)

### 4.5 Music Agents (`/src/app/data/musicAgents.ts`)
6 agents with `maestroEnabled: true`:  
`HARMONY` (epic), `RHYTHM` (rare), `MELODY` (mythic), `BASS` (uncommon), `SYNTH` (epic), `VOCAL` (rare)  
These are auto-loaded into `userAgents` when `maestroEnabled` is toggled ON for the first time.

---

## 5. Global State (`AppContext`)

Located at `/src/app/context/AppContext.tsx`

### 5.1 State Slices

| State | Type | Purpose |
|---|---|---|
| `currentThemeId` | `ThemeId` | Active theme ('core' default) |
| `selectedCategory` | `string\|null` | Left rail category filter |
| `selectedRole` | `string\|null` | Left rail role sub-filter |
| `searchQuery` | `string` | TopBar search input |
| `activeAgent` | `Agent\|null` | Agent shown in card modal |
| `isCardVisible` | `boolean` | Card modal open state |
| `isChatOpen` | `boolean` | Chat window visibility |
| `chatAgent` | `Agent\|null` | Agent loaded in chat window |
| `chatMessages` | `ChatMessage[]` | Message history |
| `isThemeOpen` | `boolean` | Theme panel visibility |
| `isArcadeOpen` | `boolean` | Arcade panel visibility |
| `isOnline` | `boolean` | Online/offline toggle (simulated) |
| `showOnboarding` | `boolean` | First-run onboarding (default: true) |
| `showCreator` | `boolean` | Agent creator modal |
| `showAgentImport` | `boolean` | Import flow modal |
| `userAgents` | `Agent[]` | User-created agents (prepended to list) |
| `maestroEnabled` | `boolean` | 01maestro extension active |
| `maestroOpen` | `boolean` | Maestro VST panel open |
| `vstAgents` | `Agent[]` | Agents loaded into the VST panel |

### 5.2 Derived State
```typescript
// Merge + filter + sort
const allAgents = [...userAgents, ...initialAgents];
const filteredAgents = allAgents
  .filter(a => matchesCategory && matchesRole && matchesSearch)
  .sort((a, b) => b.lastUsed.getTime() - a.lastUsed.getTime());
// Exposed as: agentList
```

### 5.3 Key Functions

**`addAgent(agent)`** — Prepends to `userAgents` (user-created + imported + music)  
**`setChatAgent(agent)`** — Sets chat agent + injects welcome message + opens chat window  
**`sendMessage(content)`** — Appends user message, simulates agent response with setTimeout (800–1400ms). Response varies based on `isUserCreated` flag  
**`addToVST(agent)` / `removeFromVST(agentId)`** — Manage `vstAgents` array  
**`completeOnboarding()`** — Sets `showOnboarding: false`  

### 5.4 Themes
5 theme objects in `AppContext.tsx`:
- `core` — Pure black (#080808), white accent
- `midnight` — Dark navy (#050814), electric blue (#6384ff) accent  
- `holo` — Deep purple (#080510), prismatic purple (#c864ff) accent
- `clean` — Light (#f5f5f5), black accent (only light theme)
- `solar` — Near-black amber (#0d0900), gold (#f59e0b) accent

Each theme has: `bg`, `surface1`, `surface2`, `surface3`, `border`, `text`, `textMuted`, `accent`, `glow`, `isDark`

---

## 6. Component Architecture

### 6.1 App.tsx Layout
```
AppProvider
  DndProvider (HTML5Backend)
    ┌─────────────────────────────────────────┐
    │ [Maestro border overlay - fixed z-[60]] │
    │ [Offline banner - fixed top-14 z-30]    │
    │ TopBar - fixed top-0 z-50 h-14          │
    │ LeftRail - fixed left-0 top-14 z-40     │
    │ main - pt-14 pl-[64px]                  │
    │   AgentList                             │
    ├─────────────────────────────────────────┤
    │ Overlays (all fixed position):          │
    │   AgentCardModal    z-50                │
    │   ChatWindow        z-40                │
    │   ThemePickerPanel  z-50                │
    │   ArcadePanel       z-50                │
    │   MaestroPanel      z-40 (bottom-right) │
    │   AgentCreatorModal z-[100]             │
    │   AgentImportFlow   z-[100]             │
    │   OnboardingFlow    z-[200]             │
    └─────────────────────────────────────────┘
```

### 6.2 TopBar (`TopBar.tsx`)
Fixed 56px bar. Left to right:
1. **Logo** — `figma:asset/6e76ff0f...` image, inverted on light theme
2. **Divider + "Agent Viewer" label**
3. **Search input** — filters `agentList` via `searchQuery`
4. **Spacer**
5. **Create button** — opens `AgentCreatorModal` via `setShowCreator(true)`
6. **Connect dropdown** — social links grid (Instagram, Twitter, Facebook, Telegram, TikTok, Discord, Email)
7. **Online/Offline toggle** — green/red indicator, spin animation when offline
8. **Sync indicator** — pulsing green dot when online
9. **Chat button** — `isChatOpen` toggle
10. **Arcade button** — opens `ArcadePanel`
11. **01maestro button** — `maestroEnabled` toggle + opens panel; pink (#ff4da6) accent when active
12. **Skin button** — opens `ThemePickerPanel`

### 6.3 LeftRail (`LeftRail.tsx`)
- 64px icon column (fixed, z-40)
- ⚡ All Agents button at top (clears category + role filter)
- 7 category emoji buttons with agent count badges
- Hover → 220px slide-out submenu (AnimatePresence) with role list
- Selected state: accent background + right-edge indicator bar
- `layoutId="railIndicator"` for shared Motion animation between buttons

### 6.4 AgentList (`AgentList.tsx`)
- Sticky header with category/role breadcrumb + agent count
- Column legend row (Avatar, Name/Role, Protocol, Last Used, Rarity)
- `AnimatePresence mode="popLayout"` over `AgentBar` rows
- Empty state with floating inbox icon

### 6.5 AgentBar (`AgentBar.tsx`)
Single row component. Features:
- `useDrag` hook (type: `'AGENT'`, item: `{ agent }`)
- Drop into VST: if `maestroEnabled` and `dropResult`, calls `addToVST(agent)`
- **Click** → open card modal
- **Mouse hold 450ms** → expand card modal (same effect, different intent)
- **Left accent bar** — rainbow gradient for legend, rarity color for others
- **Shimmer sweep** on hover (animated gradient)
- **Legend/Mythic** animated glow overlay on hover
- Portrait with fallback (letter initial + gradient bg on `onError`)
- Badges: online dot, CREATED badge (blue, user-created), MAESTRO badge (pink, `maestroEnabled`)
- Hover action buttons: Chat + View (appear with slide-in animation)
- Rarity badge via `RarityBadge` component

### 6.6 AgentCardModal (`AgentCardModal.tsx`)
Trading card flip modal.
- Z-50, blurred backdrop
- Card dimensions: 380×532px
- **3D flip** via `rotateY: isFlipped ? 180 : 0`, `perspective: 1200`, `transformStyle: 'preserve-3d'`
- `CardFront`: 01Protocol header, portrait image, rarity badge, protocol version tag, agent name/role, specialization, not-verified warning badge, 01PROTOCOL branding footer
  - Legend: animated rainbow gradient border, shimmer sweep, particle float effect
  - Mythic: radial blue glow, particle float
  - Verified glow: animated green box-shadow
- `CardBack`: stats bars, tools grid, memory notes, tags, protocol metadata, "Start Conversation" CTA
- Outer radial glow behind card (rarity color)
- `RarityInfoModal` nested — opens when rarity badge clicked on front

### 6.7 ChatWindow (`ChatWindow.tsx`)
Floating draggable window.
- Default position: `{ x: window.innerWidth - 420, y: 80 }`
- Window drag via `onMouseDown` on title bar + `mousemove`/`mouseup` listeners
- `useDrop` target — accepts `'AGENT'`, calls `setChatAgent(item.agent)`
- Minimize/maximize toggle
- Message thread with agent portrait thumbnails
- Simulated responses (random from array, 800–1400ms delay)
- "Drop agent card here" empty state

### 6.8 AgentCreatorModal (`AgentCreatorModal.tsx`)
Deep Skyrim-style character creation. **Key architecture:**

**Screens:** `'creator'` | `'generating'` | `'success'`  
**Tabs (creator screen):** `template` | `identity` | `appearance` | `personality` | `capabilities` | `memory`

**Layout:** Split panel — left 320px sidebar (live avatar preview + stats + generate button) + right content area

**Tab details:**
- **Template** — 6 presets (Intelligence Scout, Creative Visionary, Code Architect, Strategic Advisor, Data Scientist, Blank Canvas) + auto-populates all other fields
- **Identity** — Name (required, min 2 chars), Role (text input), Goal/secondary directive (required, min 10 chars), Category picker (7 categories)
- **Appearance** — Avatar style (4: futuristic/abstract/neon/minimal), color palette (8 hues), fine controls (eye size, eye spacing, glow intensity, pattern density sliders 0.5–2.0)
- **Personality** — 4 trait sliders (Analytical, Creative, Assertive, Empathetic) 0-100
- **Capabilities** — Tool picker grid (28 available tools, multi-select), Memory Mode radio (always_on/session_only/manual), Response Style radio (detailed/concise/adaptive)
- **Memory** — Stat allocation with bonus point pool (20 bonus pts on top of 320 base), +/− buttons per stat (Intelligence, Speed, Memory, Adaptability), remaining points display

**Generation flow (6 steps):**
```
Initializing 01 Protocol v3.0 (500ms)
Encoding neural architecture (600ms)
Generating identity hash (700ms)
Compiling capability matrix (600ms)
Rendering visual identity (800ms)
Finalizing agent bundle (500ms)
```
After completion: calls `generateAvatarDataUrl()` → builds `Agent` object → calls `addAgent()` → transitions to success screen

**Success screen:** Shows generated avatar, protocol ID, "Open Agent" (→ opens chat) + "Create Another" buttons

**Validation:** Checks name length, role presence, goal length, at least 1 tool selected — jumps to first errored tab

**Templates array (TEMPLATES):** `AgentTemplate` type with `name, description, icon, category, role, goal, stats, personality, tools, style, hue?`

### 6.9 AgentImportFlow (`AgentImportFlow.tsx`)
Import wizard modal (z-100). Steps: `'intro'` → `'searching'` → `'results'` → `'converting'` → `'complete'`
- Mock scans for 3 agents (ChatGPT Assistant, Claude Coding Helper, Gemini Research)
- Per-agent actions: `ignore | convert | view | delete`
- Convert creates Agent objects with `isVerified: false`, `isUserCreated: true`
- Simulates 2s search + 0.5s per conversion
- Imported agents get generic portrait (Unsplash URL), default stats

### 6.10 OnboardingFlow (`OnboardingFlow.tsx`)
6-screen full-screen flow (z-200). Screens:
1. **Welcome** — Logo, headline "Create AI agents that think, remember, evolve", CTA, skip button
2. **Protocol Explainer** — 3 cards: Identity (.01ai), Memory (always_on), Portability (.01bundle)
3. **Agent Form** — Name input + Goal textarea + collapsible Auto Defaults panel (role, memory mode, serial, etc.)
4. **Generation** — Spinning orb + 5-step progress list (GEN_STEPS with check icons)
5. **Avatar Customizer** — ProceduralAvatar live preview, seed randomize, style picker (4), hue palette (6 colors)
6. **Success** — Avatar card, "Meet [NAME]", Open Agent / View Collection / Create Another CTAs

Created agent from onboarding:
- Role: `'01 Protocol Agent Ambassador'`
- Rarity: `'legend'` (1/1)
- Memory: `always_on`
- Has full `systemPrompt` with primary directive (01ai ecosystem) + secondary goal

**Progress stepper:** `Stepper` component (animated pill widths using Motion `layoutId` equivalent)

### 6.11 ArcadePanel (`ArcadePanel.tsx`)
Bottom sheet slide-up (z-50, `y: 0 → '100%'`). Contains 3 games:
- **Protocol Match** — `/components/games/ProtocolMatch.tsx` — memory card matching
- **Agent Chess** — `/components/games/AgentChess.tsx` — chess vs agent
- **Agent Choice** — `/components/games/AgentChoice.tsx` — agent-generated custom game

External game slots section (stub UI for future 01Protocol game registry).

### 6.12 MaestroPanel (`MaestroPanel.tsx`)
Fixed bottom-right floating panel (480px wide, z-40). Pink/magenta accent `#ff4da6`.
- Transport controls: Play/Stop, BPM input, Time Signature select
- Export MIDI, Import Project, VST Settings buttons (stub)
- Agent drop zone (`useDrop` accept: `'AGENT'`)
- Agent slots list: portrait, name, role, BPM/time signature
- Auto-loads `musicAgents` via `addAgent()` when `maestroEnabled` first turns on
- Footer: agent count + BPM/time

### 6.13 ThemePickerPanel (`ThemePickerPanel.tsx`)
Right-side slide panel (360px, z-50). Sections:
- Default Skins — 5 theme cards with mini preview swatches
- Theme Import/Export (stub buttons)
- Density mode (Compact/Default/Relaxed — Default hardcoded as active)
- Accent color swatches (7 colors — cosmetic only, not wired to context)
- Card Frame Style (6 options — cosmetic only)

### 6.14 ProceduralAvatar (`ProceduralAvatar.tsx`)
Canvas wrapper component. Props: `name, role, goal, seed?, style?, hueOverride?, width?, height?, className?, canvasStyle?`  
Calls `renderAvatarToCanvas()` in `useEffect` whenever any prop changes.

### 6.15 RarityBadge (`RarityBadge.tsx`)
Shows 01Protocol logo mark + rarity dot + rarity label text.  
Sizes: sm/md/lg. Optional tooltip on click. Legend gets animated shimmer. Mythic gets pulsing ring.  
Logo mark: `figma:asset/2806ffa57bf19ee58103436cb23492abbee29bfd.png` (inverted on dark themes)

### 6.16 RarityInfoModal (`RarityInfoModal.tsx`)
Small modal (400px wide). Shows: Unique Identifier (protocolId), Edition Number (serial/total), Rarity Tier.

---

## 7. Procedural Avatar System (`/src/app/utils/avatarUtils.ts`)

### 7.1 Functions
- **`hashString(str)`** — djb2-style hash, returns positive int
- **`seededRNG(seed)`** — XOR-shift PRNG, returns `() => number (0-1)`
- **`renderAvatarToCanvas(canvas, opts)`** — main renderer
- **`generateAvatarDataUrl(opts)`** — creates off-screen canvas, returns `data:image/png`

### 7.2 AvatarOptions
```typescript
interface AvatarOptions {
  name: string;
  role: string;
  goal: string;
  seed?: number;         // 0 default; increment for "randomize"
  style?: AvatarStyle;   // 'futuristic' | 'abstract' | 'neon' | 'minimal'
  hueOverride?: number;  // 0-360 HSL hue, else derived from hash
  width?: number;        // 400 default
  height?: number;       // 560 default
}
```

**Determinism:** `baseSeed = hashString(name+role+goal) + seed * 7919`

### 7.3 Render Pipeline (14 steps)
1. Background gradient (style-specific)
2. Scanline texture (3px stride, 6% alpha)
3. Background pattern:
   - `futuristic` → hex grid
   - `abstract` → organic radial blobs
   - `neon` → diagonal crossed grid
   - `minimal` → dot grid
4. Ambient radial glow
5. Circuit/energy lines with 90° turns + node dots
6. Outer decorative ring with tick marks + arc segments (skipped for abstract)
7. Inner face sphere with gradient fill + border ring
8. **Eyes** (varies by style):
   - `abstract` → diamond (rotated rect) with radial gradient
   - `neon` → rectangular with neon stroke fill
   - `futuristic/minimal` → circular with iris/pupil/glint
9. Nose/sensor:
   - `futuristic/neon` → triangle sensor + center dot
   - `abstract` → filled circle
   - `minimal` → skipped
10. Mouth/status bar:
    - `abstract` → sine wave stroke
    - others → segmented LED bar (4-5 segments)
11. Scanning line (futuristic/neon only)
12. Bottom vignette gradient
13. Agent name (bold 30px), role (11px), protocol footer (9px) — with HSL text color
14. Top vignette gradient

---

## 8. 01maestro Plugin Architecture (`/src/app/plugins/01maestro/`)

### 8.1 `MaestroVSTPlugin.tsx`
Exports `useMaestroVSTPlugin()` hook + `VSTPluginData` / `MaestroVSTPlugin` interfaces.

```typescript
interface VSTPluginData {
  vstIn: { midiData: number[]; audioData: number[]; timestamp: number } | null;
  vstOut: { midiData: number[]; audioData: number[]; timestamp: number } | null;
}

interface MaestroVSTPlugin {
  id: string;
  name: string;
  version: string;
  initialize: () => void;
  cleanup: () => void;
  processData: (agents, bpm, timeSignature) => VSTPluginData;
  simulateMemoryActivity: (agentId) => { isReading, isWriting, readIntensity, writeIntensity };
}
```

**`processData()`** — mock implementation: generates MIDI notes (`60 + i*4` per agent), sine audio samples, transposes out by +12 semitones, reduces volume by 0.8×

**`simulateMemoryActivity()`** — random read/write booleans + 0-1 intensity values (used for future name color animation)

### 8.2 Visual Identity
- Accent color: `#ff4da6` (hot pink/magenta)
- When `maestroEnabled`: full-viewport `border: 2px solid #ff4da6` + `inset box-shadow` overlay (z-60, pointer-events-none)
- TopBar 01maestro button: pulsing dot indicator when active
- MaestroPanel: gradient header, agent slot cards with pink portrait borders

---

## 9. Drag and Drop System

DnD type: `'AGENT'`  
Item shape: `{ agent: Agent }`

**Drag sources:**
- `AgentBar` — full row is draggable (`useDrag`)

**Drop targets:**
- `ChatWindow` — drops agent into chat
- `MaestroPanel` drop zone — triggers `addToVST(agent)` (via `AgentBar.end` callback when `dropResult && maestroEnabled`)

---

## 10. Features Implemented ✅

- [x] Agent list with search, category filter, role sub-filter
- [x] Sort by last used (descending)
- [x] 16 seed agents + 6 music agents
- [x] Rarity system (6 tiers) with visual config
- [x] Trading card modal (flip, front/back, holographic effects)
- [x] Verified / Not-Verified badge on card front
- [x] Rarity info modal (protocolId, edition number)
- [x] Draggable floating chat window with DnD agent drop
- [x] Simulated agent responses (with ambassador vs standard branches)
- [x] 5 themes (core, midnight, holo, clean, solar)
- [x] Theme picker panel
- [x] Arcade panel with 3 games
- [x] Online/Offline toggle with banner
- [x] 6-screen onboarding flow with procedural avatar
- [x] Agent Creator Modal (Skyrim-style, 6 tabs, split panel, generation animation)
- [x] Procedural avatar generator (4 styles, 8 hues, seeded determinism)
- [x] Agent import flow (scan → convert existing AI agents)
- [x] 01maestro VST panel (transport, agent slots, DnD)
- [x] Music agents data (HARMONY, RHYTHM, MELODY, BASS, SYNTH, VOCAL)
- [x] `useMaestroVSTPlugin` hook scaffold
- [x] Maestro accent border overlay when enabled
- [x] User-created agent badge (CREATED)
- [x] Music agent badge (MAESTRO)
- [x] `memoryActivity` field on Agent type (data shape defined)
- [x] Social links dropdown in TopBar

---

## 11. Features NOT YET Implemented ❌ (Backlog)

### 11.1 Real-Time Memory Activity Color Changes (HIGH PRIORITY)
**Goal:** During memory read/write operations, agent names in the list should change color dynamically.
- `Agent.memoryActivity` type is already defined
- `simulateMemoryActivity()` in `MaestroVSTPlugin.tsx` generates mock read/write data
- **Need to implement:**
  - A polling/interval mechanism to update `memoryActivity` on agents in `AppContext`
  - `AgentBar` should read `agent.memoryActivity` and conditionally apply colors:
    - Reading: `readIntensity` → blue hue on name (e.g., `hsl(210, 80%, ${50 + readIntensity * 30}%)`)
    - Writing: `writeIntensity` → amber/green on name
    - Both: blend or alternate
  - Add `updateAgentMemoryActivity(agentId, activity)` action to `AppContext`
  - Trigger simulation loop in `MaestroPanel` when `isPlaying === true`

### 11.2 VST Data Visualization Components (HIGH PRIORITY)
**Goal:** Show real MIDI/audio data flowing in/out of the VST panel.
- `VSTPluginData` shape is defined (vstIn/vstOut with midiData[], audioData[], timestamp)
- **Need to implement:**
  - Piano roll visualization (MIDI notes as colored bars, horizontally scrolling)
  - Waveform/oscilloscope visualization for audioData (Canvas or SVG sine wave)
  - VU meter bars per loaded agent
  - MIDI note grid (per agent slot in MaestroPanel)
  - Suggested component: `MaestroVSTVisualization.tsx` in `/src/app/plugins/01maestro/`
  - Use `recharts` or raw Canvas for the waveform display

### 11.3 Theme Accent Wiring
The ThemePickerPanel shows accent color swatches but clicking them does NOT update the theme. Need to:
- Add `setAccentColor(color: string)` to `AppContext`
- Wire accent swatch clicks in `ThemePickerPanel`

### 11.4 Density Mode Wiring
Compact/Default/Relaxed in ThemePickerPanel are visual-only. Need:
- Add `densityMode: 'compact' | 'default' | 'relaxed'` to context
- Adjust `AgentBar` padding/height based on density

### 11.5 Card Frame Style Wiring
6 frame styles in ThemePickerPanel (Sharp, Rounded, Holo, Minimal, Metal, Glass) are visual-only.

### 11.6 Arcade Game Logic
- `ProtocolMatch.tsx`, `AgentChess.tsx`, `AgentChoice.tsx` need full game logic implementation
- Reward system (border skin, XP boost, custom game) is not implemented

### 11.7 Real Chat API Integration
Currently all chat responses are random strings from a hardcoded array. Need Supabase or external API integration for real LLM responses.

### 11.8 Persistence
All state is in-memory (React state). On page refresh, agents reset. Need:
- `localStorage` persistence for userAgents, themeId, onboarding completion
- OR Supabase backend for full persistence

### 11.9 Import Flow Authenticity
`AgentImportFlow` mocks a file scan. Real implementation would need:
- File system access (not possible in browser without File System Access API or desktop wrapper)
- Real `.01ai` / `.01bundle` file format parsing

### 11.10 Memory File Management UI
`Agent.memoryFilePath` and `defaultMemoryPath` fields exist but have no UI. Need:
- Memory file picker/display in agent details or card back
- File path display in AgentCardModal

### 11.11 Agent Verification System
`isVerified` field exists. Currently `isVerified: false` shows a red "Not Verified" badge on cards.  
Need: A verification flow / dialog explaining what verification means and how to get it.

---

## 12. Key Conventions & Patterns

### 12.1 Styling Pattern
All color values come from the theme object (`t = currentTheme`):
```tsx
const { currentTheme: t } = useApp();
// Usage:
style={{ background: t.surface1, border: `1px solid ${t.border}`, color: t.text }}
```
Never hardcode background/text colors — always use theme tokens.

### 12.2 Animation Pattern
```tsx
import { motion, AnimatePresence } from 'motion/react';
// Entry/exit:
<AnimatePresence>
  {isVisible && (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.3, ease: [0.34, 1.1, 0.64, 1] }}
    >
```

### 12.3 Modal Z-Index Stack
```
z-[200] — OnboardingFlow (top priority)
z-[100] — AgentCreatorModal, AgentImportFlow
z-[60]  — Maestro accent border overlay
z-50    — AgentCardModal, ThemePickerPanel, ArcadePanel, TopBar
z-40    — LeftRail, MaestroPanel, ChatWindow
z-30    — Offline banner
z-10    — AgentList header sticky
```

### 12.4 Component Naming
- Files: PascalCase.tsx
- Exports: named export (not default)
- Context hook: `useApp()` — throws if used outside `AppProvider`

### 12.5 Figma Asset Imports
```tsx
import logoImg from 'figma:asset/6e76ff0f78bfb8a16abd5cd9a03efe103b83cc74.png'; // TopBar logo
import logoMark from 'figma:asset/2806ffa57bf19ee58103436cb23492abbee29bfd.png'; // Badge logo mark
```
Always use `figma:asset/` scheme (no path prefix) for Figma-imported raster images.

### 12.6 Protected Files
Never modify:
- `/src/app/components/figma/ImageWithFallback.tsx`
- `/pnpm-lock.yaml`

---

## 13. Installed Packages (Key)

```json
"motion": "12.23.24",
"react-dnd": "16.0.1",
"react-dnd-html5-backend": "16.0.1",
"lucide-react": "0.487.0",
"recharts": "2.15.2",
"react-router": "7.13.0",
"sonner": "2.0.3",
"@radix-ui/*": "(full shadcn/ui set)",
"canvas-confetti": "1.9.4",
"react-hook-form": "7.55.0"
```

---

## 14. Critical Implementation Notes for Codex

1. **Never use `react-router-dom`** — use `react-router` only
2. **Animation imports:** `import { motion, AnimatePresence } from 'motion/react'` (not `framer-motion`)
3. **No new CSS files** — all styles via inline Tailwind or `style={{}}` with theme tokens
4. **Font changes** → only in `/src/styles/fonts.css`
5. **Do not create `tailwind.config.js`** — Tailwind v4 is config-file-free
6. **Canvas API only** — no Konva for avatar/visualization work
7. **Drag type string** — always `'AGENT'` (uppercase) for DnD consistency
8. **AppContext is the single source of truth** — no local agent state outside it
9. **`addAgent()` prepends** — new agents appear at the top of the list
10. **When implementing `memoryActivity` color changes** — update `AgentBar.tsx` name span's `style.color` dynamically; do NOT use Tailwind classes for this (dynamic HSL values)
11. **MaestroVSTPlugin hook** is a scaffold — `processData()` returns mock data; real audio engine would replace internals without changing the interface
12. **Music agents are NOT in the initial `agents` array** — they live in `musicAgents.ts` and are loaded via `addAgent()` when maestro is first enabled (see `MaestroPanel.tsx` `useEffect`)
13. **User-created agents from onboarding** always get `rarity: 'legend'` and role `'01 Protocol Agent Ambassador'`; agents from `AgentCreatorModal` get `rarity: 'common'` by default
14. **`isVerified: true`** is set on seed agents ARIA and NEXUS; user-created agents from `AgentCreatorModal` get `isVerified: true`; imported agents get `isVerified: false`
