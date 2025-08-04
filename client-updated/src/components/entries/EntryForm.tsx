import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { DiaryEntry } from '@/stores/entryStore';
import { useFamilyStore } from '@/stores/familyStore';
import { VoiceRecorder } from '@/components/ui/voice-recorder';

const entrySchema = z.object({
  text: z.string().min(1, 'Entry text is required'),
  date: z.string().min(1, 'Date is required'),
  user_id: z.number(),
});

type EntryFormData = z.infer<typeof entrySchema>;

interface EntryFormProps {
  entry?: DiaryEntry;
  onSubmit: (data: EntryFormData) => void;
  onCancel: () => void;
  preSelectedMember?: any;
}

export function EntryForm({ entry, onSubmit, onCancel, preSelectedMember }: EntryFormProps) {
  const { members } = useFamilyStore();

  const form = useForm<EntryFormData>({
    resolver: zodResolver(entrySchema),
    defaultValues: {
      text: entry?.text || '',
      date: entry?.date || new Date().toISOString().split('T')[0],
      user_id: entry?.user_id || preSelectedMember?.id || (members[0]?.id || 1),
    },
  });

  const handleSubmit = (data: EntryFormData) => {
    onSubmit(data);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{entry ? 'Edit Entry' : 'New Diary Entry'}</CardTitle>
      </CardHeader>
      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <input
                id="date"
                type="date"
                {...form.register('date')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
              {form.formState.errors.date && (
                <p className="text-sm text-destructive">{form.formState.errors.date.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Family Member</Label>
              <Select onValueChange={(value) => form.setValue('user_id', parseInt(value))} defaultValue={form.getValues('user_id')?.toString()}>
                <SelectTrigger>
                  <SelectValue placeholder="Select family member" />
                </SelectTrigger>
                <SelectContent>
                  {members.map((member) => (
                    <SelectItem key={member.id} value={member.id.toString()}>
                      {member.name} ({member.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="text">Entry Content</Label>
            <Textarea
              id="text"
              {...form.register('text')}
              placeholder="What happened today? How are you feeling?"
              rows={8}
            />
            <VoiceRecorder onTranscript={(text) => form.setValue('text', `${form.getValues('text')} ${text}`.trim())}/>
            {form.formState.errors.text && (
              <p className="text-sm text-destructive">{form.formState.errors.text.message}</p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" className="bg-gradient-wellness hover:opacity-90">
            {entry ? 'Update Entry' : 'Create Entry'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}