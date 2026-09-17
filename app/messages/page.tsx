'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MessageCircle } from 'lucide-react';
import { createClient } from '../../lib/supabase';
import { Avatar } from '../../components/avatar';

export default function Messages() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.assign('/auth/login?next=/messages');
        return;
      }

      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order('updated_at', { ascending: false });

      if (error) console.error(error);
      if (!mounted) return;

      const conversations = data || [];
      const enriched = await Promise.all(conversations.map(async (conversation) => {
        const otherId = conversation.buyer_id === user.id ? conversation.seller_id : conversation.buyer_id;
        const [{ data: listing }, { data: profile }, { data: lastMessage }] = await Promise.all([
          supabase.from('listings').select('title').eq('id', conversation.listing_id).maybeSingle(),
          supabase.from('profiles').select('full_name,avatar_url').eq('id', otherId).maybeSingle(),
          supabase.from('messages').select('body,attachment_name,created_at,sender_id,read_at').eq('conversation_id', conversation.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        ]);
        return { ...conversation, listing, profile, lastMessage };
      }));

      setItems(enriched);
      setLoading(false);
    })();

    return () => { mounted = false; };
  }, []);

  return (
    <main className="section">
      <div className="container messagesPage">
        <div className="eyebrow">Inbox</div>
        <h1>Messages</h1>
        {loading ? <div className="panel empty">Loading conversations...</div> : !items.length ? (
          <div className="empty">
            <MessageCircle size={30} />
            <p>No conversations yet.</p>
            <Link className="btn green" href="/marketplace">Find something to chat about</Link>
          </div>
        ) : (
          <div className="inboxList">
            {items.map((c) => {
              const name = c.profile?.full_name || 'Student';
              const preview = c.lastMessage?.body || (c.lastMessage?.attachment_name ? 'Photo' : 'Start a conversation');
              return (
                <Link className="inboxItem" href={`/messages/${c.id}`} key={c.id}>
                  <Avatar url={c.profile?.avatar_url} name={name} size="md" />
                  <div className="inboxCopy">
                    <div className="inboxTop"><b>{name}</b><span className="muted">{c.lastMessage?.created_at ? new Date(c.lastMessage.created_at).toLocaleDateString() : ''}</span></div>
                    <div className="muted inboxPreview">{preview}</div>
                    <div className="inboxListing">{c.listing?.title || 'CampusDrop conversation'}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
