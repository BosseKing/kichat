import React from 'react';
import { MessageSquare, Plus, LogOut, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeSelector } from '@/components/ThemeSelector';

interface Chat {
  $id: string;
  title: string;
  $createdAt: string;
}

interface ChatSidebarProps {
  chats: Chat[];
  currentChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
  onDeleteChat: (chatId: string) => void;
}

export function ChatSidebar({ 
  chats, 
  currentChatId, 
  onSelectChat, 
  onNewChat,
  onDeleteChat 
}: ChatSidebarProps) {
  const { user, logout } = useAuth();

  return (
    <div className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col h-full">
      <div className="p-4 border-b border-sidebar-border space-y-3">
        <Button 
          onClick={onNewChat}
          className="w-full bg-primary hover:opacity-90"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nouveau Chat
        </Button>
        <ThemeSelector />
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {chats.map((chat) => (
            <div
              key={chat.$id}
              className="group relative"
            >
              <button
                onClick={() => onSelectChat(chat.$id)}
                className={`w-full text-left px-3 py-2 rounded-lg transition-all ${
                  currentChatId === chat.$id
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'hover:bg-sidebar-accent/50 text-sidebar-foreground'
                }`}
              >
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate text-sm">{chat.title}</span>
                </div>
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteChat(chat.$id);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/20 rounded"
              >
                <Trash2 className="w-3 h-3 text-destructive" />
              </button>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-sidebar-border">
        <div className="text-sm text-sidebar-foreground mb-2 truncate">
          {user?.email}
        </div>
        <Button 
          onClick={logout}
          variant="outline"
          className="w-full"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Déconnexion
        </Button>
      </div>
    </div>
  );
}
