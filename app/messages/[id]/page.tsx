'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Check, CheckCheck, ImagePlus, Info, MoreVertical, Paperclip, Pencil, Send, Trash2, X } from 'lucide-react';
import { createClient } from '../../../lib/supabase';
import { Avatar } from '../../../components/avatar';
import { PageSkeleton } from '../../../components/skeleton';

const EDIT_WINDOW_MS = 10 * 60 * 1000;
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatFullTime(value: string) {
  return new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

function isImage(name?: string | null) {
  return !!name && /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(name);
}

export default function Chat() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [msgs, setMsgs] = useState<any[]>([]);
  const [body, setBody] = useState('');
  const [user, setUser] = useState<any>(null);
  const [other, setOther] = useState<any>(null);
  const [title, setTitle] = useState('Conversation');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [menuId, setMenuId] = useState<string | null>(null);
  const [infoId, setInfoId] = useState<string | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async (supabase: ReturnType<typeof createClient>) => {
    const { data, error: messageError } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true });
    if (messageError) throw messageError;
    const hydrated = await Promise.all((data || []).map(async (message: any) => {
      if (!message.attachment_path) return message;
      const { data: signed } = await supabase.storage.from('message-attachments').createSignedUrl(message.attachment_path, 60 * 60);
      return { ...message, attachment_url: signed?.signedUrl || '' };
    }));
    setMsgs(hydrated);

    const { error: deliveredError } = await supabase.rpc('mark_messages_delivered', { p_conversation_id: id });
    if (deliveredError) console.warn('Delivery update:', deliveredError.message);
    const { error: seenError } = await supabase.rpc('mark_messages_seen', { p_conversation_id: id });
    if (seenError) console.warn('Seen update:', seenError.message);
  }, [id]);

  useEffect(() => {
    let mounted = true;
    let channel: any;
    const supabase = createClient();

    (async () => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (!currentUser) {
          window.location.assign(`/auth/login?next=/messages/${id}`);
          return;
        }
        if (!mounted) return;
        setUser(currentUser);

        const { data: conversation, error: conversationError } = await supabase
          .from('conversations')
          .select('*')
          .eq('id', id)
          .single();
        if (conversationError) throw conversationError;

        const otherId = conversation.buyer_id === currentUser.id ? conversation.seller_id : conversation.buyer_id;
        const [{ data: listing }, { data: profile }] = await Promise.all([
          supabase.from('listings').select('title').eq('id', conversation.listing_id).maybeSingle(),
          supabase.from('profiles').select('full_name,avatar_url').eq('id', otherId).maybeSingle(),
        ]);
        setTitle(listing?.title || 'CampusDrop conversation');
        setOther(profile || null);

        await load(supabase);
        setLoading(false);

        channel = supabase
          .channel(`chat-${id}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `conversation_id=eq.${id}` }, async (payload) => {
            if (payload.eventType === 'INSERT') {
              const incoming = payload.new as any;
              if (incoming.attachment_path) { const { data: signed } = await supabase.storage.from('message-attachments').createSignedUrl(incoming.attachment_path, 60 * 60); incoming.attachment_url = signed?.signedUrl || ''; }
              setMsgs((current) => current.some((m) => m.id === incoming.id) ? current : [...current, incoming]);
              if (payload.new.sender_id !== currentUser.id) {
                await supabase.rpc('mark_messages_delivered', { p_conversation_id: id });
                await supabase.rpc('mark_messages_seen', { p_conversation_id: id });
              }
            } else if (payload.eventType === 'UPDATE') {
              setMsgs((current) => current.map((m) => m.id === payload.new.id ? payload.new : m));
            } else if (payload.eventType === 'DELETE') {
              setMsgs((current) => current.filter((m) => m.id !== payload.old.id));
            }
          })
          .subscribe();
      } catch (err: any) {
        if (mounted) {
          setError(err?.message || 'Could not load this conversation.');
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, [id, load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs.length]);

  function chooseAttachment(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Only image files can be sent here.'); return; }
    if (file.size > MAX_IMAGE_SIZE) { setError('Image must be 10MB or smaller.'); return; }
    setError('');
    setAttachment(file);
    setAttachmentPreview(URL.createObjectURL(file));
  }

  function clearAttachment() {
    if (attachmentPreview) URL.revokeObjectURL(attachmentPreview);
    setAttachment(null);
    setAttachmentPreview('');
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (sending || !user || (!body.trim() && !attachment)) return;
    setSending(true); setError('');
    const supabase = createClient();
    try {
      let attachmentPath: string | null = null;
      let attachmentName: string | null = null;
      if (attachment) {
        const ext = (attachment.name.split('.').pop() || 'jpg').toLowerCase();
        attachmentPath = `${user.id}/${id}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('message-attachments').upload(attachmentPath, attachment, { contentType: attachment.type, upsert: false });
        if (uploadError) throw uploadError;
        attachmentName = attachment.name.slice(0, 180);
      }

      const { data: inserted, error: insertError } = await supabase.from('messages').insert({
        conversation_id: id,
        sender_id: user.id,
        body: body.trim().slice(0, 2000),
        attachment_path: attachmentPath,
        attachment_name: attachmentName,
      }).select().single();
      if (insertError) throw insertError;
      setMsgs((current) => current.some((m) => m.id === inserted.id) ? current : [...current, inserted]);
      setBody('');
      clearAttachment();
    } catch (err: any) {
      setError(err?.message || 'Message could not be sent.');
    } finally {
      setSending(false);
    }
  }

  async function getAttachmentUrl(path: string) {
    const { data, error: urlError } = await createClient().storage.from('message-attachments').createSignedUrl(path, 60 * 60);
    if (urlError) return '';
    return data.signedUrl;
  }

  async function startEdit(message: any) {
    setMenuId(null);
    if (message.deleted_at || message.sender_id !== user?.id) return;
    if (Date.now() - new Date(message.created_at).getTime() > EDIT_WINDOW_MS) return;
    setEditingId(message.id);
    setEditBody(message.body || '');
  }

  async function saveEdit(message: any) {
    const next = editBody.trim().slice(0, 2000);
    if (!next) return;
    const { error: updateError } = await createClient().rpc('edit_message', { p_message_id: message.id, p_body: next });
    if (updateError) setError(updateError.message); else setEditingId(null);
  }

  async function deleteMessage(message: any) {
    setMenuId(null);
    if (message.sender_id !== user?.id) return;
    if (!window.confirm('Delete this message for everyone?')) return;
    const { error: deleteError } = await createClient().rpc('delete_message', { p_message_id: message.id });
    if (deleteError) setError(deleteError.message);
  }

  function startHold(messageId: string) {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = setTimeout(() => setMenuId(messageId), 550);
  }

  function endHold() {
    if (holdTimer.current) { clearTimeout(holdTimer.current); holdTimer.current = null; }
  }

  async function showInfo(message: any) {
    setMenuId(null);
    setInfoId(message.id);
    if (message.attachment_path && !message.attachment_url) {
      const url = await getAttachmentUrl(message.attachment_path);
      if (url) setMsgs((current) => current.map((m) => m.id === message.id ? { ...m, attachment_url: url } : m));
    }
  }

  return (
    <main className="chatPage">
      <div className="chatContainer">
        <div className="chatTopBar">
          <Link href="/messages" className="chatBack" aria-label="Back to messages"><ArrowLeft size={20} /></Link>
          <Avatar url={other?.avatar_url} name={other?.full_name || 'Student'} size="sm" />
          <div className="chatPerson"><b>{other?.full_name || 'Student'}</b><span>{title}</span></div>
        </div>

        {error && <div className="chatError">{error}<button onClick={() => setError('')} aria-label="Dismiss error"><X size={16} /></button></div>}

        <div className="chatBody whatsappBody">
          {loading ? <div className="chatLoading"><PageSkeleton rows={5}/></div> : !msgs.length ? <div className="chatEmpty"><MessageCirclePlaceholder /><b>Start the conversation</b><span>Ask about the item, price or availability.</span></div> : msgs.map((message) => {
            const mine = message.sender_id === user?.id;
            const deleted = !!message.deleted_at;
            const canEdit = mine && !deleted && Date.now() - new Date(message.created_at).getTime() <= EDIT_WINDOW_MS && !!message.body;
            const status = mine ? (message.read_at ? 'seen' : message.delivered_at ? 'delivered' : 'sent') : '';
            const attachmentUrl = message.attachment_url;
            return (
              <div key={message.id} className={`messageRow ${mine ? 'mineRow' : 'theirRow'}`}>
                <div className={`messageBubble ${mine ? 'mineBubble' : 'theirBubble'} ${deleted ? 'deletedBubble' : ''}`} onPointerDown={(e) => { if (e.pointerType === 'touch' || e.pointerType === 'pen') startHold(message.id); }} onPointerUp={endHold} onPointerCancel={endHold} onPointerLeave={endHold} onContextMenu={(e) => { e.preventDefault(); setMenuId(message.id); }}>
                  {deleted ? <span className="deletedText">This message was deleted</span> : <>
                    {message.attachment_path && <>
                      {attachmentUrl ? <img className="chatImage" src={attachmentUrl} alt={message.attachment_name || 'Sent image'} /> : <button className="attachmentLoad" onClick={() => showInfo(message)}><ImagePlus size={18}/> View image</button>}
                    </>}
                    {message.body && <div className="messageText">{message.body}</div>}
                    <div className="messageMeta"><span>{formatTime(message.created_at)}{message.edited_at && ' · edited'}</span>{mine && <span className={`messageTicks ${status}`} title={status}><CheckCheck size={15}/></span>}</div>
                  </>}
                </div>

                {menuId === message.id && !deleted && <div className={`messageMenu ${mine ? 'menuMine' : 'menuTheir'}`}>
                  {mine && canEdit && <button onClick={() => startEdit(message)}><Pencil size={15}/> Edit</button>}
                  {mine && <button onClick={() => deleteMessage(message)}><Trash2 size={15}/> Delete</button>}
                  {mine && <button onClick={() => showInfo(message)}><Info size={15}/> Info</button>}
                  <button onClick={() => setMenuId(null)}><X size={15}/> Close</button>
                </div>}

                {editingId === message.id && <div className="editBox"><textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} maxLength={2000} /><div><button className="btn light" onClick={() => setEditingId(null)}>Cancel</button><button className="btn green" onClick={() => saveEdit(message)}>Save</button></div></div>}

                {infoId === message.id && mine && <div className="messageInfoModalBackdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setInfoId(null); }}>
                  <div className="messageInfoModal" role="dialog" aria-modal="true" aria-labelledby={`message-info-${message.id}`}>
                    <div className="messageInfoModalHead"><h3 id={`message-info-${message.id}`}>Message info</h3><button className="messageInfoClose" onClick={() => setInfoId(null)} aria-label="Close message info"><X size={18}/></button></div>
                    <div className="messageInfoRows"><div><span>Sent</span><span>{formatFullTime(message.created_at)}</span></div><div><span>Delivered</span><span>{message.delivered_at ? formatFullTime(message.delivered_at) : 'Not delivered yet'}</span></div><div><span>Seen</span><span>{message.read_at ? formatFullTime(message.read_at) : 'Not seen yet'}</span></div></div>
                  </div>
                </div>}
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {attachmentPreview && <div className="attachmentPreview"><img src={attachmentPreview} alt="Selected attachment preview"/><button onClick={clearAttachment} aria-label="Remove attachment"><X size={17}/></button></div>}
        <form className="whatsappComposer" onSubmit={send}>
          <label className="attachButton" aria-label="Send image"><Paperclip size={20}/><input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/heic" onChange={(e) => chooseAttachment(e.target.files?.[0] || null)} hidden /></label>
          <input value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000} placeholder="Message" aria-label="Message" />
          <button className="sendCircle" disabled={sending || (!body.trim() && !attachment)} aria-label="Send message">{sending ? <span className="sendSpinner"/> : <Send size={19}/>}</button>
        </form>
      </div>
    </main>
  );
}

function MessageCirclePlaceholder() {
  return <div className="chatEmptyIcon"><Send size={22}/></div>;
}
