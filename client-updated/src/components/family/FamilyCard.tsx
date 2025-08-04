import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Edit, Trash2 } from 'lucide-react';
import { FamilyMember } from '@/stores/familyStore';

interface FamilyCardProps {
  member: FamilyMember;
  onEdit: (member: FamilyMember) => void;
  onDelete: (id: number) => void;
  onClick?: (member: FamilyMember) => void;
}

export function FamilyCard({ member, onEdit, onDelete, onClick }: FamilyCardProps) {
  const handleCardClick = () => {
    if (onClick) {
      onClick(member);
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(member);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(member.id);
  };

  return (
    <Card 
      className="hover:shadow-md transition-shadow duration-200 cursor-pointer group"
      onClick={handleCardClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
              style={{ backgroundColor: member.color + '20' }}
            >
              {member.avatar}
            </div>
          </div>
          
          {/* Member Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg truncate mb-1">{member.name}</h3>
            
            {/* Stats Row */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
              <span>📝 {member.entry_count} entries</span>
              <span>❤️ {member.healthScore}/10</span>
            </div>
            
            {/* Last Active */}
            <div className="text-xs text-muted-foreground">
              Last active: {new Date(member.lastActive).toLocaleDateString()}
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleEditClick}
              className="h-8 w-8 p-0"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDeleteClick}
              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Role Badge */}
        <div className="mt-3">
          <Badge variant="secondary" className="text-xs">
            {member.role}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}