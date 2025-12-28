import { MaterialIcon } from '@/components/ui/material-icon';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/components/ThemeProvider';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const cycleTheme = () => {
    const themes: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system'];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  const iconName = theme === 'dark' ? 'dark_mode' : theme === 'light' ? 'light_mode' : 'desktop_windows';

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={cycleTheme}
      className="shrink-0"
      title={`Theme: ${theme}`}
      aria-label="Toggle theme"
    >
      <MaterialIcon name={iconName} size="sm" />
    </Button>
  );
}
