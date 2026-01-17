'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface ImportBoardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (json: string) => void;
}

export default function ImportBoardDialog({ open, onOpenChange, onImport }: ImportBoardDialogProps) {
  const [jsonInput, setJsonInput] = useState('');

  const handleImport = () => {
    if (jsonInput.trim()) {
      onImport(jsonInput);
      setJsonInput('');
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    setJsonInput('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Board State</DialogTitle>
          <DialogDescription>
            Paste the JSON representation of the board state below
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <Textarea
            value={jsonInput}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setJsonInput(e.target.value)}
            placeholder='{"pieces": [...], "activeColor": "white", ...}'
            className="h-100 max-h-100 font-mono text-sm resize-none"
          />
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={!jsonInput.trim()}>
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
