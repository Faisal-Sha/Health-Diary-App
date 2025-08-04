import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Edit, Trash2, User } from 'lucide-react';
import { DiaryEntry } from '@/stores/entryStore';
import { useFamilyStore } from '@/stores/familyStore';

interface EntryCardProps {
  entry: DiaryEntry;
  onEdit: (entry: DiaryEntry) => void;
  onDelete: (id: number) => void;
}

export function EntryCard({ entry, onEdit, onDelete }: EntryCardProps) {
  const { getMemberById } = useFamilyStore();
  const familyMember = getMemberById(entry.user_id);

  return (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-lg line-clamp-1">
              {new Date(entry.date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </h3>
            <p className="text-sm text-muted-foreground">
              AI Confidence: {entry.ai_confidence}%
            </p>
          </div>
          <Badge variant="outline" className="flex items-center gap-1">
            <span>📝</span>
            <span>Entry</span>
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
          {entry.text_preview || entry.text}
        </p>
        
        {familyMember && (
          <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
            <User className="h-4 w-4" />
            <span>{familyMember.name} ({familyMember.role})</span>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="pt-2 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {entry.date}
        </span>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(entry)}
            className="h-8 w-8 p-0"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(entry.id)}
            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}