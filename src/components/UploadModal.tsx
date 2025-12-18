import { useState, useRef } from 'react';
import { X, Upload, Video, Image as ImageIcon, XCircle, Shield } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { generateContentHash } from '@/hooks/useContentHash';
import { resizeAndConvertToWebP } from '@/lib/imageUtils';
interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: () => void;
}

const UploadModal = ({ isOpen, onClose, onUpload }: UploadModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (selectedFile: File) => {
    // Only allow images and videos
    const isImage = selectedFile.type.startsWith('image/');
    const isVideo = selectedFile.type.startsWith('video/');
    
    if (!isImage && !isVideo) {
      toast({
        title: 'Invalid file type',
        description: 'Only images and videos are allowed.',
        variant: 'destructive',
      });
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'File size must be less than 5MB.',
        variant: 'destructive',
      });
      return;
    }

    if (isVideo && !['video/mp4', 'video/webm', 'video/quicktime'].includes(selectedFile.type)) {
      toast({
        title: 'Unsupported video format',
        description: 'Please upload MP4, WebM, or MOV videos.',
        variant: 'destructive',
      });
      return;
    }

    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const addTag = () => {
    const trimmedTag = tagInput.trim().toLowerCase();
    if (trimmedTag && !tags.includes(trimmedTag) && tags.length < 10) {
      setTags([...tags, trimmedTag]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title.trim() || !user) return;

    setIsUploading(true);
    
    try {
      // Convert images to WebP for better performance (max 2048px, 85% quality)
      const processedFile = await resizeAndConvertToWebP(file, 2048, 0.85);
      console.log(`Converted: ${file.name} (${(file.size / 1024).toFixed(1)}KB) → ${processedFile.name} (${(processedFile.size / 1024).toFixed(1)}KB)`);

      // Generate content hash for protection
      const contentHash = await generateContentHash(processedFile);
      console.log('Generated content hash:', contentHash);

      // Upload file to storage
      const fileExt = processedFile.type.startsWith('video/') ? 'mp4' : 'webp';
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('media')
        .upload(fileName, processedFile, {
          contentType: processedFile.type,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(fileName);

      // Insert media record with content hash
      const { error: insertError } = await (supabase as any)
        .from('media')
        .insert({
          user_id: user.id,
          type: processedFile.type.startsWith('video/') ? 'video' : 'image',
          url: publicUrl,
          title: title.trim(),
          description: description.trim() || null,
          tags: tags.length > 0 ? tags : null,
          content_hash: contentHash,
          is_protected: false,
        });

      if (insertError) throw insertError;

      toast({
        title: 'Upload successful!',
        description: (
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            <span>Content hash generated. Protect it in your profile!</span>
          </div>
        ),
      });

      onUpload();
      handleClose();
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: 'There was an error uploading your content. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setPreview('');
    setTitle('');
    setDescription('');
    setTags([]);
    setTagInput('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">Upload Content</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Share your creative work with the community
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File Upload */}
          {!file ? (
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border rounded-lg p-12 text-center cursor-pointer hover:border-primary transition-colors"
            >
              <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-foreground font-medium mb-2">Drop your file here or click to browse</p>
              <p className="text-sm text-muted-foreground">
                Supports: Images (JPG, PNG, GIF, WebP) and Videos (MP4, WebM, MOV) up to 5MB
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                className="hidden"
              />
            </div>
          ) : (
            <div className="relative rounded-lg overflow-hidden border border-border">
              {file.type.startsWith('image/') ? (
                <img src={preview} alt="Preview" className="w-full max-h-96 object-contain bg-secondary" />
              ) : (
                <video src={preview} controls className="w-full max-h-96 bg-secondary" />
              )}
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2"
                onClick={() => {
                  setFile(null);
                  setPreview('');
                }}
              >
                <XCircle className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-foreground">Title *</Label>
            <Input
              id="title"
              placeholder="Give your content a catchy title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-secondary border-border"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-foreground">Description</Label>
            <Textarea
              id="description"
              placeholder="Tell us more about your creation..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-secondary border-border resize-none"
              rows={4}
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags" className="text-foreground">Tags (Max 10)</Label>
            <div className="flex gap-2">
              <Input
                id="tags"
                placeholder="Add a tag"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                className="bg-secondary border-border"
                disabled={tags.length >= 10}
              />
              <Button type="button" onClick={addTag} disabled={tags.length >= 10}>
                Add
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    #{tag}
                    <XCircle
                      className="w-3 h-3 cursor-pointer"
                      onClick={() => removeTag(tag)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!file || !title.trim() || isUploading}>
              {isUploading ? 'Uploading...' : 'Upload'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default UploadModal;
