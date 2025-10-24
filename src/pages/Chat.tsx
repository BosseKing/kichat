import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { databases, DATABASE_ID, CHATS_COLLECTION_ID, MESSAGES_COLLECTION_ID, ID } from '@/lib/appwrite';
import { sendMessage as sendAIMessage, sendMessageStream } from '@/lib/openrouter';
import { ChatSidebar } from '@/components/ChatSidebar';
import { ChatMessage } from '@/components/ChatMessage';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2, MessageSquare, LogIn } from 'lucide-react';
import { toast } from 'sonner';
import { Query } from 'appwrite';
import { useNavigate } from 'react-router-dom';
import { ThemeSelector } from '@/components/ThemeSelector';

interface Message {
  $id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface Chat {
  $id: string;
  title: string;
  $createdAt: string;
}

export default function Chat() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [guestMessages, setGuestMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      loadChats();
    }
  }, [user]);

  useEffect(() => {
    if (currentChatId && user) {
      loadMessages(currentChatId);
    }
  }, [currentChatId, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, guestMessages, streamingMessage]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadChats = async () => {
    if (!user) return;
    
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        CHATS_COLLECTION_ID,
        [
          Query.equal('userId', user.$id),
          Query.orderDesc('$createdAt'),
          Query.limit(100)
        ]
      );
      setChats(response.documents as any);
      
      if (response.documents.length > 0 && !currentChatId) {
        setCurrentChatId(response.documents[0].$id);
      }
    } catch (error) {
      console.error('Error loading chats:', error);
      toast.error('Erreur lors du chargement des chats');
    }
  };

  const loadMessages = async (chatId: string) => {
    if (!user) return;
    
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        MESSAGES_COLLECTION_ID,
        [
          Query.equal('chatId', chatId),
          Query.orderAsc('timestamp'),
          Query.limit(1000)
        ]
      );
      setMessages(response.documents as any);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Erreur lors du chargement des messages');
    }
  };

  const createNewChat = async (firstMessage: string) => {
    if (!user) return null;
    
    try {
      const title = firstMessage.slice(0, 50) + (firstMessage.length > 50 ? '...' : '');
      const chat = await databases.createDocument(
        DATABASE_ID,
        CHATS_COLLECTION_ID,
        ID.unique(),
        {
          userId: user.$id,
          title,
        }
      );
      setChats([chat as any, ...chats]);
      setCurrentChatId(chat.$id);
      return chat.$id;
    } catch (error) {
      console.error('Error creating chat:', error);
      toast.error('Erreur lors de la création du chat');
      throw error;
    }
  };

  const saveMessage = async (chatId: string, role: 'user' | 'assistant', content: string) => {
    if (!user) return null;
    
    try {
      const message = await databases.createDocument(
        DATABASE_ID,
        MESSAGES_COLLECTION_ID,
        ID.unique(),
        {
          chatId,
          role,
          content,
          timestamp: new Date().toISOString(),
        }
      );
      return message;
    } catch (error) {
      console.error('Error saving message:', error);
      throw error;
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);
    setStreamingMessage('');

    try {
      if (!user) {
        // Mode invité - messages en mémoire uniquement
        const newGuestMessages = [
          ...guestMessages,
          { role: 'user' as const, content: userMessage }
        ];
        setGuestMessages(newGuestMessages);

        let aiResponse = '';
        for await (const chunk of sendMessageStream(newGuestMessages)) {
          aiResponse += chunk;
          setStreamingMessage(aiResponse);
        }

        setGuestMessages([
          ...newGuestMessages,
          { role: 'assistant' as const, content: aiResponse }
        ]);
        setStreamingMessage('');
      } else {
        // Mode connecté - sauvegarde dans Appwrite
        let chatId = currentChatId;
        
        if (!chatId) {
          chatId = await createNewChat(userMessage);
        }

        if (chatId) {
          const userMsg = await saveMessage(chatId, 'user', userMessage);
          if (userMsg) {
            setMessages((prev) => [...prev, userMsg as any]);
          }

          const conversationHistory = [
            ...messages.map(m => ({ role: m.role, content: m.content })),
            { role: 'user' as const, content: userMessage }
          ];

          let aiResponse = '';
          for await (const chunk of sendMessageStream(conversationHistory)) {
            aiResponse += chunk;
            setStreamingMessage(aiResponse);
          }

          const assistantMsg = await saveMessage(chatId, 'assistant', aiResponse);
          if (assistantMsg) {
            setMessages((prev) => [...prev, assistantMsg as any]);
          }
          setStreamingMessage('');
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Erreur lors de l\'envoi du message');
      setStreamingMessage('');
      
      // Supprimer le dernier message de l'utilisateur en cas d'erreur
      if (!user) {
        // Mode invité - supprimer le dernier message ajouté
        setGuestMessages(prev => prev.slice(0, -1));
      } else {
        // Mode connecté - supprimer le message de la base de données et de l'état
        if (messages.length > 0) {
          const lastMessage = messages[messages.length - 1];
          if (lastMessage.role === 'user') {
            try {
              await databases.deleteDocument(DATABASE_ID, MESSAGES_COLLECTION_ID, lastMessage.$id);
              setMessages(prev => prev.slice(0, -1));
            } catch (deleteError) {
              console.error('Error deleting failed message:', deleteError);
            }
          }
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    setCurrentChatId(null);
    setMessages([]);
    if (!user) {
      setGuestMessages([]);
    }
  };

  const handleDeleteChat = async (chatId: string) => {
    if (!user) return;
    
    try {
      await databases.deleteDocument(DATABASE_ID, CHATS_COLLECTION_ID, chatId);
      setChats(chats.filter(c => c.$id !== chatId));
      
      if (currentChatId === chatId) {
        handleNewChat();
      }
      
      toast.success('Chat supprimé');
    } catch (error) {
      console.error('Error deleting chat:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const displayMessages = user ? messages : guestMessages.map((m, i) => ({
    $id: `guest-${i}`,
    role: m.role,
    content: m.content,
    timestamp: new Date().toISOString()
  }));

  return (
    <div className="flex h-screen bg-background">
      {user && (
        <ChatSidebar
          chats={chats}
          currentChatId={currentChatId}
          onSelectChat={setCurrentChatId}
          onNewChat={handleNewChat}
          onDeleteChat={handleDeleteChat}
        />
      )}

      <div className="flex-1 flex flex-col">
        {!user && (
          <div className="relative bg-gradient-to-r from-card/80 via-card/60 to-card/80 backdrop-blur-xl border-b border-border/50 shadow-lg shadow-primary/5">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5"></div>
            <div className="relative max-w-4xl mx-auto p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/25 animate-pulse-glow">
                      <MessageSquare className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-accent rounded-full animate-pulse"></div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground tracking-wide">Mode Invité</p>
                    <p className="text-xs text-muted-foreground/80">Vos messages ne seront pas sauvegardés</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <ThemeSelector />
                  <Button
                    onClick={() => navigate('/auth')}
                    variant="outline"
                    size="sm"
                    className="relative border-primary/30 hover:border-primary/60 bg-background/50 hover:bg-primary/5 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105 group"
                  >
                    <LogIn className="w-4 h-4 mr-2 group-hover:rotate-12 transition-transform duration-300" />
                    <span className="font-medium">Se connecter</span>
                    <div className="absolute inset-0 rounded-md bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {displayMessages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center space-y-4 p-8">
                <div className="w-16 h-16 mx-auto rounded-full bg-primary flex items-center justify-center">
                  <MessageSquare className="w-8 h-8 text-primary-foreground" />
                </div>
                <h2 className="text-2xl font-bold text-primary">
                  Bienvenue sur Kichat
                </h2>
                <p className="text-muted-foreground">
                  {user 
                    ? 'Commencez une conversation avec l\'IA' 
                    : 'Essayez l\'IA gratuitement ou connectez-vous pour sauvegarder vos chats'}
                </p>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto">
              {displayMessages.map((message) => (
                <ChatMessage
                  key={message.$id}
                  role={message.role}
                  content={message.content}
                />
              ))}
              {streamingMessage && (
                <ChatMessage
                  key="streaming"
                  role="assistant"
                  content={streamingMessage}
                />
              )}
              {isLoading && !streamingMessage && (
                <div className="flex gap-4 p-6">
                  <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
                    <Loader2 className="w-5 h-5 animate-spin text-accent-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className="flex gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="relative border-t border-border/50 bg-gradient-to-r from-card/80 via-card/60 to-card/80 backdrop-blur-xl shadow-lg shadow-primary/5 mb-4 mx-4 rounded-2xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5"></div>
          <div className="relative max-w-4xl mx-auto p-4">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Écrivez votre message... (Shift+Enter pour nouvelle ligne)"
                  className="min-h-[60px] resize-none bg-background/80 backdrop-blur-sm border-border/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all duration-300 shadow-sm hover:shadow-md"
                  disabled={isLoading}
                />
                {input.trim() && (
                  <div className="absolute bottom-2 right-2 text-xs text-muted-foreground/60 bg-background/50 px-2 py-1 rounded-md backdrop-blur-sm">
                    {input.length} caractères
                  </div>
                )}
              </div>
              <Button
                onClick={handleSendMessage}
                disabled={!input.trim() || isLoading}
                className="relative bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/25 hover:shadow-primary/40 px-6 h-[60px] transition-all duration-300 hover:scale-105 group disabled:hover:scale-100 disabled:opacity-50"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-md"></div>
                <div className="relative flex items-center gap-2">
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span className="hidden sm:inline">Envoi...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5 group-hover:translate-x-0.5 transition-transform duration-300" />
                      <span className="hidden sm:inline font-medium">Envoyer</span>
                    </>
                  )}
                </div>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
