import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  Plus,
  Edit2,
  Trash2,
  FileText,
  Clock,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const noteSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
});

type Note = {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
};

export default function NotesScreen() {
  const [notes, setNotes] = useState<Note[]>([
    {
      id: '1',
      title: 'Budget Planning for 2024',
      content:
        'Need to review monthly expenses and set new budget categories. Focus on reducing discretionary spending and increasing savings rate.',
      createdAt: new Date(2023, 11, 15),
      updatedAt: new Date(2023, 11, 15),
    },
    {
      id: '2',
      title: 'Investment Research',
      content:
        'Research index funds with low expense ratios. Compare Vanguard, Fidelity, and Charles Schwab options. Consider increasing monthly contributions to retirement accounts.',
      createdAt: new Date(2023, 10, 20),
      updatedAt: new Date(2023, 10, 28),
    },
  ]);

  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
  const [currentNote, setCurrentNote] = useState<Note | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  const { toast } = useToast();

  const form = useForm<z.infer<typeof noteSchema>>({
    resolver: zodResolver(noteSchema),
    defaultValues: {
      title: '',
      content: '',
    },
  });

  const handleAddNote = () => {
    setCurrentNote(null);
    form.reset({ title: '', content: '' });
    setIsNoteDialogOpen(true);
  };

  const handleViewNote = (note: Note) => {
    setCurrentNote(note);
    setIsViewDialogOpen(true);
  };

  const handleEditNote = (note: Note) => {
    setCurrentNote(note);
    form.reset({ title: note.title, content: note.content });
    setIsNoteDialogOpen(true);
  };

  const handleDeleteNote = (note: Note) => {
    setCurrentNote(note);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (currentNote) {
      setNotes(notes.filter(note => note.id !== currentNote.id));
      setIsDeleteDialogOpen(false);
      setCurrentNote(null);
      toast({
        title: 'Note deleted',
        description: 'Your note has been successfully deleted.',
      });
    }
  };

  const onSubmit = (data: z.infer<typeof noteSchema>) => {
    if (currentNote) {
      setNotes(
        notes.map(note =>
          note.id === currentNote.id ? { ...note, ...data, updatedAt: new Date() } : note
        )
      );
      toast({
        title: 'Note updated',
        description: 'Your note has been successfully updated.',
      });
    } else {
      const newNote: Note = {
        id: Date.now().toString(),
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setNotes([newNote, ...notes]);
      toast({
        title: 'Note created',
        description: 'Your new note has been successfully created.',
      });
    }
    setIsNoteDialogOpen(false);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Financial Notes</h1>
        <div className="flex space-x-2">
          <Button onClick={handleAddNote}>
            <Plus className="mr-2 h-4 w-4" />
            Add Note
          </Button>
        </div>
      </div>

      {notes.length === 0 ? (
        <Card>
          <CardContent className="pt-10 pb-10 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No notes yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first note to track financial ideas, reminders, or goals.
            </p>
            <Button onClick={handleAddNote}>
              <Plus className="mr-2 h-4 w-4" />
              Add Note
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {notes.map(note => (
            <Card 
              key={note.id} 
              className="flex flex-col cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleViewNote(note)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">{note.title}</CardTitle>
                </div>
                <CardDescription className="flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  {formatDate(note.updatedAt)}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-white whitespace-pre-line line-clamp-4">{note.content}</p>
              </CardContent>
              <CardFooter className="border-t pt-4 flex justify-between">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditNote(note);
                  }}
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteNote(note);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{currentNote ? 'Edit Note' : 'Add New Note'}</DialogTitle>
            <DialogDescription>
              {currentNote
                ? 'Update your financial note details.'
                : 'Create a new note for your financial planning.'}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter note title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter note content"
                        className="min-h-[120px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsNoteDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">{currentNote ? 'Update Note' : 'Create Note'}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Note</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this note? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{currentNote?.title}</DialogTitle>
            <DialogDescription>Financial note details</DialogDescription>
          </DialogHeader>
          <DialogContent className="space-y-4">
            <p className="whitespace-pre-line text-foreground">{currentNote?.content}</p>
          </DialogContent>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
