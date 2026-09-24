'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type Role = 'unassigned' | 'user' | 'guardian';

interface RoleContextType {
  role: Role;
  setRole: (role: Role) => void;
  signOut: () => void;
  isLoading: boolean;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<Role>('unassigned');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Read from localStorage on mount
    const savedRole = localStorage.getItem('citysafe-role') as Role;
    if (savedRole && ['unassigned', 'user', 'guardian'].includes(savedRole)) {
      setRoleState(savedRole);
    }
    setIsLoading(false);
  }, []);

  const setRole = (newRole: Role) => {
    setRoleState(newRole);
    localStorage.setItem('citysafe-role', newRole);
    // Also set a cookie so the middleware can read it
    document.cookie = `citysafe-role=${newRole}; path=/; max-age=31536000`;
  };

  const signOut = () => {
    setRoleState('unassigned');
    localStorage.removeItem('citysafe-role');
    document.cookie = 'citysafe-role=; path=/; max-age=0'; // Expire cookie
  };

  return (
    <RoleContext.Provider value={{ role, setRole, signOut, isLoading }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
}
