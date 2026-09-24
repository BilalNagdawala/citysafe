import { useState, useEffect } from 'react';

export interface TrustedContact {
  id: string;
  name: string;
  phone: string;
}

export function useTrustedContacts() {
  const [contacts, setContacts] = useState<TrustedContact[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('trusted_contacts');
      if (stored) {
        setContacts(JSON.parse(stored));
      }
    } catch (e) {
      console.warn("Failed to load trusted contacts", e);
    }
    setIsLoaded(true);
  }, []);

  const addContact = (name: string, phone: string) => {
    const newContact = { id: Date.now().toString(), name, phone };
    const updated = [...contacts, newContact];
    setContacts(updated);
    localStorage.setItem('trusted_contacts', JSON.stringify(updated));
  };

  const removeContact = (id: string) => {
    const updated = contacts.filter(c => c.id !== id);
    setContacts(updated);
    localStorage.setItem('trusted_contacts', JSON.stringify(updated));
  };

  return { contacts, isLoaded, addContact, removeContact };
}
