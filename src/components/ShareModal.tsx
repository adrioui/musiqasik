import { useState } from 'react';
import { MaterialIcon } from '@/components/ui/material-icon';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

interface ShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  graphState: {
    artist: string;
    depth: number;
    threshold: number;
  };
  onExportImage?: () => Promise<Blob | null>;
}

export function ShareModal({
  open,
  onOpenChange,
  graphState,
  onExportImage,
}: ShareModalProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Build share URL
  const shareUrl = new URL(window.location.href);
  shareUrl.searchParams.set('depth', graphState.depth.toString());
  shareUrl.searchParams.set('threshold', graphState.threshold.toString());
  const shareUrlString = shareUrl.toString();

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrlString);
      setCopied(true);
      toast({ title: 'Link copied!', description: 'Share URL copied to clipboard' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Failed to copy', variant: 'destructive' });
    }
  };

  const handleExportImage = async () => {
    if (!onExportImage) return;

    setExporting(true);
    try {
      const blob = await onExportImage();
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${graphState.artist}-graph.png`;
        a.click();
        URL.revokeObjectURL(url);
        toast({ title: 'Image exported!', description: 'Graph image saved' });
      }
    } catch {
      toast({ title: 'Export failed', variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MaterialIcon name="share" size="sm" className="text-primary" />
            Share Graph
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Graph Info */}
          <div className="rounded-lg bg-secondary/50 p-3">
            <p className="text-sm font-medium">{graphState.artist}'s Similarity Graph</p>
            <p className="text-xs text-muted-foreground">
              Depth: {graphState.depth} hops • Threshold: {Math.round(graphState.threshold * 100)}%
            </p>
          </div>

          {/* URL Copy */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Share Link</label>
            <div className="flex gap-2">
              <Input value={shareUrlString} readOnly className="flex-1 text-xs" />
              <Button onClick={handleCopyLink} variant="outline">
                <MaterialIcon name={copied ? 'check' : 'content_copy'} size="sm" />
              </Button>
            </div>
          </div>

          {/* Export Image */}
          {onExportImage && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Export Image</label>
              <Button
                onClick={handleExportImage}
                variant="outline"
                className="w-full"
                disabled={exporting}
              >
                <MaterialIcon name="download" size="sm" className="mr-2" />
                {exporting ? 'Exporting...' : 'Download PNG'}
              </Button>
            </div>
          )}

          {/* Social Share */}
          <div className="flex items-center gap-2 border-t border-border pt-4">
            <Button variant="secondary" className="flex-1" asChild>
              <a
                href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrlString)}&text=Check out my music taste graph for ${graphState.artist}!`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Share on X
              </a>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
