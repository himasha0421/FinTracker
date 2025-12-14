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
  Youtube,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Note schema
const noteSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
});

// YouTube URL schema
const youtubeUrlSchema = z.object({
  url: z.string()
    .min(1, 'YouTube URL is required')
    .refine(
      (url) => url.includes('youtube.com/') || url.includes('youtu.be/'),
      { message: 'Please enter a valid YouTube URL' }
    ),
});

type Note = {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  // YouTube-specific fields
  isYouTube?: boolean;
  youtubeUrl?: string;
  thumbnailUrl?: string;
  tags?: string[];
  publishDate?: string;
};

export default function Notes() {
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
  const [isYoutubeDialogOpen, setIsYoutubeDialogOpen] = useState(false);
  const [currentNote, setCurrentNote] = useState<Note | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isProcessingYoutube, setIsProcessingYoutube] = useState(false);

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
  
  const handleAddYoutubeNote = () => {
    youtubeForm.reset({ url: '' });
    setIsYoutubeDialogOpen(true);
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
      // Update existing note
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
      // Create new note
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
  
  // YouTube form
  const youtubeForm = useForm<z.infer<typeof youtubeUrlSchema>>({
    resolver: zodResolver(youtubeUrlSchema),
    defaultValues: {
      url: '',
    },
  });
  
  // Process YouTube URL
  const processYoutubeUrl = async (data: z.infer<typeof youtubeUrlSchema>) => {
    try {
      setIsProcessingYoutube(true);
      
      const response = await fetch('http://localhost:8000/api/youtube-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: data.url }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to process YouTube video');
      }
      
      const result = await response.json();
      
      if (result.task_type === 'youtube_summary') {
        // Create a new note with YouTube data
        const videoData = result.data;
        const newNote: Note = {
          id: Date.now().toString(),
          title: videoData.title,
          content: videoData.summary,
          createdAt: new Date(),
          updatedAt: new Date(),
          isYouTube: true,
          youtubeUrl: videoData.video_url,
          thumbnailUrl: videoData.thumbnail_url,
          tags: videoData.tags,
          publishDate: videoData.publish_date,
        };
        
        setNotes([newNote, ...notes]);
        
        toast({
          title: 'YouTube summary created',
          description: 'Your YouTube video has been summarized and saved as a note.',
        });
      }
      
      setIsYoutubeDialogOpen(false);
    } catch (error) {
      console.error('Error processing YouTube URL:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to process YouTube video',
        variant: 'destructive',
      });
    } finally {
      setIsProcessingYoutube(false);
    }
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
          <Button onClick={handleAddYoutubeNote} variant="outline">
            <Youtube className="mr-2 h-4 w-4" />
            Add YouTube Summary
          </Button>
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
                  <CardTitle className="flex items-center">
                    {note.isYouTube && <Youtube className="h-4 w-4 mr-2 text-red-500" />}
                    {note.title}
                  </CardTitle>
                </div>
                <CardDescription className="flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  {formatDate(note.updatedAt)}
                  {note.isYouTube && note.publishDate && (
                    <span className="ml-2">• Published: {new Date(note.publishDate).toLocaleDateString()}</span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                {note.isYouTube && note.thumbnailUrl && (
                  <div className="mb-3 relative">
                    <img
                      src={note.thumbnailUrl}
                      alt={note.title}
                      className="w-full h-auto rounded-md object-cover"
                    />
                  </div>
                )}
                <div className={note.isYouTube ? "max-h-40 overflow-y-auto" : ""}>
                  {note.isYouTube && note.tags && note.tags.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1">
                      {note.tags.slice(0, 3).map((tag, index) => (
                        <span key={index} className="bg-blue-600 text-white text-xs px-2 py-1 rounded">
                          {tag}
                        </span>
                      ))}
                      {note.tags.length > 3 && (
                        <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded">
                          +{note.tags.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                  <p className="text-white whitespace-pre-line line-clamp-4">{note.content}</p>
                </div>
                {note.isYouTube && note.youtubeUrl && (
                  <a
                    href={note.youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-sm text-blue-500 hover:text-blue-700 mt-2"
                    onClick={(e) => e.stopPropagation()} // Prevent card click when clicking the link
                  >
                    Watch on YouTube <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                )}
              </CardContent>
              <CardFooter className="border-t pt-4 flex justify-between">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent card click when clicking the button
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
                    e.stopPropagation(); // Prevent card click when clicking the button
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

      {/* Add/Edit Note Dialog */}
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
                        placeholder="Enter your note content here..."
                        className="min-h-[150px]"
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Note</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this note? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {currentNote && (
            <div className="border rounded-md p-3 bg-muted/50">
              <h4 className="font-medium mb-1">{currentNote.title}</h4>
              <p className="text-sm text-muted-foreground line-clamp-2">{currentNote.content}</p>
            </div>
          )}

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
      
      {/* YouTube URL Input Dialog */}
      <Dialog open={isYoutubeDialogOpen} onOpenChange={setIsYoutubeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add YouTube Summary</DialogTitle>
            <DialogDescription>
              Enter a YouTube URL to generate a summary of the video content.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...youtubeForm}>
            <form onSubmit={youtubeForm.handleSubmit(processYoutubeUrl)} className="space-y-4">
              <FormField
                control={youtubeForm.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>YouTube URL</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://www.youtube.com/watch?v=..."
                        {...field}
                        disabled={isProcessingYoutube}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsYoutubeDialogOpen(false)}
                  disabled={isProcessingYoutube}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isProcessingYoutube}
                >
                  {isProcessingYoutube ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Generate Summary'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* View Note Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-900 border-gray-700">
          {currentNote && (
            <>
              <DialogHeader>
                <div className="flex items-center">
                  {currentNote.isYouTube && <Youtube className="h-5 w-5 mr-2 text-red-500" />}
                  <DialogTitle className="text-xl font-bold text-white">{currentNote.title}</DialogTitle>
                </div>
                <DialogDescription className="flex items-center mt-1 text-gray-300">
                  <Clock className="h-3 w-3 mr-1 text-gray-300" />
                  {formatDate(currentNote.updatedAt)}
                  {currentNote.isYouTube && currentNote.publishDate && (
                    <span className="ml-2 text-gray-300">• Published: {new Date(currentNote.publishDate).toLocaleDateString()}</span>
                  )}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {currentNote.isYouTube && currentNote.thumbnailUrl && (
                  <div className="relative">
                    <img
                      src={currentNote.thumbnailUrl}
                      alt={currentNote.title}
                      className="w-full h-auto rounded-md object-cover"
                    />
                  </div>
                )}

                {currentNote.isYouTube && currentNote.tags && currentNote.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {currentNote.tags.map((tag, index) => (
                      <span key={index} className="bg-blue-600 text-white text-xs px-2 py-1 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="prose prose-lg max-w-none">
                  <p className="whitespace-pre-line text-white font-medium leading-relaxed">{currentNote.content}</p>
                </div>

                {currentNote.isYouTube && currentNote.youtubeUrl && (
                  <a
                    href={currentNote.youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-blue-400 hover:text-blue-300 font-medium"
                  >
                    Watch on YouTube <ExternalLink className="h-4 w-4 ml-1" />
                  </a>
                )}
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => setIsViewDialogOpen(false)} className="bg-gray-800 text-white border-gray-700 hover:bg-gray-700">
                  Close
                </Button>
                <Button variant="outline" onClick={() => {
                  setIsViewDialogOpen(false);
                  handleEditNote(currentNote);
                }} className="bg-blue-600 text-white border-blue-700 hover:bg-blue-700">
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button variant="destructive" onClick={() => {
                  setIsViewDialogOpen(false);
                  handleDeleteNote(currentNote);
                }} className="bg-red-600 hover:bg-red-700">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
