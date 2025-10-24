import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Palette, Moon, Sun } from 'lucide-react';

const colors = [
  { name: 'Bleu', value: 'blue' as const, color: 'bg-blue-500' },
  { name: 'Rouge', value: 'red' as const, color: 'bg-red-500' },
  { name: 'Vert', value: 'green' as const, color: 'bg-green-500' },
  { name: 'Orange', value: 'orange' as const, color: 'bg-orange-500' },
  { name: 'Rose', value: 'pink' as const, color: 'bg-pink-500' },
];

export function ThemeSelector() {
  const { color, mode, setColor, setMode } = useTheme();

  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')}
        variant="outline"
        size="icon"
        className="border-border"
      >
        {mode === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </Button>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="icon" className="border-border">
            <Palette className="w-4 h-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-52 bg-card border-border">
          <div className="space-y-2">
            <p className="text-sm font-medium mb-3">Couleur principale</p>
            <div className="grid grid-cols-5 gap-2">
              {colors.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setColor(c.value)}
                  className={`w-10 h-10 rounded-lg ${c.color} transition-all hover:scale-110 ${
                    color === c.value ? ' ring-offset-background' : ''
                  }`}
                  title={c.name}
                />
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
