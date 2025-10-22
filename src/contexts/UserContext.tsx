import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import testUsers from '@/data/testUsers.json';

export interface User {
  id: string;
  name: string;
  handle: string;
  avatarSeed: string;
  balance: {
    available: number;
    pending: number;
    onHold: number;
    total: number;
  };
  linkedCards: Array<{ type: string; last4: string; brand: string }>;
  linkedBanks: Array<{ type: string; last4: string; name: string }>;
}

interface UserContextType {
  currentUser: User;
  switchUser: (userId: string) => void;
  allUsers: User[];
  isLoading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User>(testUsers[0] as User);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const userHandle = params.get('user');
    if (userHandle) {
      const user = testUsers.find(u => u.handle === userHandle);
      if (user) {
        setCurrentUser(user as User);
      }
    }
  }, []);

  const switchUser = async (userId: string) => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 400));
    
    const user = testUsers.find(u => u.id === userId);
    if (user) {
      setCurrentUser(user as User);
      const url = new URL(window.location.href);
      url.searchParams.set('user', user.handle);
      window.history.pushState({}, '', url);
    }
    
    setIsLoading(false);
  };

  return (
    <UserContext.Provider value={{ 
      currentUser, 
      switchUser, 
      allUsers: testUsers as User[], 
      isLoading 
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
};
