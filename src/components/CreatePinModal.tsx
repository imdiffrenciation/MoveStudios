import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Upload } from 'lucide-react';

interface CreatePinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (pin: { title: string; description: string; imageUrl: string }) => void;
}

const CreatePinModal = ({ isOpen, onClose, onSubmit }: CreatePinModalProps) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title && imageUrl) {
      onSubmit({ title, description, imageUrl });
      setTitle('');
      setDescription('');
      setImageUrl('');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Create New Pin</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Share your inspiration with the community
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="imageUrl" className="text-foreground">Image URL</Label>
            <div className="flex gap-2">
              <Input
                id="imageUrl"
                type="url"
                placeholder="https://example.com/image.jpg"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="flex-1 bg-secondary border-none"
                required
              />
              <Button type="button" variant="outline" size="icon">
                <Upload className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {imageUrl && (
            <div className="rounded-lg overflow-hidden border border-border">
              <img src={imageUrl} alt="Preview" className="w-full h-48 object-cover" />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="title" className="text-foreground">Title</Label>
            <Input
              id="title"
              placeholder="Give your pin a title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-secondary border-none"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-foreground">Description</Label>
            <Textarea
              id="description"
              placeholder="What's your pin about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-secondary border-none resize-none"
              rows={4}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              Create Pin
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePinModal;
