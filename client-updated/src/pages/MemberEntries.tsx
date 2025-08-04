// src/pages/MemberEntries.tsx
import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useEntryStore } from '@/stores/entryStore';
import { useFamilyStore } from '@/stores/familyStore';
import { EntryCard } from '@/components/entries/EntryCard';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { EntryForm } from '@/components/entries/EntryForm';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

export default function MemberEntries() {
  const { memberId } = useParams();
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);

  const { members, fetchMembers } = useFamilyStore();
const { entries, fetchMemberEntries, addEntry, updateEntry, deleteEntry } = useEntryStore();
  const { toast } = useToast();

  const member = members.find(m => m.id.toString() === memberId);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  useEffect(() => {
    if (memberId) {
      fetchMemberEntries(Number(memberId));
    }
  }, [memberId, fetchMemberEntries]);

  const handleSubmit = async (data: any) => {
    const result = editingEntry
      ? await updateEntry(editingEntry.id, { text: data.text })
      : await addEntry({ ...data, memberId: Number(memberId) });

    if (result.success) {
      toast({
        title: editingEntry ? 'Entry Updated' : 'Entry Created',
        description: result.message || 'Success',
      });
      setShowForm(false);
      setEditingEntry(null);
    } else {
      toast({
        title: 'Error',
        description: result.message || 'Something went wrong',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 to-blue-500 rounded-2xl shadow-md p-6 text-white flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-semibold">{member?.name}'s Health Diary</h2>
          <p className="text-sm text-white/80">{member?.name} • {entries.length} entries</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-white text-blue-600 hover:bg-blue-100">
          <Plus className="w-4 h-4 mr-2" />
          New Entry
        </Button>
      </div>

      {/* Entries */}
      {entries.length === 0 ? (
        <div className="bg-white p-8 rounded-lg text-center shadow-md">
          <p className="text-muted-foreground text-lg mb-4">
            No entries yet for {member?.name}. Start writing your first health diary entry!
          </p>
          <Button onClick={() => setShowForm(true)} className="bg-gradient-wellness">
            <Plus className="mr-2 w-4 h-4" />
            Create First Entry
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {entries.map(entry => (
            <EntryCard
              key={entry.id}
              entry={entry}
              onEdit={setEditingEntry}
              onDelete={deleteEntry}
            />
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <EntryForm
            entry={editingEntry || undefined}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingEntry(null);
            }}
            preSelectedMember={member}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
