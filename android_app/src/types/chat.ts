export interface BasicProfileView {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
}

export interface MessageView {
  id: string;
  rev: string;
  text: string;
  sender: MessageViewSender;
  sentAt: string;
}

export interface MessageViewSender {
  did: string;
}

export interface SystemMessageView {
  id: string;
  rev: string;
  sender: MessageViewSender;
  sentAt: string;
  message?: string;
}

export interface GroupInfo {
  convoId: string;
  name: string;
  description?: string;
  memberCount: number;
  members: BasicProfileView[];
  lastMessage?: MessageView | SystemMessageView | null;
  unreadCount: number;
  muted: boolean;
  createdAt: string;
}

export type JoinRule = 'owner_invite' | 'member_invite' | 'anyone';

export interface JoinLink {
  code: string;
  enabledStatus: 'enabled' | 'disabled';
  requireApproval: boolean;
  joinRule: JoinRule;
  createdAt: string;
}

export interface JoinRequestView {
  convoId: string;
  requestedBy: BasicProfileView;
  requestedAt: string;
}
