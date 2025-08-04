import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Search, CalendarIcon, Filter, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { useEntryStore, DiaryEntry } from '@/stores/entryStore';
import { useFamilyStore } from '@/stores/familyStore';
import { EntryForm } from '@/components/entries/EntryForm';
import { EntryCard } from '@/components/entries/EntryCard';
import { useToast } from '@/hooks/use-toast';
import { useSearchParams } from 'react-router-dom';
import { BulkImportDialog } from '@/components/entries/BulkImportDialogue';

export default function Entries() {
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<DiaryEntry | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [searchParams] = useSearchParams();
  const { entries, addEntry, updateEntry, deleteEntry, fetchAllEntries, pagination } = useEntryStore();
  const { members, fetchMembers } = useFamilyStore();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [showBulkImport, setShowBulkImport] = useState(false);

  // Check if a specific member was selected from family page
  const selectedMemberId = searchParams.get('member');
  
  // 1. Fetch members once
  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // 2. When members are available, fetch entries
  useEffect(() => {
    if (members.length > 0) {
      fetchAllEntries(page, pagination?.page_size || 20); // Fetch entries for the first member();
    }
  }, [members, fetchAllEntries, page]);

  useEffect(() => {
    // Auto-open form if coming from family page with selected member
    if (selectedMemberId && members.length > 0) {
      setShowForm(true);
    }
  }, [selectedMemberId, members.length]);

  const filteredEntries = entries.filter((entry) => {
    const matchesSearch = entry.text?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false;
    const matchesDate = !selectedDate || entry.date === format(selectedDate, 'yyyy-MM-dd');
    
    return matchesSearch && matchesDate;
  });

  const handleSubmit = async (data: any) => {
    let result;
    if (editingEntry) {
      result = await updateEntry(editingEntry.id, { text: data.text });
      if (result.success) {
        toast({
          title: "Entry Updated",
          description: "Your diary entry has been successfully updated.",
        });
      } else {
        toast({
          title: "Update Failed",
          description: result.message || "Could not update entry.",
          variant: "destructive",
        });
        return;
      }
    } else {
      result = await addEntry(data);
      if (result.success) {
        toast({
          title: "Entry Created",
          description: "Your new diary entry has been saved.",
        });
      } else {
        toast({
          title: "Creation Failed", 
          description: result.message || "Could not create entry.",
          variant: "destructive",
        });
        return;
      }
    }
    setShowForm(false);
    setEditingEntry(null);
  };

  const handleEdit = (entry: DiaryEntry) => {
    setEditingEntry(entry);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    const result = await deleteEntry(id);
    if (result.success) {
      toast({
        title: "Entry Deleted",
        description: result.message || "The diary entry has been removed.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Deletion Failed",
        description: result.message || "Could not delete entry.",
        variant: "destructive",
      });
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedDate(undefined);
  };

  // Get the pre-selected member for the form
  const getPreSelectedMember = () => {
    if (selectedMemberId) {
      return members.find(m => m.id.toString() === selectedMemberId);
    }
    return undefined;
  };

  return (
    <div className="min-h-screen bg-gradient-calm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-4">
          <div className="pl-1">
            <h1 className="text-3xl font-bold text-foreground mb-2">Diary Entries</h1>
            <p className="text-muted-foreground">Track your daily thoughts and emotions</p>
          </div>
          <div className="flex justify-end gap-2 pr-1">
            <Button 
              onClick={() => setShowBulkImport(true)}
              className="bg-gradient-wellness hover:opacity-90"
            >
              <Upload className="h-4 w-4 mr-2" />
              Import Entries
            </Button>

            <BulkImportDialog
              isOpen={showBulkImport}
              onClose={() => setShowBulkImport(false)}
            />
            <Button
              onClick={() => setShowForm(true)}
              className="bg-gradient-wellness hover:opacity-90"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Entry
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6 shadow-soft border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filter & Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search entries..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {(searchTerm || selectedDate) && (
                <Button variant="ghost" onClick={clearFilters}>
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Entries Grid */}
        {filteredEntries.length === 0 ? (
          <Card className="text-center py-12 shadow-soft border-border">
            <CardContent>
              <p className="text-muted-foreground text-lg mb-4">
                {entries.length === 0
                  ? "No diary entries yet. Start by creating your first entry!"
                  : "No entries match your current filters."}
              </p>
              {entries.length === 0 && (
                <Button
                  onClick={() => setShowForm(true)}
                  className="bg-gradient-wellness hover:opacity-90"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Entry
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEntries.map((entry) => (
              <EntryCard
                key={entry.id}
                entry={entry}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        {/* Entry Form Dialog */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingEntry ? 'Edit Entry' : 'New Diary Entry'}
              </DialogTitle>
            </DialogHeader>
            <EntryForm
              entry={editingEntry || undefined}
              onSubmit={handleSubmit}
              onCancel={() => {
                setShowForm(false);
                setEditingEntry(null);
              }}
              preSelectedMember={getPreSelectedMember()}
            />
          </DialogContent>
        </Dialog>
      </div>
      {pagination?.total_pages > 1 && (
        <div className="mt-8 flex justify-center gap-4">
          <Button
            variant="outline"
            disabled={page === 1}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          >
            Previous
          </Button>
          <span className="text-muted-foreground self-center">
            Page {pagination?.page} of {pagination?.total_pages}
          </span>
          <Button
            variant="outline"
            disabled={page === pagination?.total_pages}
            onClick={() => setPage((prev) => Math.min(pagination?.total_pages || 1, prev + 1))}
          >
            Next
          </Button>
        </div>
      )}
      <p className="text-sm text-muted-foreground mt-2 text-center">
        Showing page {pagination?.page} of {pagination?.total_pages} ({pagination?.total} entries)
      </p>
    </div>
  );
}