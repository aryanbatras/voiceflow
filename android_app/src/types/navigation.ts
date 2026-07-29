export type RootTabParamList = {
  Feed: undefined;
  Reels: undefined;
  Compose: undefined;
  Search: undefined;
  Profile: { handle?: string };
};

export type RootStackParamList = {
  MainTabs: undefined;
  PostDetail: { uri: string };
  Login: undefined;
  Settings: undefined;
  Notifications: undefined;
  Bookmarks: undefined;
  Groups: undefined;
  GroupChat: { convoId: string };
  Discover: undefined;
  Immersive: { uri?: string; label?: string };
  Lists: undefined;
  Messages: undefined;
  Signup: undefined;
  Spells: undefined;
  Followers: { handle: string };
  Following: { handle: string };
};
