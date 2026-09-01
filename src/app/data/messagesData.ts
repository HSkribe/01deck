// ═══════════════════════════════════════════════════════════
//  01deck Hub — Direct Messages seed data
// ═══════════════════════════════════════════════════════════

export interface DMUser {
  id: string;
  name: string;
  avatar: string;
  online: boolean;
  level: number;
}

export interface DirectMessage {
  id: string;
  conversationId: string;
  senderId: string;  // 'me' or user id
  content: string;
  timestamp: string;
  read: boolean;
}

export interface Conversation {
  id: string;
  participant: DMUser;
  messages: DirectMessage[];
  unread: number;
}

export const DM_ME: DMUser = {
  id: 'me',
  name: 'You',
  avatar: 'https://api.dicebear.com/9.x/pixel-art/svg?seed=player',
  online: true,
  level: 12,
};

const DM_USERS: DMUser[] = [
  { id: 'u1', name: 'NexusPilot', avatar: 'https://api.dicebear.com/9.x/pixel-art/svg?seed=nexuspilot', online: true,  level: 42 },
  { id: 'u2', name: 'VoidCaster', avatar: 'https://api.dicebear.com/9.x/pixel-art/svg?seed=voidcaster', online: true,  level: 18 },
  { id: 'u3', name: 'ArcHerald',  avatar: 'https://api.dicebear.com/9.x/pixel-art/svg?seed=archerald',  online: false, level: 31 },
  { id: 'u4', name: 'PulseRider', avatar: 'https://api.dicebear.com/9.x/pixel-art/svg?seed=pulserider', online: true,  level: 7  },
  { id: 'u5', name: 'ZenithCore', avatar: 'https://api.dicebear.com/9.x/pixel-art/svg?seed=zenithcore', online: true,  level: 55 },
];

export const ALL_DM_USERS: DMUser[] = DM_USERS;

export const seedConversations: Conversation[] = [
  {
    id: 'conv-1',
    participant: DM_USERS[0],
    unread: 2,
    messages: [
      { id: 'dm1-1', conversationId: 'conv-1', senderId: 'u1', content: 'Hey! Saw your deck in the forum thread. Really impressive Protocol build.',                                      timestamp: '2026-08-24T07:00:00Z', read: true  },
      { id: 'dm1-2', conversationId: 'conv-1', senderId: 'me', content: 'Thanks! It took a lot of iteration to get the curve right.',                                                    timestamp: '2026-08-24T07:05:00Z', read: true  },
      { id: 'dm1-3', conversationId: 'conv-1', senderId: 'u1', content: 'What\'s your thought on replacing the Aegis pair with a second Void agent?',                                   timestamp: '2026-08-24T07:10:00Z', read: true  },
      { id: 'dm1-4', conversationId: 'conv-1', senderId: 'me', content: 'You\'d lose the shield synergy but gain more burst. Could work in best-of-one format.',                        timestamp: '2026-08-24T07:12:00Z', read: true  },
      { id: 'dm1-5', conversationId: 'conv-1', senderId: 'u1', content: 'Makes sense. Want to test it in a practice match later today?',                                                timestamp: '2026-08-24T08:20:00Z', read: false },
      { id: 'dm1-6', conversationId: 'conv-1', senderId: 'u1', content: 'I\'m free after 3pm.',                                                                                        timestamp: '2026-08-24T08:21:00Z', read: false },
    ],
  },
  {
    id: 'conv-2',
    participant: DM_USERS[4],
    unread: 0,
    messages: [
      { id: 'dm2-1', conversationId: 'conv-2', senderId: 'u5', content: 'Nice match in the arena earlier!',                                                                             timestamp: '2026-08-23T20:00:00Z', read: true  },
      { id: 'dm2-2', conversationId: 'conv-2', senderId: 'me', content: 'Thanks, you too! That comeback in round 5 was wild.',                                                          timestamp: '2026-08-23T20:05:00Z', read: true  },
      { id: 'dm2-3', conversationId: 'conv-2', senderId: 'u5', content: 'Haha yeah I didn\'t expect the chain trigger to reach back that far.',                                         timestamp: '2026-08-23T20:07:00Z', read: true  },
    ],
  },
  {
    id: 'conv-3',
    participant: DM_USERS[1],
    unread: 1,
    messages: [
      { id: 'dm3-1', conversationId: 'conv-3', senderId: 'u2', content: 'Do you have a spare Rare Void agent? I\'m one short for my deck.',                                             timestamp: '2026-08-24T06:00:00Z', read: true  },
      { id: 'dm3-2', conversationId: 'conv-3', senderId: 'me', content: 'I have a duplicate Void Sentinel. What would you offer?',                                                      timestamp: '2026-08-24T06:15:00Z', read: true  },
      { id: 'dm3-3', conversationId: 'conv-3', senderId: 'u2', content: '2 Epic shards + a Rare of your choice from my collection?',                                                    timestamp: '2026-08-24T07:55:00Z', read: false },
    ],
  },
  {
    id: 'conv-4',
    participant: DM_USERS[2],
    unread: 0,
    messages: [
      { id: 'dm4-1', conversationId: 'conv-4', senderId: 'me', content: 'Hey, did you see the forum bug report about leaderboards?',                                                    timestamp: '2026-08-23T22:35:00Z', read: true  },
      { id: 'dm4-2', conversationId: 'conv-4', senderId: 'u3', content: 'Yeah I replied on the thread. Devs are probably already on it.',                                               timestamp: '2026-08-23T22:40:00Z', read: true  },
    ],
  },
];
