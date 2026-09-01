// ═══════════════════════════════════════════════════════════
//  01deck Hub — Global Chat seed data
// ═══════════════════════════════════════════════════════════

export interface ChatUser {
  id: string;
  name: string;
  avatar: string;
  online: boolean;
}

export interface ChatMessage {
  id: string;
  channelId: string;
  author: ChatUser;
  content: string;
  timestamp: string;
}

export interface ChatChannel {
  id: string;
  name: string;
  description: string;
  color: string;
  unread?: number;
}

export const chatChannels: ChatChannel[] = [
  { id: 'general',  name: 'general',  description: 'General hub discussion',       color: '#ffffff', unread: 3 },
  { id: 'decks',    name: 'decks',    description: 'Deck building & strategy talk', color: '#a855f7' },
  { id: 'arena',    name: 'arena',    description: 'Arena results & match stories', color: '#f59e0b', unread: 1 },
  { id: 'trading',  name: 'trading',  description: 'Card & agent trading offers',   color: '#10b981' },
  { id: 'off-topic',name: 'off-topic',description: 'Anything goes',                 color: '#6b7280' },
];

export const CHAT_USERS: ChatUser[] = [
  { id: 'u1', name: 'NexusPilot', avatar: 'https://api.dicebear.com/9.x/pixel-art/svg?seed=nexuspilot', online: true  },
  { id: 'u2', name: 'VoidCaster', avatar: 'https://api.dicebear.com/9.x/pixel-art/svg?seed=voidcaster', online: true  },
  { id: 'u3', name: 'ArcHerald',  avatar: 'https://api.dicebear.com/9.x/pixel-art/svg?seed=archerald',  online: false },
  { id: 'u4', name: 'PulseRider', avatar: 'https://api.dicebear.com/9.x/pixel-art/svg?seed=pulserider', online: true  },
  { id: 'u5', name: 'ZenithCore', avatar: 'https://api.dicebear.com/9.x/pixel-art/svg?seed=zenithcore', online: true  },
  { id: 'u6', name: 'DriftStar',  avatar: 'https://api.dicebear.com/9.x/pixel-art/svg?seed=driftstar',  online: false },
];

export const ME: ChatUser = {
  id: 'me',
  name: 'You',
  avatar: 'https://api.dicebear.com/9.x/pixel-art/svg?seed=player',
  online: true,
};

export const seedChatMessages: ChatMessage[] = [
  // #general
  { id: 'cm1',  channelId: 'general',  author: CHAT_USERS[0], content: 'Good morning everyone 👋',                                                                  timestamp: '2026-08-24T07:00:00Z' },
  { id: 'cm2',  channelId: 'general',  author: CHAT_USERS[1], content: 'Morning! Anyone try the new Arcade update?',                                                timestamp: '2026-08-24T07:01:00Z' },
  { id: 'cm3',  channelId: 'general',  author: CHAT_USERS[4], content: 'Yeah the new Riddle Race maps are insane.',                                                  timestamp: '2026-08-24T07:03:00Z' },
  { id: 'cm4',  channelId: 'general',  author: CHAT_USERS[3], content: 'VoidPulse got a balance pass too. Feels much smoother.',                                     timestamp: '2026-08-24T07:05:00Z' },
  { id: 'cm5',  channelId: 'general',  author: CHAT_USERS[0], content: 'The leaderboard is going to get competitive fast today.',                                    timestamp: '2026-08-24T07:10:00Z' },
  { id: 'cm6',  channelId: 'general',  author: CHAT_USERS[2], content: 'I\'m sitting at rank 14 after the reset, let\'s gooo',                                       timestamp: '2026-08-24T07:15:00Z' },
  { id: 'cm7',  channelId: 'general',  author: CHAT_USERS[1], content: 'Nice! I\'m at 22 but climbing.',                                                             timestamp: '2026-08-24T07:17:00Z' },
  { id: 'cm8',  channelId: 'general',  author: CHAT_USERS[4], content: 'Anyone want to team queue later?',                                                           timestamp: '2026-08-24T07:20:00Z' },

  // #decks
  { id: 'cm9',  channelId: 'decks',    author: CHAT_USERS[4], content: 'Protocol chain is still the strongest archetype in the current meta.',                       timestamp: '2026-08-24T06:30:00Z' },
  { id: 'cm10', channelId: 'decks',    author: CHAT_USERS[0], content: 'Disagree, Void resonance is more consistent in best-of-three.',                              timestamp: '2026-08-24T06:35:00Z' },
  { id: 'cm11', channelId: 'decks',    author: CHAT_USERS[1], content: 'Both require too many mythics for most players. What\'s the best budget option?',            timestamp: '2026-08-24T06:40:00Z' },
  { id: 'cm12', channelId: 'decks',    author: CHAT_USERS[3], content: 'Pure Rare aggro still clears ladder below rank 50 easily.',                                  timestamp: '2026-08-24T06:45:00Z' },

  // #arena
  { id: 'cm13', channelId: 'arena',    author: CHAT_USERS[5], content: 'Just went 12-0 in agent chess, finally!',                                                    timestamp: '2026-08-24T07:30:00Z' },
  { id: 'cm14', channelId: 'arena',    author: CHAT_USERS[2], content: 'GG! What was your final board composition?',                                                 timestamp: '2026-08-24T07:32:00Z' },
  { id: 'cm15', channelId: 'arena',    author: CHAT_USERS[5], content: '3 Protocol, 2 Void, 1 wildcard. The synergy popped off in the last three rounds.',          timestamp: '2026-08-24T07:34:00Z' },

  // #trading
  { id: 'cm16', channelId: 'trading',  author: CHAT_USERS[3], content: 'WTT: 2x Rare Aegis for any Legendary. DM me.',                                               timestamp: '2026-08-24T05:00:00Z' },
  { id: 'cm17', channelId: 'trading',  author: CHAT_USERS[0], content: 'LF: Protocol Zero Mythic. Offering 5x Legendary bundle.',                                    timestamp: '2026-08-24T05:30:00Z' },
];
