import { useLastFmAuth } from '@/contexts/LastFmAuthContext';
import { Button } from '@/components/ui/button';
import { MaterialIcon } from '@/components/ui/material-icon';

interface ConnectLastFmButtonProps {
  variant?: 'default' | 'outline';
  className?: string;
}

export function ConnectLastFmButton({ variant = 'outline', className }: ConnectLastFmButtonProps) {
  const { isAuthenticated, username, connect, disconnect } = useLastFmAuth();

  if (isAuthenticated) {
    return (
      <Button variant={variant} className={className} onClick={disconnect}>
        <MaterialIcon name="person" size="sm" className="mr-2" />
        {username}
      </Button>
    );
  }

  return (
    <Button variant={variant} className={className} onClick={connect}>
      Connect Last.fm
    </Button>
  );
}
