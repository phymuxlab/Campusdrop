'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MessageCircle } from 'lucide-react';
import { createClient } from '../../lib/supabase';
import { Avatar } from '../../components/avatar';
import { VerifiedName } from '../../components/verified-name';

export default function Messages() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [pageError, setPageError] = useState('');

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;
    let channel: any;
    let loadingRequest = false;

    const load = async (user: any) => {
      if (!mounted || loadingRequest) return;
      loadingRequest = true;

      try {
        const { data, error } = await supabase
          .from('conversations')
          .select('*')
          .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
          .order('updated_at', { ascending: false });

        if (error) {
          console.error('CampusDrop messages: conversations query failed', error);
          if (mounted) {
            setPageError('We could not load your conversations right now. Please try again.');
            setLoading(false);
          }
          return;
        }

        const conversations = data || [];
        const enriched: any[] = [];

        // Hydrate conversations independently. One malformed/missing listing,
        // profile or message must never take down the whole Messages page.
        for (const conversation of conversations) {
          if (!conversation?.id) continue;

          const otherId = conversation.buyer_id === user.id
            ? conversation.seller_id
            : conversation.buyer_id;

          try {
            const [listingResult, profileResult, lastMessageResult] = await Promise.all([
              conversation.listing_id
                ? supabase
                    .from('listings')
                    .select('title')
                    .eq('id', conversation.listing_id)
                    .maybeSingle()
                : Promise.resolve({ data: null, error: null } as any),
              otherId
                ? supabase
                    .from('profiles')
                    .select('id,full_name,avatar_url')
                    .eq('id', otherId)
                    .maybeSingle()
                : Promise.resolve({ data: null, error: null } as any),
              supabase
                .from('messages')
                .select('body,attachment_name,created_at,sender_id,read_at')
                .eq('conversation_id', conversation.id)
                .order('created_at', { ascending: false })
                .limit(1),
            ]);

            if (listingResult.error) {
              console.warn('CampusDrop messages: listing lookup failed', conversation.id, listingResult.error.message);
            }
            if (profileResult.error) {
              console.warn('CampusDrop messages: profile lookup failed', conversation.id, profileResult.error.message);
            }
            if (lastMessageResult.error) {
              console.warn('CampusDrop messages: latest message lookup failed', conversation.id, lastMessageResult.error.message);
            }

            enriched.push({
              ...conversation,
              listing: listingResult.data || null,
              profile: profileResult.data || null,
              lastMessage: Array.isArray(lastMessageResult.data)
                ? lastMessageResult.data[0] || null
                : lastMessageResult.data || null,
            });
          } catch (conversationError) {
            // Keep the conversation visible even if one enrichment request fails.
            console.warn('CampusDrop messages: conversation enrichment failed', conversation.id, conversationError);
            enriched.push({
              ...conversation,
              listing: null,
              profile: null,
              lastMessage: null,
            });
          }
        }

        if (mounted) {
          setItems(enriched);
          setPageError('');
          setLoading(false);
        }
      } catch (loadError) {
        console.error('CampusDrop messages: unexpected load failure', loadError);
        if (mounted) {
          setPageError('We could not load your messages right now. Please try again.');
          setLoading(false);
        }
      } finally {
        loadingRequest = false;
      }
    };

    (async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) console.warn('CampusDrop messages: auth lookup failed', authError.message);
        if (!user) {
          window.location.assign('/auth/login?next=/messages');
          return;
        }
        if (!mounted) return;

        setCurrentUser(user);
        await load(user);

        channel = supabase
          .channel(`messages-list-${user.id}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => { void load(user); })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => { void load(user); })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => { void load(user); })
          .subscribe((status) => {
            if (status === 'CHANNEL_ERROR') {
              console.warn('CampusDrop messages: realtime channel error');
            }
          });
      } catch (error) {
        console.error('CampusDrop messages: page initialisation failed', error);
        if (mounted) {
          setPageError('We could not open Messages right now. Please try again.');
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  return (
    <main className="section">
      <div className="container messagesPage">
        <div className="eyebrow">Inbox</div>
        <h1>Messages</h1>

        {pageError && (
          <div className="notice" style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 10 }}>{pageError}</div>
            <button className="btn green" onClick={() => window.location.reload()}>Try again</button>
          </div>
        )}

        {loading ? (
          <div className="panel empty">
            <span className="skeleton skeletonLine" />
            <span className="skeleton skeletonLine medium" />
          </div>
        ) : !items.length ? (
          <div className="empty">
            <MessageCircle size={30} />
            <p>No conversations yet.</p>
            <Link className="btn green" href="/marketplace">Find something to chat about</Link>
          </div>
        ) : (
          <div className="inboxList">
            {items.map((c) => {
              const name = c.profile?.full_name || 'CampusDrop student';
              const preview = c.lastMessage?.body || (c.lastMessage?.attachment_name ? 'Photo' : 'Start a conversation');
              const otherId = c.buyer_id === currentUser?.id ? c.seller_id : c.buyer_id;

              return (
                <Link className="inboxItem" href={`/messages/${c.id}`} key={c.id}>
                  <Avatar url={c.profile?.avatar_url} name={name} size="md" />
                  <div className="inboxCopy">
                    <div className="inboxTop">
                      <VerifiedName userId={otherId} name={name} />
                      <span className="muted">
                        {c.lastMessage?.created_at ? new Date(c.lastMessage.created_at).toLocaleDateString() : ''}
                      </span>
                    </div>
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
