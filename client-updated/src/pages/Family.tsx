import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Users } from 'lucide-react';
import { useFamilyStore, FamilyMember } from '@/stores/familyStore';
import { useEntryStore } from '@/stores/entryStore';
import { FamilyForm } from '@/components/family/FamilyForm';
import { FamilyCard } from '@/components/family/FamilyCard';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

export default function Family() {
  const [showForm, setShowForm] = useState(false);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const { members, addMember, updateMember, deleteMember, fetchMembers } = useFamilyStore();
  const { entries } = useEntryStore();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleSubmit = async (data: any) => {
    if (editingMember) {
      const result = await updateMember(editingMember.id, data);
      if (result?.success) {
        toast({
          title: "Member Updated",
          description: "Family member profile has been successfully updated.",
        });
      } else {
        toast({
          title: "Update Failed",
          description: result?.message || "Could not update member.",
          variant: "destructive",
        });
        return;
      }
    } else {
      const result = await addMember(data);
      if (result?.success) {
        toast({
          title: "Member Added",
          description: "New family member has been added to your profiles.",
        });
      } else {
        toast({
          title: "Add Failed",
          description: result?.message || "Could not add member.",
          variant: "destructive",
        });
        return;
      }
    }
  
    setShowForm(false);
    setEditingMember(null);
  };

  const handleEdit = (member: FamilyMember) => {
    setEditingMember(member);
    setShowForm(true);
  };

  const handleDelete = async(id: number) => {
    const memberEntries = entries.filter(entry => entry.user_id === id);
    if (memberEntries.length > 0) {
      toast({
        title: "Cannot Delete",
        description: "This family member has diary entries. Please remove those first.",
        variant: "destructive",
      });
      return;
    }
    
    const result = await deleteMember(id);
    if (result.success) {
      toast({
        title: "Member Removed",
        description: "Family member has been removed from your profiles.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Deletion Failed",
        description: result.message || "An error occurred while deleting the member.",
        variant: "destructive",
      });
    }
  };

  const handleCardClick = (member: FamilyMember) => {
    // navigate(`/entries?member=${member.id}`);
    navigate(`/entries/${member.id}`);
  };

  const totalEntries = members.reduce((sum, member) => sum + member.entry_count, 0);
  const avgHealthScore = members.length > 0 
    ? (members.reduce((sum, member) => sum + member.healthScore, 0) / members.length).toFixed(1)
    : '0.0';

  return (
    <div className="min-h-screen bg-gradient-calm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Family Profiles</h1>
            <p className="text-muted-foreground">Manage health records for your family</p>
          </div>
          <Button
            onClick={() => {
              setEditingMember(null);
              setShowForm(true);
            }}
            className="bg-gradient-wellness hover:opacity-90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Member
          </Button>
        </div>

        
        {/* Family Overview Stats */}
        <Card className="mb-8 shadow-soft border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Family Overview
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {members.length} family members tracking their health journey
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-muted/100 p-4 rounded-lg text-center">
                <p className="text-sm font-medium text-foreground mb-1">Total Members</p>
                <p className="text-2xl font-bold text-primary">{members.length}</p>
              </div>
              <div className="bg-muted/100 p-4 rounded-lg text-center">
                <p className="text-sm font-medium text-foreground mb-1">Total Entries</p>
                <p className="text-2xl font-bold text-success">{totalEntries}</p>
              </div>
              <div className="bg-muted/100 p-4 rounded-lg text-center">
                <p className="text-sm font-medium text-foreground mb-1">Avg Health Score</p>
                <p className="text-2xl font-bold text-warning">{avgHealthScore}/10</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Family Members Section */}
        <Card className="shadow-soft border-border">
          <CardHeader>
            <CardTitle>Family Members</CardTitle>
            <p className="text-sm text-muted-foreground">
              Click on a family member to view their detailed health information
            </p>
          </CardHeader>
          <CardContent>
            {members.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-16 w-16 text-muted-foreground mb-4 mx-auto" />
                <h3 className="text-xl font-semibold mb-2">No Family Members Yet</h3>
                <p className="text-muted-foreground text-lg mb-6">
                  Start by adding family members to track their health alongside yours.
                </p>
                <Button
                  onClick={() => {
                    setEditingMember(null);
                    setShowForm(true);
                  }}
                  className="bg-gradient-wellness hover:opacity-90"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Member
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {members.map((member) => (
                  <FamilyCard
                    key={member.id}
                    member={member}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onClick={handleCardClick}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Family Form Dialog */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingMember ? 'Edit Family Member' : 'Add Family Member'}
              </DialogTitle>
            </DialogHeader>
            <FamilyForm
              member={editingMember || undefined}
              onSubmit={handleSubmit}
              onCancel={() => {
                setShowForm(false);
                setEditingMember(null);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}