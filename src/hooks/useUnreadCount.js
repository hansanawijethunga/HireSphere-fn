import { useEffect, useState } from 'react';
import messagingClient from '../api/messagingClient';

export function useUnreadCount(userId) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!userId) return;

    async function refresh() {
      try {
        const res = await messagingClient.get('/api/messages/inbox');
        const data = Array.isArray(res.data) ? res.data : [];
        const unread = data.filter((m) => !m.readAt && m.senderId !== userId).length;
        setCount(unread);
      } catch {}
    }

    refresh();
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
  }, [userId]);

  return count;
}
