import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { FamilyMember } from '@/stores/familyStore';
import { useEffect, useState } from 'react';


const AVATAR_OPTIONS = ['👤', '👨', '👩', '👶', '👧', '👦', '👴', '👵', '🧑', '👨‍⚕️', '👩‍⚕️'];
const COLOR_OPTIONS = [
  '#3B82F6', // Blue
  '#10B981', // Green  
  '#F59E0B', // Yellow
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#84CC16', // Lime
  '#EC4899', // Pink
  '#6B7280', // Gray
];

const familySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  avatar: z.string().min(1, 'Avatar is required'),
  color: z.string().min(1, 'Color is required'),
});

type FamilyFormData = z.infer<typeof familySchema>;

interface FamilyFormProps {
  member?: FamilyMember;
  onSubmit: (data: FamilyFormData) => void;
  onCancel: () => void;
}

export function FamilyForm({ member, onSubmit, onCancel }: FamilyFormProps) {
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_OPTIONS[0]);
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);

  const form = useForm<FamilyFormData>({
    resolver: zodResolver(familySchema),
    defaultValues: {
      name: member?.name || '',
      avatar: member?.avatar || selectedAvatar,
      color: member?.color || selectedColor,
    },
  });

  useEffect(() => {
    if (member) {
      setSelectedAvatar(member.avatar);
      setSelectedColor(member.color);
      form.setValue('avatar', member.avatar);
      form.setValue('color', member.color);
    }
  }, [member]);
  

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>{member ? 'Edit Family Member' : 'Add Family Member'}</CardTitle>
      </CardHeader>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              {...form.register('name')}
              placeholder="Enter name"
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="avatar">Choose Avatar</Label>
            <div className="grid grid-cols-6 gap-2">
              {AVATAR_OPTIONS.map((avatar) => (
                <button
                  key={avatar}
                  type="button"
                  onClick={() => {
                    setSelectedAvatar(avatar);
                    form.setValue('avatar', avatar, { shouldValidate: true });
                  }}
                  className={`w-12 h-12 rounded-lg flex items-center justify-center text-xl transition-all ${
                    selectedAvatar === avatar
                      ? 'bg-primary text-primary-foreground ring-2 ring-primary'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  {avatar}
                </button>
              ))}
            </div>
            {form.formState.errors.avatar && (
              <p className="text-sm text-destructive">{form.formState.errors.avatar.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="color">Choose Color</Label>
            <div className="grid grid-cols-5 gap-2">
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => {
                    setSelectedColor(color);
                    form.setValue('color', color, { shouldValidate: true });
                  }}
                  className={`w-12 h-12 rounded-lg transition-all ${
                    selectedColor === color
                      ? 'ring-2 ring-foreground ring-offset-2'
                      : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            {form.formState.errors.color && (
              <p className="text-sm text-destructive">{form.formState.errors.color.message}</p>
            )}
          </div>

          {/* <div className="space-y-2">
            <Label htmlFor="age">Age</Label>
            <Input
              id="age"
              type="number"
              {...form.register('age', { valueAsNumber: true })}
              placeholder="Enter age"
            />
            {form.formState.errors.age && (
              <p className="text-sm text-destructive">{form.formState.errors.age.message}</p>
            )}
          </div> */}

          {/* <div className="space-y-2">
            <Label htmlFor="relation">Relation</Label>
            <Input
              id="relation"
              {...form.register('relation')}
              placeholder="e.g., Spouse, Child, Parent"
            />
            {form.formState.errors.relation && (
              <p className="text-sm text-destructive">{form.formState.errors.relation.message}</p>
            )}
          </div> */}
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" className="bg-gradient-wellness hover:opacity-90">
            {member ? 'Update Member' : 'Add Member'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}