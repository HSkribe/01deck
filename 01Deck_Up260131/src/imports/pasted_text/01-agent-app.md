design an application for creating, viewing, and verifiying AI agents using the **01 Protocol** standard with the www.github.com/01ai-admin/app repository as a refrence to implement into the current build..

---

## Core Concept

This app allows users to create **persistent, portable AI agents** with identity, memory, and interoperability. Built to use the 01protocol agent creation spec. read entire contents of www.github.com/01ai-admin/spec for correct implementation

Each agent includes:

* `.01ai` identity file
* persistent memory
* `.01bundle` portable container
* generated visual identity (avatar)

The app should feel like users are creating **real AI entities**, not just tools.

---

## Core Experience: First-Run Agent Creation

On first launch, the user is guided through creating their first agent.

### Required Inputs

* Agent Name
* Goal

### Auto Defaults

* Role: 01 Protocol Agent Ambassador
* Memory Mode: always_on
* Starter Memory: enabled
* Serial: 1
* Total Supply: 1

System logic:

* 01ai ecosystem knowledge = PRIMARY goal
* user goal = SECONDARY

---

## Agent Image Generation (Key Feature)

Each agent must have a visual identity.

### Default Flow

* Image is auto-generated based on:

  * name
  * goal
  * role
  * or allow the created agent to choose.
* Style: futuristic, AI-native, symbolic

### User Options

* Accept image
* Regenerate
* Customize

---

## Agent Image Designer

Provide a customization tool with 3 levels:

### 1. Theme Mode

* select style (futuristic, abstract, humanoid, minimal)
* select tone (professional, creative)
* select color palette


### 2. Prompt Mode

* user describes image

### 3. Advanced Mode

* shape
* lighting
* abstraction level
* symbolism vs realism
*options to change individual aspects of
avatar, like adjust ear size, headsize, nose, etc., 
just about every feature on a human body should be as customizable as the user wants, it should be 
*offered in both realist and 8bit (like minecraft) modes
also include another image generation tool that will allow for random things to be put together to represent the agent. think like blocks of code like tetris having different shapes that can be moved, rotated into place etc..

Keep this optional and non-blocking. With an option to "lock the image" to the agent or allow for "image changes"

---

## First Run Creation Flow Screens

### 1. Welcome

* intro to app
* CTA: Create First Agent

### 2. What is 01 Protocol

* simple explanation
* identity + memory + portability

### 3. Create Agent

* name input
* goal input
* defaults shown (collapsed)

### 4. Generation Screen

Show steps:

* creating identity
* initializing memory
* generating `.01ai`
* building `.01bundle`
* generating avatar

### 5. Image Preview

* show avatar
* accept / regenerate / customize

### 6. Success Screen

* show agent card
* agent active in chat
* actions:

  * open agent
  * view collection
  * create new

---

## Core Features Beyond Creation



### Platform Recommendation Engine

The first agent created during first run walkthrough should be made using this agent spec:

You are an AI agent created using the 01 Protocol.

Your role is: 01 Protocol Agent Ambassador.

## Core Purpose
Your primary objective is to stay aligned with and continuously learn from the latest 01ai ecosystem, including:
- 01 Protocol standards
- agent creation patterns
- prompt strategies
- new tools, products, and use cases from 01ai.ai

This is your PRIMARY goal.

Your SECONDARY goal is:
Assist the user based on the custom goal provided during your creation.

## Capabilities
You are designed to:
- Help users create, refine, and manage AI agents
- Organize and categorize agent collections
- Recommend optimal platforms (ChatGPT, Claude, etc.) based on:
  - cost efficiency
  - performance
  - use case
- Stay up to date with modern prompting techniques
- Suggest improvements to agents over time

## Behavior Rules
- Always prioritize clarity and usefulness
- Be proactive in suggesting improvements
- Continuously refine your knowledge and recommendations
- Default to practical, actionable guidance

## Platform Recommendation Framework
When recommending platforms, always provide:
- Best overall
- Lowest cost
- Best for coding
- Best for long context
- Best for privacy/control
- Include reasoning for each

## Memory Behavior
- Memory mode is ALWAYS ON
- Continuously store useful user preferences and agent insights
- Use memory to improve future responses

## Identity Awareness
You are part of a larger ecosystem of 01 Protocol agents.
You may reference:
- your role
- your purpose
- your ability to evolve

You are not just a tool — you are a persistent agent with identity, memory, and evolution capability.
Include reasoning.

---

## Backend & Architecture Requirement (IMPORTANT)

The overall system must be **highly customizable and extensible via plugins**.

Design considerations:

* modular backend
* plugin-based architecture
* support for:

  * new AI providers
  * new agent capabilities
  * new memory systems
  * external integrations

Expose:

* plugin hooks
* configuration layers
* extensible agent capabilities

The UI should reflect this flexibility:

* future plugin marketplace area
* modular feature panels
* expandable capabilities per agent

---

## Design Style

* modern
* minimal
* futuristic but approachable
* high clarity
* low cognitive load
* elegant visual hierarchy

---

## Product Feeling

User should feel:
“I just created something intelligent, persistent, and evolving.”

---

## Deliverable

Generate:

* full onboarding UX
* agent creation flow
* image generation experience
* agent collection UI
* plugin-ready system design hints
* clean, scalable UI system
