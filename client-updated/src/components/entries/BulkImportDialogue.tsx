import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useFamilyStore } from '@/stores/familyStore';
import { useToast } from '@/hooks/use-toast';
import api from '@/services/apiClient';

interface BulkImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  preSelectedMemberId?: number;
}

export function BulkImportDialog({ isOpen, onClose, preSelectedMemberId }: BulkImportDialogProps) {
  const { members } = useFamilyStore();
  const { toast } = useToast();

  const [fileType, setFileType] = useState<'txt' | 'csv'>('txt');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(preSelectedMemberId ?? null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = () => {
    const templateName = fileType === 'csv'
      ? 'health_diary_template.csv'
      : 'health_diary_template.txt';
    const link = document.createElement('a');
    link.href = `/templates/${templateName}`;
    link.download = templateName;
    link.click();
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedMemberId) {
      toast({ title: 'Missing Info', description: 'Please select a file and member.', variant: 'destructive' });
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('user_id', selectedMemberId.toString());
    formData.append('file_type', fileType);

    try {
      const response = await api.post('/entries/bulk-import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data.success) {
        toast({ title: 'Entries Imported', description: `${response.data.processed} entries added.` });
        onClose();
      } else {
        throw new Error(response.data.message || 'Import failed');
      }
    } catch (err: any) {
      toast({
        title: 'Import Failed',
        description: err?.response?.data?.message || 'An error occurred while uploading.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk Import Diary Entries</DialogTitle>
        </DialogHeader>

        {/* File Type Selection */}
        <div className="space-y-2">
          <Label>Select file type</Label>
          <Select value={fileType} onValueChange={(val) => setFileType(val as 'txt' | 'csv')}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="txt">.txt</SelectItem>
              <SelectItem value="csv">.csv</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Template Download */}
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground text-sm">Need a format guide?</span>
          <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
            Download {fileType.toUpperCase()} Template
          </Button>
        </div>

        {/* Member Selection (global only) */}
        {!preSelectedMemberId && (
          <div className="space-y-2">
            <Label>Choose family member</Label>
            <Select onValueChange={(val) => setSelectedMemberId(Number(val))}>
              <SelectTrigger>
                <SelectValue placeholder="Select a member" />
              </SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id.toString()}>
                    {m.name} ({m.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* File Upload */}
        <div className="space-y-2">
          <Label>Upload file</Label>
          <Input
            type="file"
            accept={fileType === 'txt' ? '.txt' : '.csv'}
            ref={inputRef}
            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
          />
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <Button onClick={handleUpload}>Import</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
