import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, Search, PlusSquare, User, Compass } from 'lucide-react-native';

import FeedScreen from '@/screens/FeedScreen';
import ReelsScreen from '@/screens/ReelsScreen';
import SearchScreen from '@/screens/SearchScreen';
import ProfileScreen from '@/screens/ProfileScreen';
import ComposeScreen from '@/screens/ComposeScreen';
import NotificationsScreen from '@/screens/NotificationsScreen';
import BookmarksScreen from '@/screens/BookmarksScreen';
import SettingsScreen from '@/screens/SettingsScreen';
import GroupsScreen from '@/screens/GroupsScreen';
import ImmersiveScreen from '@/screens/ImmersiveScreen';
import PostDetailScreen from '@/screens/PostDetailScreen';
import LoginScreen from '@/screens/LoginScreen';
import DiscoverScreen from '@/screens/DiscoverScreen';
import ListsScreen from '@/screens/ListsScreen';
import MessagesScreen from '@/screens/MessagesScreen';
import SignupScreen from '@/screens/SignupScreen';
import SpellsScreen from '@/screens/SpellsScreen';
import GroupChatScreen from '@/screens/GroupChatScreen';
import FollowersScreen from '@/screens/FollowersScreen';
import FollowingScreen from '@/screens/FollowingScreen';

import type { RootTabParamList, RootStackParamList } from '@/types/navigation';

const Tab = createBottomTabNavigator<RootTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#f06',
        tabBarInactiveTintColor: '#8e8e8e',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#f0f0f0',
          borderTopWidth: 0.5,
          paddingBottom: 4,
          paddingTop: 4,
          height: 54,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="Feed"
        component={FeedScreen}
        options={{
          tabBarLabel: 'Feed',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{
          tabBarLabel: 'Search',
          tabBarIcon: ({ color, size }) => <Search size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Compose"
        component={ComposeScreen}
        options={{
          tabBarLabel: 'Post',
          tabBarIcon: ({ color, size }) => <PlusSquare size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Reels"
        component={ReelsScreen}
        options={{
          tabBarLabel: 'Reels',
          tabBarIcon: ({ color, size }) => <Compass size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="MainTabs" component={TabNavigator} />
      <Stack.Screen name="PostDetail" component={PostDetailScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Bookmarks" component={BookmarksScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Groups" component={GroupsScreen} />
      <Stack.Screen name="Immersive" component={ImmersiveScreen} />
      <Stack.Screen name="Discover" component={DiscoverScreen} />
      <Stack.Screen name="Lists" component={ListsScreen} />
      <Stack.Screen name="Messages" component={MessagesScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen name="Spells" component={SpellsScreen} />
      <Stack.Screen name="GroupChat" component={GroupChatScreen} />
      <Stack.Screen name="Followers" component={FollowersScreen} />
      <Stack.Screen name="Following" component={FollowingScreen} />
    </Stack.Navigator>
  );
}
